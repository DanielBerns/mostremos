from pathlib import Path
from flask import Blueprint, send_from_directory, jsonify
from core.config import STORAGE_DIR
from api.auth import require_admin_key
from api.dependencies import get_submission_repo
import structlog

logger = structlog.get_logger()
bp = Blueprint('admin', __name__, url_prefix='/api/v1/admin')

@bp.route('/submissions', methods=['GET'])
@require_admin_key
def get_recent_submissions():
    """Endpoint for the private server to pull recent data."""
    repo = get_submission_repo()

    # In a full implementation, you would pass pagination/limit parameters
    # For now, we mock the retrieval method
    submissions = repo.get_recent(limit=100)

    # Serialize the dataclasses to JSON
    # (Assuming a simple serialization helper exists or using marshmallow)
    data = [
        {
            "id": sub.id,
            "latitude": sub.latitude,
            "longitude": sub.longitude,
            "status": sub.status,
            "items_count": len(sub.items)
        }
        for sub in submissions
    ] if submissions else []

    logger.info("admin_data_pulled", record_count=len(data))
    return jsonify({"data": data}), 200


@bp.route('/submissions/file/<filename>', methods=['GET'])
@require_admin_key
def download_file(filename):
    """
    Securely serves a physical file from the storage directory.
    """
    # 1. Verify the file actually exists on the disk
    full_path = Path(STORAGE_DIR, filename)
    if not full_path.exist():
        return jsonify({"error": f"File '{filename}' not found on server."}), 404

    # 2. Serve the file securely
    # as_attachment=True forces the client to download it rather than display it
    return send_from_directory(
        directory=STORAGE_DIR,
        path=filename,
        as_attachment=True
    )
