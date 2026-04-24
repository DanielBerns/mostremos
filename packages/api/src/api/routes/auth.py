import uuid

import jwt
from datetime import datetime, timedelta, timezone
from flask import Blueprint, request, jsonify
from werkzeug.security import check_password_hash, generate_password_hash
import structlog

from api.dependencies import get_user_repo
from core.config import JWT_SECRET_KEY, JWT_ALGORITHM
from core.domain.models import User

logger = structlog.get_logger()
bp = Blueprint('auth', __name__, url_prefix='/api/v1/auth')

@bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()

    if not data or not data.get('username') or not data.get('password'):
        return jsonify({"error": "Usuario y contraseña son requeridos"}), 400

    username = data.get('username')
    password = data.get('password')

    repo = get_user_repo()
    user = repo.get_by_username(username)

    # Generic error to prevent username enumeration attacks
    if not user or not check_password_hash(user.password_hash, password):
        logger.warning("failed_login_attempt", username=username)
        return jsonify({"error": "Credenciales inválidas"}), 401

    # Respect the historical preservation architecture: block inactive users
    if not user.is_active:
        logger.warning("inactive_user_login_attempt", username=username)
        return jsonify({"error": "La cuenta se encuentra desactivada"}), 403

    # Generate the JWT payload
    payload = {
        "sub": user.id,            # Subject (the user ID)
        "username": user.username,
        "role": user.role,
        "exp": datetime.now(timezone.utc) + timedelta(days=30), # Valid for 30 days
        "iat": datetime.now(timezone.utc)                       # Issued at
    }

    # Create the token
    token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

    logger.info("user_logged_in", user_id=user.id)

    return jsonify({
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "role": user.role
        }
    }), 200

@bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()

    if not data or not data.get('username') or not data.get('password'):
        return jsonify({"error": "Usuario y contraseña son requeridos"}), 400

    username = data.get('username')
    password = data.get('password')

    repo = get_user_repo()

    # 1. Check if the user already exists
    if repo.get_by_username(username):
        logger.warning("registration_failed_user_exists", username=username)
        return jsonify({"error": "El usuario ya se encuentra registrado"}), 400

    # 2. Create the new user
    new_user = User(
        id=str(uuid.uuid4()),
        username=username,
        password_hash=generate_password_hash(password),
        role="public",
        is_active=True,
        created_at=datetime.now(timezone.utc)
    )

    repo.save(new_user)
    logger.info("new_user_registered", user_id=new_user.id)

    # 3. Generate the JWT payload to auto-login the user
    payload = {
        "sub": new_user.id,
        "username": new_user.username,
        "role": new_user.role,
        "exp": datetime.now(timezone.utc) + timedelta(days=30),
        "iat": datetime.now(timezone.utc)
    }

    token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

    return jsonify({
        "message": "Registro exitoso",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "username": new_user.username,
            "role": new_user.role
        }
    }), 201
