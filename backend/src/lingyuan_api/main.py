import json
import logging
from contextlib import asynccontextmanager
from typing import Any, cast
from uuid import uuid4

import psycopg
from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool
from pydantic import ValidationError

from lingyuan_api.config import Settings
from lingyuan_api.db import ensure_migrated, insert_submission, published, topic_state
from lingyuan_api.domain import Submission
from lingyuan_api.ratelimit import RateLimiter

logger = logging.getLogger("lingyuan_api")


class APIJSONResponse(JSONResponse):
    media_type = "application/json; charset=utf-8"


def error(
    status: int, code: str, message: str, details: Any = None, headers: dict[str, str] | None = None
) -> JSONResponse:
    return APIJSONResponse(
        status_code=status,
        content={"error": {"code": code, "message": message, "details": details}},
        headers=headers,
    )


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()  # type: ignore[call-arg]
    limiter = RateLimiter(settings)
    pool = cast(
        ConnectionPool[psycopg.Connection[dict[str, object]]],
        ConnectionPool(
            settings.database_url,
            min_size=1,
            max_size=5,
            open=False,
            kwargs={"row_factory": dict_row},
        ),
    )

    @asynccontextmanager
    async def lifespan(app: FastAPI):  # type: ignore[no-untyped-def]
        logging.getLogger("uvicorn.access").disabled = True
        pool.open(wait=True)
        try:
            with pool.connection() as conn:
                ensure_migrated(conn)
            yield
        finally:
            pool.close()

    app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)

    @app.get("/api/v1/health")
    def health() -> JSONResponse:
        try:
            with pool.connection(timeout=2) as conn:
                conn.execute("SELECT version FROM schema_migrations LIMIT 1")
            return APIJSONResponse({"status": "ok"})
        except (psycopg.Error, TimeoutError):
            return APIJSONResponse({"status": "degraded"}, status_code=503)

    @app.get("/api/v1/topics/{slug}/contributions")
    def list_contributions(slug: str) -> JSONResponse:
        with pool.connection() as conn:
            state = topic_state(conn, slug)
            if state is None:
                return error(404, "topic_not_found", "这个问题暂不存在或已下线。")
            items = published(conn, slug) if state != "planned" else []
        return APIJSONResponse(jsonable_encoder({"items": items, "next_cursor": None}))

    @app.post("/api/v1/topics/{slug}/contributions")
    async def create_contribution(slug: str, request: Request) -> JSONResponse:
        if (
            request.headers.get("content-type", "").split(";", 1)[0].strip().lower()
            != "application/json"
        ):
            return error(415, "unsupported_media_type", "只接受 JSON 格式的投稿。")
        size = 0
        chunks: list[bytes] = []
        async for chunk in request.stream():
            size += len(chunk)
            if size > 16384:
                return error(413, "body_too_large", "请求内容过大。")
            chunks.append(chunk)
        try:
            raw = json.loads(b"".join(chunks))
        except (ValueError, UnicodeDecodeError):
            return error(422, "invalid_body", "请求内容不是有效的 JSON。", [{"field": "body"}])
        try:
            submission = Submission.model_validate(raw)
        except ValidationError as exc:
            details = [
                {"field": ".".join(map(str, issue["loc"])), "message": issue["msg"]}
                for issue in exc.errors()
            ]
            return error(422, "invalid_body", "内容未通过校验。", details)
        if not settings.body_min <= len(submission.body) <= settings.body_max:
            return error(
                422, "invalid_body", "正文长度需要在 20–2000 字之间。", [{"field": "body"}]
            )
        with pool.connection() as conn:
            state = topic_state(conn, slug)
            if state is None:
                return error(404, "topic_not_found", "这个问题暂不存在或已下线。")
            if state != "open":
                return error(409, "topic_not_open", "这个问题暂未开放投稿。")
            if submission.website:
                logger.info("honeypot_submission_count=1")
                return APIJSONResponse({"id": str(uuid4()), "status": "pending"}, status_code=201)
            wait = limiter.check_and_record(limiter.client_key(request), slug)
            if wait is not None:
                return error(
                    429,
                    "rate_limited",
                    "提交太频繁了，请稍后再试。",
                    headers={"Retry-After": str(wait)},
                )
            identifier = insert_submission(conn, slug, submission.kind, submission.body)
        return APIJSONResponse({"id": str(identifier), "status": "pending"}, status_code=201)

    return app
