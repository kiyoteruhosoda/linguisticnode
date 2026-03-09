# app/main.py
from __future__ import annotations

import logging
import os
import signal
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.openapi.utils import get_openapi
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.middleware_bodylog import RequestBodyCaptureMiddleware

from . import storage, deps
from .errors import ApiErrorPayload, http_error_code, is_safe_to_echo_detail
from .logging_setup import setup_logging
from .middleware import RequestLoggingMiddleware
from .routers import auth, io, logs, study, words, vocab, examples
from .settings import settings
from .infra.jwt_provider import JWTProvider
from .infra.token_store_json import JsonTokenStore
from .service.auth_service import AuthService

app_logger = logging.getLogger("app")


def _rid(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


def _install_signal_handlers() -> None:
    """Docker停止(SIGHUP/SIGTERM)や手動停止(SIGINT)をログに残す。"""

    def _handle(signum, _frame):
        # uvicorn が止まったのか、落ちたのか、止められたのかを判別できるようにする
        app_logger.warning(
            "signal_received",
            extra={
                "event": "signal_received",
                "detail": {"signal": signum},
            },
        )

    for s in (signal.SIGTERM, signal.SIGINT):
        try:
            signal.signal(s, _handle)
        except Exception:
            # 環境によっては signal 登録できない場合がある（稀）
            pass


def _get_git_version() -> str:
    """Get git version from git_version.txt file"""
    try:
        with open(os.path.join(os.path.dirname(__file__), "git_version.txt"), "r") as f:
            return f.read().strip()
    except Exception:
        return "unknown"


def _get_custom_openapi(app: FastAPI) -> dict[str, Any]:
    """Generate custom OpenAPI schema with security and tag information"""
    if app.openapi_schema:
        return app.openapi_schema
    
    output = get_openapi(
        title=app.title,
        version=app.version,
        description="API for vocabulary learning with spaced repetition memory scheduling",
        routes=app.routes,
    )
    
    # Define security scheme
    output["components"]["securitySchemes"] = {
        "HTTPBearer": {
            "type": "http",
            "scheme": "bearer",
            "description": "JWT access token (from /api/auth/login)",
        },
        "RefreshCookie": {
            "type": "apiKey",
            "in": "cookie",
            "name": "refresh_token",
            "description": "Refresh token stored in HttpOnly cookie",
        },
    }
    
    # Add tags documentation
    output["tags"] = [
        {
            "name": "auth",
            "description": "User authentication and token management. Login returns access token in body and refresh token in HttpOnly cookie.",
        },
        {
            "name": "words",
            "description": "Manage vocabulary words and entries. Requires authentication.",
        },
        {
            "name": "study",
            "description": "Spaced repetition study session management using FSRS algorithm.",
        },
        {
            "name": "io",
            "description": "Import/export vocabulary data in JSON format.",
        },
        {
            "name": "logs",
            "description": "Client-side logging and diagnostics.",
        },
    ]
    
    # Add servers
    output["servers"] = [
        {
            "url": "http://localhost:8000",
            "description": "Development server",
        },
        {
            "url": "{protocol}://{host}:{port}",
            "variables": {
                "protocol": {
                    "default": "http",
                    "enum": ["http", "https"],
                },
                "host": {
                    "default": "localhost",
                },
                "port": {
                    "default": "8000",
                },
            },
            "description": "Custom server",
        },
    ]
    
    app.openapi_schema = output
    return app.openapi_schema


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ===== startup =====
    # ここで副作用のある初期化を行う（import時に実行しない）
    storage.ensure_dirs()
    setup_logging(data_dir=settings.data_dir)
    _install_signal_handlers()
    
    # Initialize auth service
    jwt_provider = JWTProvider(
        secret_key=settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
        access_ttl_minutes=settings.access_token_ttl_minutes
    )
    token_store = JsonTokenStore(data_dir=str(settings.data_dir))
    auth_service = AuthService(
        jwt_provider=jwt_provider,
        token_store=token_store,
        refresh_salt=settings.refresh_token_salt,
        refresh_ttl_days=settings.refresh_token_ttl_days
    )
    
    # Set auth service globally
    deps.set_auth_service(auth_service)
    auth.set_auth_service(auth_service)

    app_logger.warning("app_startup", extra={"event": "app_startup"})

    yield

    # ===== shutdown =====
    app_logger.warning("app_shutdown", extra={"event": "app_shutdown"})


def create_app() -> FastAPI:
    app = FastAPI(
        title="LinguisticNode API",
        version=os.getenv("VOCAB_APP_VERSION", "0.1.0"),
        description="Vocabulary learning application with spaced repetition (FSRS algorithm)",
        lifespan=lifespan,
    )
    
    # Set custom OpenAPI schema
    app.openapi = lambda: _get_custom_openapi(app)  # type: ignore[method-assign]

    web_origin = os.getenv("VOCAB_WEB_ORIGIN", "http://localhost:8080")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[web_origin],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # request_id / duration を付ける（最初に入れる）
    app.add_middleware(RequestLoggingMiddleware)

    # 422時に body をログしたい場合のため（/words系だけ、envでON/OFFする前提）
    app.add_middleware(RequestBodyCaptureMiddleware)

    app.include_router(auth.router, prefix="/api")
    app.include_router(words.router, prefix="/api")
    app.include_router(study.router, prefix="/api")
    app.include_router(io.router, prefix="/api")
    app.include_router(vocab.router, prefix="/api")
    app.include_router(logs.router, prefix="/api")
    app.include_router(examples.router)

    @app.get(
        "/healthz",
        tags=["health"],
        summary="Health check",
        description="Check application health status",
        responses={
            200: {
                "description": "Application is healthy",
                "content": {
                    "application/json": {
                        "example": {
                            "ok": True,
                            "version": "0.1.0",
                            "git_version": "abc123def456",
                        }
                    }
                },
            }
        },
    )
    async def healthz():
        """Health check endpoint returning application version info"""
        return {
            "ok": True,
            "version": os.getenv("VOCAB_APP_VERSION", "unknown"),
            "git_version": _get_git_version(),
        }

    # 422 (validation error) も ApiError に統一
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        include_details = os.getenv("VOCAB_DEBUG_VALIDATION_DETAILS", "0") == "1"
        details = exc.errors() if include_details else None
        body_text = getattr(request.state, "request_body_text", None)
        request_id = _rid(request)

        app_logger.warning(
            "validation_error",
            extra={
                "event": "validation_error",
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status": 422,
                "err_type": "RequestValidationError",
                "error_code": "VALIDATION_ERROR",
                # ログには常に errors を残す（調査の主役）
                "detail": details if details is not None else exc.errors(),
                "request_body": body_text,
            },
        )

        payload = ApiErrorPayload(
            error_code="VALIDATION_ERROR",
            message="Validation error",
            request_id=request_id,
            details=details,
        )
        return JSONResponse(status_code=422, content={"error": payload.__dict__})

    # 4xx/5xx(HTTPException)
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        request_id = _rid(request)
        status_code = exc.status_code
        code = http_error_code(status_code)
        detail_value: Any = exc.detail

        app_logger.warning(
            "http_error",
            extra={
                "event": "http_error",
                "request_id": request_id,
                "method": "request.method",
                "path": request.url.path,
                "status": status_code,
                "err_type": "HTTPException",
                "error_code": code,
                "detail": detail_value,
            },
        )

        # If detail is a dict with error structure, use it directly
        if isinstance(detail_value, dict) and "error" in detail_value:
            return JSONResponse(status_code=status_code, content=detail_value)

        message = str(detail_value) if is_safe_to_echo_detail(code) else "Request failed"

        payload = ApiErrorPayload(
            error_code=code,
            message=message,
            request_id=request_id,
        )
        return JSONResponse(status_code=status_code, content={"error": payload.__dict__})

    # 500（未ハンドル）は stack trace を必ず残し、クライアントには固定メッセージ
    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        request_id = _rid(request)

        app_logger.exception(
            "unhandled_exception",
            extra={
                "event": "unhandled_exception",
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status": 500,
                "err_type": type(exc).__name__,
                "error_code": "INTERNAL_ERROR",
            },
        )

        payload = ApiErrorPayload(
            error_code="INTERNAL_ERROR",
            message="Internal Server Error",
            request_id=request_id,
        )
        return JSONResponse(status_code=500, content={"error": payload.__dict__})

    return app


app = create_app()
