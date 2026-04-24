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
    submissions = repo.get_recent(limit=100)

    # Serialize the dataclasses to JSON, including the nested items
    data = []
    if submissions:
        for sub in submissions:
            data.append({
                "id": sub.id,
                "latitude": sub.latitude,
                "longitude": sub.longitude,
                "status": sub.status,
                # Explicitly build the items array with the payload
                "items": [
                    {
                        "id": item.id,
                        "tag_id": item.tag_id,
                        "item_type": item.item_type,
                        "content_payload": item.content_payload
                    }
                    for item in sub.items
                ]
            })

    logger.info("admin_data_pulled", record_count=len(data))

    # Return the raw list to match sync_job.py expectations
    return jsonify(data), 200


@bp.route('/submissions/file/<filename>', methods=['GET'])
@require_admin_key
def download_file(filename):
    """
    Securely serves a physical file from the storage directory.
    """
    # 1. Verify the file actually exists on the disk
    full_path = Path(STORAGE_DIR, filename)
    if not full_path.exists():  # Fixed typo: changed exist() to exists()
        return jsonify({"error": f"File '{filename}' not found on server."}), 404

    # 2. Serve the file securely
    return send_from_directory(
        directory=STORAGE_DIR,
        path=filename,
        as_attachment=True
    )


@bp.route('/submissions/<submission_id>', methods=['DELETE'])
@require_admin_key
def delete_submission(submission_id):
    """Deletes a submission and its associated files from the buffer."""
    repo = get_submission_repo()
    submission = repo.get_by_id(submission_id)

    if not submission:
        return jsonify({"error": "Submission not found"}), 404

    # 1. Annihilate the physical files first
    for item in submission.items:
        if item.item_type == "image":
            filename = item.content_payload.get("filename")
            if filename:
                file_path = Path(STORAGE_DIR, filename)
                if file_path.exists():
                    try:
                        file_path.unlink() # Deletes the physical file
                        logger.info("file_deleted", filename=filename)
                    except Exception as e:
                        logger.error("file_delete_error", filename=filename, error=str(e))

    # 2. Annihilate the database record
    repo.delete(submission_id)

    return jsonify({"message": "Submission and associated files annihilated"}), 200
