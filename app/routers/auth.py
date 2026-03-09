# app/routers/auth.py
"""
Authentication endpoints using JWT access + refresh token rotation.
"""

from __future__ import annotations
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Response, status, Depends, Cookie, Request
from ..models import RegisterRequest, LoginRequest, MeResponse
from ..services import register_user, delete_user, find_user_by_id, find_user_by_username
from ..deps import require_auth, get_request_lang
from ..i18n import get_message
from ..domain.exceptions import RefreshTokenReusedError
from ..service.auth_service_port import AuthServicePort
from ..settings import settings

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)
audit_logger = logging.getLogger("app.audit")

# Global auth service (set by main.py)
_auth_service: AuthServicePort | None = None

def set_auth_service(auth_service: AuthServicePort):
    """Set auth service for this router"""
    global _auth_service
    _auth_service = auth_service


def _require_auth_service() -> AuthServicePort:
    """Return initialized auth service or raise 500."""
    if _auth_service is None:
        raise HTTPException(status_code=500, detail="Auth service not initialized")
    return _auth_service


REFRESH_COOKIE_NAME = "refresh_token"


def _calculate_expires_in_seconds(expires_at: datetime) -> int:
    """Return remaining seconds until expiration in UTC."""
    now_utc = datetime.now(timezone.utc)
    return max(0, int((expires_at - now_utc).total_seconds()))


@router.post(
    "/register",
    summary="Register a new user",
    description="Create a new user account with username and password. No authentication required.",
    responses={
        200: {
            "description": "User registered successfully",
            "content": {
                "application/json": {
                    "example": {
                        "ok": True,
                        "userId": "550e8400-e29b-41d4-a716-446655440000",
                        "username": "john_doe"
                    }
                }
            }
        },
        400: {"description": "User already exists or invalid input"},
    }
)
async def register(req: RegisterRequest, request: Request):
    """Register a new user (no authentication required)"""
    lang = get_request_lang(request)
    request_id = getattr(request.state, "request_id", None)
    
    try:
        u = register_user(req.username, req.password)
        
        # Audit log
        audit_logger.info(
            "User registered",
            extra={
                "event": "user.register",
                "user_id": u["userId"],
                "username": u["username"],
                "request_id": request_id,
                "result": "success"
            }
        )
        
        return {"ok": True, "userId": u["userId"], "username": u["username"]}
    except ValueError:
        # Audit log for failure
        audit_logger.warning(
            "User registration failed",
            extra={
                "event": "user.register",
                "username": req.username,
                "request_id": request_id,
                "result": "failure",
                "error_code": "USER_EXISTS"
            }
        )
        
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "error_code": "USER_EXISTS",
                    "message": get_message("user.already_exists", lang),
                    "message_key": "user.already_exists"
                }
            }
        )


@router.post(
    "/login",
    summary="Login user",
    description="Authenticate with username and password. Returns JWT access token in body and refresh token in HttpOnly cookie.",
    responses={
        200: {
            "description": "Login successful",
            "content": {
                "application/json": {
                    "example": {
                        "ok": True,
                        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                        "token_type": "Bearer",
                        "expires_in": 3600
                    }
                }
            }
        },
        401: {"description": "Invalid credentials"},
    }
)
async def login(req: LoginRequest, response: Response, request: Request):
    """
    Login with username and password.
    Returns access token in body, refresh token in HttpOnly cookie.
    """
    lang = get_request_lang(request)
    request_id = getattr(request.state, "request_id", None)
    
    auth_service = _require_auth_service()

    result = await auth_service.login(req.username, req.password)
    if not result:
        # Audit log for failure
        audit_logger.warning(
            "User login failed",
            extra={
                "event": "user.login",
                "username": req.username,
                "request_id": request_id,
                "result": "failure",
                "error_code": "AUTH_INVALID"
            }
        )
        
        raise HTTPException(
            status_code=401,
            detail={
                "error": {
                    "error_code": "AUTH_INVALID",
                    "message": get_message("auth.invalid", lang),
                    "message_key": "auth.invalid"
                }
            }
        )
    
    access_token, refresh_token, access_expires_at = result
    
    # Get user info for audit log
    user = find_user_by_username(req.username)
    
    if user:
        # Audit log for success
        audit_logger.info(
            "User logged in",
            extra={
                "event": "user.login",
                "user_id": user["userId"],
                "username": req.username,
                "request_id": request_id,
                "result": "success"
            }
        )
    
    # Set refresh token in HttpOnly cookie with security settings:
    # - HttpOnly: JavaScript cannot access (XSS protection)
    # - Secure: HTTPS only (enable in production via VOCAB_COOKIE_SECURE=true)
    # - SameSite=Lax: CSRF protection (cookie not sent on cross-site requests)
    # - Path=/: Cookie sent to all endpoints
    # - max_age=30 days: Browser keeps login state for 30 days
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        path="/",  # Send to all endpoints
        max_age=30 * 24 * 60 * 60,  # 30 days
    )
    
    # Return access token in body
    expires_in = _calculate_expires_in_seconds(access_expires_at)
    
    return {
        "ok": True,
        "access_token": access_token,
        "token_type": "Bearer",
        "expires_in": expires_in
    }


@router.post(
    "/refresh",
    summary="Refresh access token",
    description="Use refresh token (from HttpOnly cookie) to obtain a new access token. Implements token rotation.",
    responses={
        200: {
            "description": "Token refreshed successfully",
            "content": {
                "application/json": {
                    "example": {
                        "ok": True,
                        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                        "token_type": "Bearer",
                        "expires_in": 3600
                    }
                }
            }
        },
        401: {"description": "Refresh token missing or invalid"},
    }
)
async def refresh(
    response: Response,
    request: Request,
    refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE_NAME)
):
    """
    Refresh access token using refresh token.
    Implements token rotation: old refresh token is invalidated, new one is issued.
    """
    lang = get_request_lang(request)
    
    if not refresh_token:
        raise HTTPException(
            status_code=401,
            detail={
                "error": {
                    "error_code": "REFRESH_MISSING",
                    "message": get_message("auth.refresh_invalid", lang),
                    "message_key": "auth.refresh_invalid"
                }
            }
        )
    
    auth_service = _require_auth_service()

    try:
        result = await auth_service.refresh(refresh_token)
        if not result:
            raise HTTPException(
                status_code=401,
                detail={
                    "error": {
                        "error_code": "REFRESH_INVALID",
                        "message": get_message("auth.refresh_invalid", lang),
                        "message_key": "auth.refresh_invalid"
                    }
                }
            )
        
        access_token, new_refresh_token, access_expires_at = result
        
        # Set new refresh token in cookie (rotation)
        response.set_cookie(
            key=REFRESH_COOKIE_NAME,
            value=new_refresh_token,
            httponly=True,
            secure=settings.cookie_secure,
            samesite=settings.cookie_samesite,
            path="/",
            max_age=30 * 24 * 60 * 60,  # 30 days
        )
        
        # Return new access token
        expires_in = _calculate_expires_in_seconds(access_expires_at)
        
        return {
            "ok": True,
            "access_token": access_token,
            "token_type": "Bearer",
            "expires_in": expires_in
        }
        
    except RefreshTokenReusedError:
        logger.error("Refresh token replay detected")
        # Clear cookie
        response.delete_cookie(REFRESH_COOKIE_NAME, path="/")
        raise HTTPException(
            status_code=401,
            detail={
                "error": {
                    "error_code": "REFRESH_REUSED",
                    "message": get_message("auth.refresh_reused", lang),
                    "message_key": "auth.refresh_reused"
                }
            }
        )


@router.post(
    "/logout",
    summary="Logout user",
    description="Revoke refresh token and clear authentication cookies.",
    responses={
        200: {"description": "Logout successful"},
        401: {"description": "Unauthorized"},
    }
)
async def logout(
    response: Response,
    request: Request,
    user: dict = Depends(require_auth),
    refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE_NAME)
):
    """
    Logout by revoking refresh token and clearing cookie.
    """
    auth_service = _require_auth_service()

    request_id = getattr(request.state, "request_id", None)

    # Revoke refresh token
    if refresh_token:
        await auth_service.logout(refresh_token)
    
    # Clear cookie
    response.delete_cookie(REFRESH_COOKIE_NAME, path="/")
    
    # Audit log
    audit_logger.info(
        "User logged out",
        extra={
            "event": "user.logout",
            "user_id": user["userId"],
            "username": user["username"],
            "request_id": request_id,
            "result": "success"
        }
    )
    
    return {"ok": True}


@router.get(
    "/me",
    response_model=MeResponse,
    summary="Get current user",
    description="Retrieve information about the authenticated user.",
    responses={
        200: {
            "description": "Current user info",
            "content": {
                "application/json": {
                    "example": {
                        "userId": "550e8400-e29b-41d4-a716-446655440000",
                        "username": "john_doe"
                    }
                }
            }
        },
        401: {"description": "Unauthorized"},
    }
)
async def me(user: dict = Depends(require_auth)):
    """Get current user info (requires access token)"""
    return MeResponse(userId=user["userId"], username=user["username"])


@router.get(
    "/status",
    summary="Check authentication status",
    description="Check if the current request has a valid access token and/or refresh token. Always returns 200, never 401.",
    responses={
        200: {
            "description": "Authentication status",
            "content": {
                "application/json": {
                    "examples": {
                        "authenticated": {
                            "summary": "User is authenticated",
                            "value": {"ok": True, "authenticated": True, "canRefresh": True, "userId": "123", "username": "john"}
                        },
                        "can_refresh": {
                            "summary": "Can restore session via refresh token",
                            "value": {"ok": True, "authenticated": False, "canRefresh": True}
                        },
                        "guest": {
                            "summary": "Guest user - no tokens",
                            "value": {"ok": True, "authenticated": False, "canRefresh": False}
                        }
                    }
                }
            }
        },
    }
)
async def auth_status(request: Request):
    """
    Check authentication status without requiring auth.
    Returns:
    - authenticated=true with user info if valid access token exists
    - canRefresh=true if refresh token exists (even if access token is invalid/missing)
    - authenticated=false, canRefresh=false if no tokens exist
    Never returns 401.
    """
    auth_service = _auth_service

    # Check if refresh token exists (read directly from request.cookies)
    refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)
    logger.debug(
        "auth_status: start",
        extra={
            "has_refresh_cookie": bool(refresh_token),
            "auth_service_ready": bool(auth_service),
        },
    )

    # Try to get Authorization header
    auth_header = request.headers.get("Authorization")
    access_token = auth_header[7:] if auth_header and auth_header.startswith("Bearer ") else None

    if not auth_service:
        return {"ok": True, "authenticated": False, "canRefresh": False}

    try:
        authenticated, can_refresh, user_id = await auth_service.evaluate_auth_status(
            access_token=access_token,
            refresh_token=refresh_token,
        )
        if not authenticated:
            return {"ok": True, "authenticated": False, "canRefresh": can_refresh}

        # Get username from storage
        user = find_user_by_id(user_id) if user_id else None
        username = user["username"] if user else None

        return {
            "ok": True,
            "authenticated": True,
            "canRefresh": can_refresh,
            "userId": user_id,
            "username": username
        }
    except Exception:
        # Any error means not authenticated
        logger.exception("auth_status: status evaluation failed")
        return {"ok": True, "authenticated": False, "canRefresh": False}


@router.delete(
    "/me",
    summary="Delete user account",
    description="Permanently delete the current user account and all associated data (words, memory states). This action cannot be undone.",
    responses={
        200: {"description": "Account deleted successfully"},
        401: {"description": "Unauthorized"},
        500: {"description": "Failed to delete account"},
    }
)
async def delete_me(
    response: Response,
    request: Request,
    user: dict = Depends(require_auth),
    refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE_NAME)
):
    """
    Delete current user account (requires authentication).
    This will delete all user data including words and memory.
    """
    lang = get_request_lang(request)
    
    auth_service = _require_auth_service()

    user_id = user["userId"]
    request_id = getattr(request.state, "request_id", None)
    
    # Revoke refresh token
    if refresh_token:
        await auth_service.logout(refresh_token)
    
    # Clear cookie
    response.delete_cookie(REFRESH_COOKIE_NAME, path="/")
    
    # Delete user and all associated data
    try:
        delete_user(user_id)
        
        # Audit log for success
        audit_logger.info(
            "User account deleted",
            extra={
                "event": "user.delete",
                "user_id": user_id,
                "username": user["username"],
                "request_id": request_id,
                "result": "success"
            }
        )
    except Exception as e:
        logger.error(f"Failed to delete user {user_id}: {e}", exc_info=True)
        
        # Audit log for failure
        audit_logger.error(
            "User account deletion failed",
            extra={
                "event": "user.delete",
                "user_id": user_id,
                "username": user["username"],
                "request_id": request_id,
                "result": "failure",
                "error_code": "DELETE_FAILED"
            }
        )
        
        raise HTTPException(
            status_code=500,
            detail={
                "error": {
                    "error_code": "DELETE_FAILED",
                    "message": get_message("user.delete_failed", lang),
                    "message_key": "user.delete_failed"
                }
            }
        )
    
    return {"ok": True}
