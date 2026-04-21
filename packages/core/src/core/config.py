import os
from dataclasses import dataclass

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

APP_INSTANCE = os.getenv("APP_INSTANCE", "devel")  # isolate devel, test, prod
STORAGE_DIR = os.getenv("STORAGE_DIR", f"/tmp/crowdsource_demo_{APP_INSTANCE}")

# Admin Authentication
# In production, set this via export ADMIN_API_KEY="your-secure-random-string"
ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "dev-secret-admin-key-123")
