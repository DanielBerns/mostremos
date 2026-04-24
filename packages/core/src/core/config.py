import os
from dataclasses import dataclass
from pathlib import Path

import yaml

def load_configuration(config_path: Path):
    if not config_path.exists():
        raise FileNotFoundError(f"Configuration file missing at {config_path}")

    with open(config_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

config = load_configuration(Path.home() / "Info" / "server.yaml")

@dataclass
class GeoBoundingBox:
    min_lat: float
    max_lat: float
    min_lon: float
    max_lon: float

    def is_within(self, lat: float, lon: float) -> bool:
        return (self.min_lat <= lat <= self.max_lat) and (self.min_lon <= lon <= self.max_lon)

# Comodoro Rivadavia / Surrounding Area Rough Bounding Box
DEMO_BOUNDING_BOX = GeoBoundingBox(
    min_lat=-46.0, max_lat=-45.5,
    min_lon=-67.8, max_lon=-67.3
)

APP_INSTANCE = config.get("APP_INSTANCE", "devel")  # isolate devel, test, prod

HOME = Path.home()
INSTANCE = HOME / "Info" / "mostremos" / APP_INSTANCE
DEFAULT_STORAGE_DIR = INSTANCE / "storage"
DEFAULT_DATABASE_DIR = INSTANCE / "database"
DEFAULT_DATABASE_DIR.mkdir(mode=0o700, parents=True, exist_ok=True)
DEFAULT_DATABASE_NAME = f"mostremos_{APP_INSTANCE}.db"
DATABASE_NAME = config.get("DATABASE_NAME", DEFAULT_DATABASE_NAME)
DATABASE = DEFAULT_DATABASE_DIR / DATABASE_NAME
DATABASE_PATH = f"sqlite:///{DATABASE}"
STORAGE_DIR = config.get("STORAGE_DIR", DEFAULT_STORAGE_DIR)

# Admin Authentication
ADMIN_API_KEY = config.get("ADMIN_API_KEY", "dev-secret-admin-key-123")

# User Authentication
JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-your-super-secret-key-123")
JWT_ALGORITHM = "HS256"
