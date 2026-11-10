import logging
import os
from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, field_validator
import unicodedata

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("edustream")

app = FastAPI(title="EduStream API")

region = os.environ.get("AWS_DEFAULT_REGION", "us-east-1")
table_name = os.environ.get("DYNAMODB_TABLE", "EduStream_Videos")

table = boto3.resource(
    "dynamodb",
    region_name=region,
).Table(table_name)


class VideoCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    subject_id: str = Field(min_length=1, max_length=100)
    subject: str = Field(min_length=1, max_length=200)
    code: str = Field(min_length=1, max_length=100)
    unit: str = Field(min_length=1, max_length=100)
    description: str = Field(min_length=1, max_length=5000)
    visibility: Literal["campus", "group"] = "campus"

    @field_validator(
        "title", "subject_id", "subject", "code", "unit", "description",
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


@app.get("/videos")
def list_videos():
    try:
        items = []
        response = table.scan()
        items.extend(response.get("Items", []))

        while "LastEvaluatedKey" in response:
            response = table.scan(
                ExclusiveStartKey=response["LastEvaluatedKey"]
            )
            items.extend(response.get("Items", []))

        return [to_response(item) for item in items]
    except (BotoCoreError, ClientError) as error:
        database_error(error)


@app.get("/videos/{video_id}")
def get_video(video_id: str):
    try:
        response = table.get_item(
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
def create_video(data: VideoCreate):
    now = datetime.now(timezone.utc).isoformat(
        timespec="milliseconds"
    ).replace("+00:00", "Z")

    item = {
        "video_id": str(uuid4()),
        "title": data.title,
        "title_normalized": normalize_title(data.title),
        "subject_id": data.subject_id,
        "subject_name": data.subject,
        "code": data.code,
        "unit": data.unit,
        "description": data.description,
        "visibility": data.visibility,
        "created_at": now,
        "updated_at": now,
        "thumbnail_class": "thumb-blue",
    }

    try:
        table.put_item(
            Item=item,
            ConditionExpression="attribute_not_exists(video_id)",
        )
    except (BotoCoreError, ClientError) as error:
        database_error(error)

    logger.info("Recurso creado: %s", item["video_id"])
    return to_response(item)
