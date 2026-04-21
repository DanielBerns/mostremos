import secrets
from functools import wraps
from flask import request, jsonify
import structlog

from core.config import ADMIN_API_KEY

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
