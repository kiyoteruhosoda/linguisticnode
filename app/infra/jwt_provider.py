# app/infra/jwt_provider.py
"""
JWT provider for access token generation and verification.
Uses HS256 (HMAC-SHA256) for signing.
"""

import jwt
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
import logging

logger = logging.getLogger(__name__)


class JWTProvider:
    """Handles JWT access token creation and verification"""
    
    def __init__(self, secret_key: str, algorithm: str = "HS256", access_ttl_minutes: int = 15):
        """
        Args:
            secret_key: Secret key for JWT signing
            algorithm: JWT algorithm (default HS256)
            access_ttl_minutes: Access token TTL in minutes (default 15)
        """
        self.secret_key = secret_key
        self.algorithm = algorithm
        self.access_ttl_minutes = access_ttl_minutes
    
    def create_access_token(self, user_id: str, extra_claims: Optional[Dict] = None) -> tuple[str, datetime]:
        """
        Create a new access token.
        
        Args:
            user_id: User identifier
            extra_claims: Additional JWT claims (optional)
            
        Returns:
            Tuple of (token_string, expiration_datetime_utc)
        """
        now_utc = datetime.now(timezone.utc)
        expires_at_utc = now_utc + timedelta(minutes=self.access_ttl_minutes)
        
        payload = {
            "iss": "lexivault",  # Issuer
            "sub": user_id,  # Subject (user_id)
            "iat": int(now_utc.timestamp()),  # Issued at
            "exp": int(expires_at_utc.timestamp()),  # Expiration
        }
        
        if extra_claims:
            payload.update(extra_claims)
        
        token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
        return token, expires_at_utc
    
    def verify_access_token(self, token: str) -> Optional[Dict]:
        """
        Verify and decode access token.
        
        Args:
            token: JWT token string
            
        Returns:
            Decoded payload if valid, None otherwise
        """
        try:
            payload: Dict[str, Any] = jwt.decode(
                token,
                self.secret_key,
                algorithms=[self.algorithm],
                options={"verify_exp": True, "verify_iat": True}
            )
            return payload
        except jwt.ExpiredSignatureError:
            logger.debug("JWT expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.debug(f"Invalid JWT: {e}")
            return None
