# app/service/auth_service.py
"""
Authentication service handling login, token refresh, and logout.
Implements refresh token rotation and replay detection.
"""

import logging
import secrets
from datetime import datetime, timezone
from typing import Any, Optional

from app import security, storage
from app.domain.exceptions import RefreshTokenReusedError
from app.domain.models.tokens import TokenRecord
from app.infra.jwt_provider import JWTProvider
from app.infra.token_store_json import (
    JsonTokenStore,
    generate_refresh_token,
    hash_refresh_token
)

logger = logging.getLogger(__name__)


class AuthService:
    """Handles authentication operations"""
    
    def __init__(
        self,
        jwt_provider: JWTProvider,
        token_store: JsonTokenStore,
        refresh_salt: str,
        refresh_ttl_days: int = 30
    ):
        """
        Args:
            jwt_provider: JWT token provider
            token_store: Refresh token storage
            refresh_salt: Server-side salt for hashing refresh tokens
            refresh_ttl_days: Refresh token TTL in days (default 30)
        """
        self.jwt_provider = jwt_provider
        self.token_store = token_store
        self.refresh_salt = refresh_salt
        self.refresh_ttl_days = refresh_ttl_days
    
    async def authenticate_user(self, username: str, password: str) -> Optional[dict[str, Any]]:
        """
        Authenticate user with username and password.
        
        Args:
            username: Username
            password: Plain text password
            
        Returns:
            User dict if authenticated, None otherwise
        """
        users_data = storage.read_json(storage.users_file_path())
        users: list[dict[str, Any]] = users_data.get("users", [])
        
        for user in users:
            if user["username"] == username:
                if user.get("disabled", False):
                    logger.warning(f"Attempt to login with disabled user: {username}")
                    return None
                
                if security.verify_password(password, user["passwordHash"]):
                    return user
                else:
                    return None
        
        return None
    
    async def login(self, username: str, password: str) -> Optional[tuple[str, str, datetime]]:
        """
        Perform login and create access + refresh tokens.
        
        Args:
            username: Username
            password: Password
            
        Returns:
            Tuple of (access_token, refresh_token, access_expires_at) if success, None otherwise
        """
        user = await self.authenticate_user(username, password)
        if not user:
            return None
        
        user_id = user["userId"]
        
        # Generate access token
        access_token, access_expires_at = self.jwt_provider.create_access_token(user_id)
        
        # Generate refresh token
        refresh_token = generate_refresh_token()
        token_hash = hash_refresh_token(refresh_token, self.refresh_salt)
        
        # Create new token family
        family_id = f"fam_{secrets.token_urlsafe(16)}"
        token_id = f"tok_{secrets.token_urlsafe(16)}"
        
        await self.token_store.add_token(
            token_id=token_id,
            user_id=user_id,
            token_hash=token_hash,
            family_id=family_id,
            prev_token_id=None,
            ttl_days=self.refresh_ttl_days
        )
        
        logger.info(f"User logged in", extra={"user_id": user_id, "token_id": token_id})
        return access_token, refresh_token, access_expires_at
    
    @staticmethod
    def _is_expired(expires_at_utc: str) -> bool:
        """Return True when an ISO UTC timestamp is in the past."""
        expires_at = datetime.fromisoformat(expires_at_utc.replace("Z", "+00:00"))
        return expires_at < datetime.now(timezone.utc)

    async def _find_token_record(self, refresh_token: str) -> Optional[tuple[str, TokenRecord]]:
        """Lookup token record by raw refresh token."""
        token_hash = hash_refresh_token(refresh_token, self.refresh_salt)
        return await self.token_store.find_by_hash(token_hash)

    def _is_token_record_active(self, record: TokenRecord) -> bool:
        """Return True when token record is neither revoked nor expired."""
        if record.revoked_at_utc:
            return False
        return not self._is_expired(record.expires_at_utc)

    async def has_active_refresh_token(self, refresh_token: str) -> bool:
        """Return True when refresh token exists and is active."""
        result = await self._find_token_record(refresh_token)
        if not result:
            return False

        _, record = result
        return self._is_token_record_active(record)

    async def refresh(self, refresh_token: str) -> Optional[tuple[str, str, datetime]]:
        """
        Refresh access token using refresh token (with rotation).
        
        Args:
            refresh_token: Current refresh token
            
        Returns:
            Tuple of (new_access_token, new_refresh_token, access_expires_at) if success, None otherwise
            
        Raises:
            RefreshTokenReusedError when replay attack is detected
        """
        result = await self._find_token_record(refresh_token)
        
        if not result:
            logger.warning("Refresh token not found")
            return None
        
        token_id, record = result
        
        if not self._is_token_record_active(record):
            logger.warning(
                "Attempt to use inactive token",
                extra={"token_id": token_id, "revoked": bool(record.revoked_at_utc)},
            )
            return None
        
        # Check for replay attack (token already replaced)
        if record.replaced_by_token_id:
            logger.error(
                f"REPLAY ATTACK DETECTED: Token already replaced",
                extra={"token_id": token_id, "family_id": record.family_id}
            )
            # Revoke entire family
            await self.token_store.revoke_family(record.family_id)
            raise RefreshTokenReusedError()
        
        # Token is valid - perform rotation
        user_id = record.user_id
        
        # Generate new access token
        access_token, access_expires_at = self.jwt_provider.create_access_token(user_id)
        
        # Generate new refresh token
        new_refresh_token = generate_refresh_token()
        new_token_hash = hash_refresh_token(new_refresh_token, self.refresh_salt)
        new_token_id = f"tok_{secrets.token_urlsafe(16)}"
        
        # Add new token to store
        await self.token_store.add_token(
            token_id=new_token_id,
            user_id=user_id,
            token_hash=new_token_hash,
            family_id=record.family_id,  # Same family
            prev_token_id=token_id,
            ttl_days=self.refresh_ttl_days
        )
        
        # Mark old token as replaced
        await self.token_store.mark_replaced(token_id, new_token_id)
        
        # Update last used
        await self.token_store.update_last_used(token_id)
        
        logger.info(
            f"Token rotated successfully",
            extra={"user_id": user_id, "old_token_id": token_id, "new_token_id": new_token_id}
        )
        
        return access_token, new_refresh_token, access_expires_at
    
    async def logout(self, refresh_token: Optional[str]) -> bool:
        """
        Logout by revoking refresh token.
        
        Args:
            refresh_token: Refresh token to revoke
            
        Returns:
            True if token was revoked, False otherwise
        """
        if not refresh_token:
            return False
        
        result = await self._find_token_record(refresh_token)
        
        if not result:
            return False
        
        token_id, record = result
        await self.token_store.revoke_token(token_id)
        
        logger.info(f"User logged out", extra={"user_id": record.user_id, "token_id": token_id})
        return True
    
    async def evaluate_auth_status(
        self,
        access_token: str | None,
        refresh_token: str | None,
    ) -> tuple[bool, bool, str | None]:
        """Evaluate auth status from optional access/refresh tokens."""
        can_refresh = False
        if refresh_token:
            can_refresh = await self.has_active_refresh_token(refresh_token)

        if not access_token:
            return False, can_refresh, None

        user_id = await self.verify_access_token(access_token)
        if not user_id:
            return False, can_refresh, None

        return True, can_refresh, user_id

    async def verify_access_token(self, token: str) -> Optional[str]:
        """
        Verify access token and return user_id.
        
        Args:
            token: JWT access token
            
        Returns:
            user_id if valid, None otherwise
        """
        payload = self.jwt_provider.verify_access_token(token)
        if not payload:
            return None
        
        return payload.get("sub")  # user_id
