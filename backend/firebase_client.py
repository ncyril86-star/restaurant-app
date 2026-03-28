"""
Centralized Firebase Admin / Firestore client for the Django backend.

Local dev options (pick ONE):
- Set env var FIREBASE_SERVICE_ACCOUNT_PATH to your service account JSON path, or
- Set env var GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path, or
- Set env var FIREBASE_SERVICE_ACCOUNT_JSON to the JSON contents.

On Google Cloud environments, default credentials may also work.
"""

import json
import os
from functools import lru_cache

import firebase_admin
from firebase_admin import credentials, firestore
from google.auth.exceptions import DefaultCredentialsError


@lru_cache
def _init_app() -> firebase_admin.App:
    # 1. Try to get existing app to avoid "app already exists" errors
    # We use a named app "django-backend" for isolation
    app_name = "django-backend"
    try:
        return firebase_admin.get_app(app_name)
    except ValueError:
        pass # App not initialized yet

    # Option 1: full JSON in env (safer for local dev with .env)
    sa_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON") or os.getenv("FIREBASE_CREDENTIALS_JSON")
    if sa_json:
        try:
            cred_dict = json.loads(sa_json)
            cred = credentials.Certificate(cred_dict)  # type: ignore[arg-type]
            return firebase_admin.initialize_app(cred, name=app_name)
        except Exception as e:
            # If JSON parsing fails, we continue to other options
            print(f"DEBUG: Firebase JSON parsing failed: {e}")

    # Option 2: service account JSON path
    cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH") or os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if cred_path and os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        return firebase_admin.initialize_app(cred, name=app_name)

    # Fallback: default app (works on GCP/Render environments with default creds)
    try:
        return firebase_admin.initialize_app(name=app_name)
    except Exception as e:
        print(f"DEBUG: Firebase default init failed: {e}")
        raise


@lru_cache
def get_db() -> "firestore.Client":
    app = _init_app()
    try:
        return firestore.client(app=app)
    except DefaultCredentialsError as e:
        raise DefaultCredentialsError(
            "Firebase Admin credentials not found. Set one of these environment variables "
            "before starting `python manage.py runserver`: "
            "FIREBASE_SERVICE_ACCOUNT_PATH or GOOGLE_APPLICATION_CREDENTIALS "
            "(path to your service account JSON), or FIREBASE_SERVICE_ACCOUNT_JSON "
            "(the JSON contents)."
        ) from e


def get_menu_items_collection():
    """
    Convenience helper for the menu collection in Firestore.
    Adjust the collection name to match your existing Firebase structure.
    """

    db = get_db()
    return db.collection("menuItems")

