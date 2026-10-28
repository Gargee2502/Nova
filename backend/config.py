import os
from pathlib import Path
from dotenv import load_dotenv

# Base paths
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
UPLOAD_DIR = BASE_DIR / "uploads"
DATA_DIR = BASE_DIR / "data"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)

# Load environment variables without modifying or inspecting .env directly
env_paths = [
    PROJECT_ROOT / ".env",
    BASE_DIR / ".env"
]
for p in env_paths:
    if p.exists():
        load_dotenv(dotenv_path=p, override=False)
        break

class Settings:
    BASE_DIR: Path = BASE_DIR
    UPLOAD_DIR: Path = UPLOAD_DIR
    DATA_DIR: Path = DATA_DIR

    # Gemini Configuration
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "").strip()
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()
    
    # MongoDB Configuration
    MONGODB_URI: str = os.getenv("MONGODB_URI", "").strip()
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "nova").strip()
    
    # Agent & Thresholds
    CONFIDENCE_THRESHOLD: float = float(os.getenv("CONFIDENCE_THRESHOLD", "0.70"))
    MAX_UPLOAD_SIZE_MB: int = int(os.getenv("MAX_UPLOAD_SIZE_MB", "200"))
    
    # Network & URLs
    BACKEND_HOST: str = os.getenv("BACKEND_HOST", "0.0.0.0")
    BACKEND_PORT: int = int(os.getenv("BACKEND_PORT", "8000"))
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    TESTING: bool = os.getenv("TESTING", "0") in ("1", "true", "True")
    
    @property
    def is_gemini_configured(self) -> bool:
        return bool(self.GEMINI_API_KEY and self.GEMINI_API_KEY != "replace_with_your_gemini_api_key")

    @property
    def is_mongodb_configured(self) -> bool:
        return bool(self.MONGODB_URI and not self.MONGODB_URI.startswith("replace"))

settings = Settings()
