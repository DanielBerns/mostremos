import uuid
import secrets
import structlog
from werkzeug.security import generate_password_hash

import pdb

# Import the infrastructure components
from infra.database.engine import engine, SessionLocal
from infra.database.schema import Base, UserModel

logger = structlog.get_logger()

def bootstrap_database():
    pdb.set_trace()
    logger.info("Initializing database schema...")

    # 1. Create all tables defined in the schema
    # (If tables already exist, SQLAlchemy safely ignores them)
    Base.metadata.create_all(engine)
    logger.info("Database tables verified/created.")

    session = SessionLocal()

    try:
        # 2. Check if the admin user already exists
        admin_username = "admin@demo.local"
        existing_admin = session.query(UserModel).filter_by(username=admin_username).first()

        if existing_admin:
            logger.warning("Admin user already exists. Skipping creation.")
            return

        # 3. Insert the root admin user
        admin_user = UserModel(
            id=str(uuid.uuid4()),
            username=admin_username,
            role="admin",
            is_active=True
        )

        session.add(admin_user)
        session.commit()

        # 5. Output the credentials for the developer to share
        print("\n" + "="*50)
        print("DATABASE INITIALIZED SUCCESSFULLY")
        print("="*50)
        print(f"Admin Username : {admin_username}")
        print(f"Admin Password : ⚠️ you must configure it with an environment variable ⚠️")
        print("="*50)
        print("="*50 + "\n")

    except Exception as e:
        session.rollback()
        logger.error("Failed to bootstrap database", error=str(e))
    finally:
        session.close()

if __name__ == "__main__":
    bootstrap_database()
