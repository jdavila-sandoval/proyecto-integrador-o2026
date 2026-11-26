import logging
import os
from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from botocore.config import Config
from fastapi import Depends, FastAPI, HTTPException
from .auth import User, get_current_user, require_group
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
import unicodedata


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("edustream")

app = FastAPI(title="EduStream API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

region = os.environ.get("AWS_DEFAULT_REGION", "us-east-1")
videos_bucket = os.environ.get("VIDEOS_BUCKET", "edustream-videos-storage")
videos_table_name = os.environ.get("DYNAMODB_TABLE", "EduStream_Videos")
subjects_table_name = os.environ.get("SUBJECTS_TABLE", "EduStream_Subjects")

dynamodb = boto3.resource("dynamodb", region_name=region)
s3 = boto3.client("s3", region_name=region, config=Config(signature_version="s3v4"))

videos_table = dynamodb.Table(videos_table_name)
subjects_table = dynamodb.Table(subjects_table_name)

MAX_UPLOAD_BYTES = int(os.environ.get("MAX_UPLOAD_BYTES", 500 * 1024 * 1024))
UPLOAD_URL_SECONDS = 900
PLAYBACK_URL_SECONDS = 900

EXTENSIONS = {"video/mp4": "mp4", "video/webm": "webm"}

class VideoCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    subject_id: str = Field(min_length=1, max_length=100)
    unit: str = Field(min_length=1, max_length=100)
    description: str = Field(min_length=1, max_length=5000)
    visibility: Literal["campus", "group"] = "campus"
    content_type: Literal["video/mp4", "video/webm"]
    size_bytes: int = Field(gt=0, le=MAX_UPLOAD_BYTES)

    @field_validator(
        "title", "subject_id", "unit", "description",
        mode="before",
    )
    @classmethod
    def strip_strings(cls, value):
        return value.strip() if isinstance(value, str) else value


def normalize_title(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value.lower().strip())
    return "".join(
        character
        for character in normalized
        if unicodedata.category(character) != "Mn"
    )


def to_response(item: dict) -> dict:
    return {
        "id": item["video_id"],
        "title": item["title"],
        "subject": item["subject_name"],
        "code": item["code"],
        "unit": item["unit"],
        "description": item["description"],
        "visibility": item["visibility"],
        "duration": "00:00",
        "uploadedAt": item["created_at"],
        "views": 0,
        "thumbnailClass": item.get("thumbnail_class", "thumb-blue"),
        "status": item.get("status", "metadata_only"),
    }


def database_error(error):
    logger.exception("Error al operar con DynamoDB")
    raise HTTPException(
        status_code=503,
        detail="No fue posible acceder a los datos.",
    ) from error


def storage_error(error):
    logger.exception("Error al operar con S3")
    raise HTTPException(
        status_code=503,
        detail="No fue posible acceder al almacenamiento.",
    ) from error


def fetch_video(video_id: str) -> dict:
    try:
        item = videos_table.get_item(
            Key={"video_id": video_id},
            ConsistentRead=True,
        ).get("Item")
    except (BotoCoreError, ClientError) as error:
        database_error(error)

    if item is None:
        raise HTTPException(status_code=404, detail="Recurso no encontrado.")

    return item


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/subjects", dependencies=[Depends(get_current_user)])
def list_subjects():
    try:
        items = []
        response = subjects_table.scan()
        items.extend(response.get("Items", []))

        while "LastEvaluatedKey" in response:
            response = subjects_table.scan(
                ExclusiveStartKey=response["LastEvaluatedKey"]
            )
            items.extend(response.get("Items", []))
    except (BotoCoreError, ClientError) as error:
        database_error(error)

    return sorted(
        (
            {
                "id": item["subject_id"],
                "name": item["name"],
                "code": item["code"],
            }
            for item in items
        ),
        key=lambda subject: subject["name"],
    )


@app.get("/videos", dependencies=[Depends(get_current_user)])
def list_videos():
    try:
        items = []
        response = videos_table.scan()
        items.extend(response.get("Items", []))

        while "LastEvaluatedKey" in response:
            response = videos_table.scan(
                ExclusiveStartKey=response["LastEvaluatedKey"]
            )
            items.extend(response.get("Items", []))

        return [to_response(item) for item in items if item.get("status") != "pending"]
    except (BotoCoreError, ClientError) as error:
        database_error(error)


@app.get("/videos/{video_id}")
def get_video(video_id: str, user: User = Depends(get_current_user)):
    item = fetch_video(video_id)

    if item.get("status") == "pending" and item.get("owner_sub") != user.sub:
        raise HTTPException(status_code=404, detail="Recurso no encontrado.")

    return to_response(item)


@app.post("/videos", status_code=201)
def create_video(
    data: VideoCreate,
    user: User = Depends(require_group("docentes")),
):
    try:
        subject = subjects_table.get_item(
            Key={"subject_id": data.subject_id},
        ).get("Item")
    except (BotoCoreError, ClientError) as error:
        database_error(error)

    if subject is None:
        raise HTTPException(
            status_code=422,
            detail="La materia seleccionada no existe.",
        )

    video_id = str(uuid4())
    object_key = f"videos/{video_id}/original.{EXTENSIONS[data.content_type]}"

    try:
        upload = s3.generate_presigned_post(
            Bucket=videos_bucket,
            Key=object_key,
            Fields={"Content-Type": data.content_type},
            Conditions=[
                {"Content-Type": data.content_type},
                ["content-length-range", 1, MAX_UPLOAD_BYTES],
            ],
            ExpiresIn=UPLOAD_URL_SECONDS,
        )
    except (BotoCoreError, ClientError) as error:
        storage_error(error)

    now = (
        datetime.now(timezone.utc)
        .isoformat(timespec="milliseconds")
        .replace("+00:00", "Z")
    )

    item = {
        "video_id": video_id,
        "title": data.title,
        "title_normalized": normalize_title(data.title),
        "subject_id": data.subject_id,
        "subject_name": subject["name"],
        "code": subject["code"],
        "unit": data.unit,
        "description": data.description,
        "visibility": data.visibility,
        "created_at": now,
        "updated_at": now,
        "thumbnail_class": "thumb-blue",
        "owner_sub": user.sub,
        "status": "pending",
        "object_key": object_key,
        "content_type": data.content_type,
        "size_bytes": data.size_bytes,
    }

    try:
        videos_table.put_item(
            Item=item,
            ConditionExpression="attribute_not_exists(video_id)",
        )
    except (BotoCoreError, ClientError) as error:
        database_error(error)

    logger.info("Recurso creado: %s", item["video_id"])
    return {**to_response(item), "upload": upload}


@app.post("/videos/{video_id}/complete")
def complete_upload(
    video_id: str,
    user: User = Depends(require_group("docentes")),
):
    item = fetch_video(video_id)

    if item.get("owner_sub") != user.sub:
        raise HTTPException(status_code=403, detail="No eres el autor de este recurso.")

    if item.get("status") == "ready":
        return to_response(item)

    if item.get("status") != "pending":
        raise HTTPException(status_code=409, detail="Este recurso no admite archivo.")

    try:
        head = s3.head_object(Bucket=videos_bucket, Key=item["object_key"])
    except ClientError as error:
        if error.response["Error"]["Code"] in ("404", "NoSuchKey", "NotFound"):
            raise HTTPException(
                status_code=409,
                detail="El archivo aún no se ha subido.",
            ) from error
        storage_error(error)
    except BotoCoreError as error:
        storage_error(error)

    now = (
        datetime.now(timezone.utc)
        .isoformat(timespec="milliseconds")
        .replace("+00:00", "Z")
    )

    try:
        updated = videos_table.update_item(
            Key={"video_id": video_id},
            UpdateExpression="SET #s = :ready, size_bytes = :size, updated_at = :now",
            ConditionExpression="#s = :pending",
            ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues={
                ":ready": "ready",
                ":pending": "pending",
                ":size": head["ContentLength"],
                ":now": now,
            },
            ReturnValues="ALL_NEW",
        )["Attributes"]
    except ClientError as error:
        if error.response["Error"]["Code"] == "ConditionalCheckFailedException":
            raise HTTPException(status_code=409, detail="El estado cambió.") from error
        database_error(error)
    except BotoCoreError as error:
        database_error(error)

    return to_response(updated)


@app.get("/videos/{video_id}/playback")
def get_playback(video_id: str, user: User = Depends(get_current_user)):
    item = fetch_video(video_id)

    if item.get("status") != "ready":
        raise HTTPException(
            status_code=404,
            detail="Este recurso aún no tiene un archivo disponible.",
        )

    try:
        url = s3.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": videos_bucket,
                "Key": item["object_key"],
                "ResponseContentType": item["content_type"],
            },
            ExpiresIn=PLAYBACK_URL_SECONDS,
        )
    except (BotoCoreError, ClientError) as error:
        storage_error(error)

    return {"url": url, "expiresIn": PLAYBACK_URL_SECONDS}


@app.get("/me")
def me(user: User = Depends(get_current_user)):
    if "docentes" in user.groups:
        role = "docente"
    elif "alumnos" in user.groups:
        role = "alumno"
    else:
        role = None

    return {
        "sub": user.sub,
        "email": user.email,
        "groups": user.groups,
        "role": role,
    }