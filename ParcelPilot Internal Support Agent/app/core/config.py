"""
Core configuration constants and environment variable management for ParcelPilot.
"""

from __future__ import annotations

import os
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env if present
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
STORAGE_DIR = BASE_DIR / "storage"
CHROMA_DIR = STORAGE_DIR / "chroma_db"
SQLITE_PATH = STORAGE_DIR / "app.db"

# Ensure storage directory exists
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

# Fixed dataset snapshot time from README sheet: 2026-08-16 11:00 Asia/Kolkata
SNAPSHOT_TIME_ISO = os.getenv("DATASET_SNAPSHOT_TIME", "2026-08-16T11:00:00+05:30")


def now() -> datetime:
    """
    Returns the fixed business-logic time.
    NEVER call datetime.now() directly in business logic.
    """
    return datetime.fromisoformat(SNAPSHOT_TIME_ISO)


# Role and permission constants
ROLE_ACCOUNT_SCOPED = "support_agent"
ROLES_WITH_GLOBAL_READ = {"senior_support", "operations_manager", "admin"}
ROLES_WITH_ACTION_PERMISSION = {"operations_manager", "admin"}
ALL_ROLES = {"support_agent", "senior_support", "operations_manager", "admin"}

# CORS settings
CORS_ORIGINS_RAW = os.getenv("CORS_ORIGINS", "*")
if CORS_ORIGINS_RAW == "*":
    CORS_ORIGINS = ["*"]
else:
    CORS_ORIGINS = [origin.strip() for origin in CORS_ORIGINS_RAW.split(",") if origin.strip()]
