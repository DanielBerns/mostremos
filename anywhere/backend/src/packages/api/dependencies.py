from infra.database.engine import SessionLocal
from infra.database.adapters import SqlAlchemySubmissionRepository
from infra.storage.adapters import LocalDiskStorageAdapter

# Initialize secondary adapters
_session = SessionLocal()
submission_repo = SqlAlchemySubmissionRepository(_session)
storage_adapter = LocalDiskStorageAdapter()

def get_submission_repo():
    return submission_repo

def get_storage_adapter():
    return storage_adapter
