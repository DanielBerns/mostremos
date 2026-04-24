# packages/api/src/api/auth.py (or middleware.py)
import secrets
from functools import wraps
from pathlib import Path
import structlog
from flask import request, jsonify, g
import jwt
from core.config import JWT_SECRET_KEY, JWT_ALGORITHM, ADMIN_API_KEY

logger = structlog.get_logger()

def require_admin_key(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')

        if not auth_header or not auth_header.startswith("Bearer "):
            logger.warning("admin_auth_failed", reason="missing_or_invalid_header")
            return jsonify({"error": "Unauthorized. Missing Bearer token."}), 401

        token = auth_header.split(" ")[1]

        # Use compare_digest to prevent timing attacks on string comparison
        if not secrets.compare_digest(token, ADMIN_API_KEY):
            logger.warning("admin_auth_failed", reason="invalid_token")
            return jsonify({"error": "Forbidden. Invalid token."}), 403

        return f(*args, **kwargs)
    return decorated_function

def require_user_token(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')

        # Check if the header exists and has the 'Bearer ' prefix
        if not auth_header or not auth_header.startswith('Bearer '):
            logger.warning("unauthorized_access_attempt", reason="missing_or_malformed_header")
            return jsonify({"error": "Falta el token de autorización o el formato es inválido"}), 401

        token = auth_header.split(' ')[1]

        try:
            # Decode the token using your secret key
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])

            # Store the extracted user ID in the Flask request context
            g.user_id = payload['sub']

        except jwt.ExpiredSignatureError:
            logger.info("token_expired")
            return jsonify({"error": "El token ha expirado. Por favor, inicie sesión nuevamente."}), 401
        except jwt.InvalidTokenError:
            logger.warning("invalid_token_presented")
            return jsonify({"error": "Token inválido"}), 401

        return f(*args, **kwargs)
    return decorated
