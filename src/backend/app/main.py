import logging
import os
from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

import boto3
from botocore.exceptions import BotoCoreError, ClientError
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
videos_table_name = os.environ.get("DYNAMODB_TABLE", "EduStream_Videos")
subjects_table_name = os.environ.get("SUBJECTS_TABLE", "EduStream_Subjects")

dynamodb = boto3.resource("dynamodb", region_name=region)
videos_table = dynamodb.Table(videos_table_name)
subjects_table = dynamodb.Table(subjects_table_name)


class VideoCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    subject_id: str = Field(min_length=1, max_length=100)
    unit: str = Field(min_length=1, max_length=100)
    description: str = Field(min_length=1, max_length=5000)
    visibility: Literal["campus", "group"] = "campus"

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
    }


def database_error(error):
    logger.exception("Error al operar con DynamoDB")
    raise HTTPException(
        status_code=503,
        detail="No fue posible acceder a los datos.",
    ) from error


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/subjects", depencencies=[Depends(get_current_user)])
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


@app.get("/videos", depencencies=[Depends(get_current_user)])
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

        return [to_response(item) for item in items]
    except (BotoCoreError, ClientError) as error:
        database_error(error)


@app.get("/videos/{video_id}", depencencies=[Depends(get_current_user)])
def get_video(video_id: str):
    try:
        response = videos_table.get_item(
            Key={"video_id": video_id},
            ConsistentRead=True,
        )
    except (BotoCoreError, ClientError) as error:
        database_error(error)

    item = response.get("Item")

    if item is None:
        raise HTTPException(
            status_code=404,
            detail="Recurso no encontrado.",
        )

    return to_response(item)


@app.post("/videos", status_code=201)
def create_video(data: VideoCreate, user: User = Depends(require_group["docentes"])):
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
    
    now = datetime.now(timezone.utc).isoformat(
            timespec="milliseconds"
    ).replace("+00:00", "Z")
    
    item = {
        "video_id": str(uuid4()),
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
        "created_at": now,
        "updated_at": now,
        "thumbnail_class": "thumb-blue",
    }

    try:
        videos_table.put_item(
            Item=item,
            ConditionExpression="attribute_not_exists(video_id)",
        )
    except (BotoCoreError, ClientError) as error:
        database_error(error)

    logger.info("Recurso creado: %s", item["video_id"])
    return to_response(item)


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