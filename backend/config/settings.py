"""
Django settings for restaurant backend.
"""
from pathlib import Path
import os
from dotenv import load_dotenv

print("--- DEBUG: Starting to load settings.py ---")

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get("SECRET_KEY", "django-insecure-fallback-key")

DEBUG = True

ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    "daphne",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "channels",
    "rest_framework",
    "corsheaders",
    "api",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

AUTH_PASSWORD_VALIDATORS = []

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CORS_ALLOW_ALL_ORIGINS = True

REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
}

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    },
}

# Email Settings
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"

# Dynamic Email Host Detection
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "testdev@zenarajaya.com").strip()
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "Zen@jaya_26").strip()

# Default to gmail if user is gmail
default_host = "smtp.gmail.com" if "gmail.com" in EMAIL_HOST_USER.lower() else "smtp.hostinger.com"
EMAIL_HOST = os.environ.get("EMAIL_HOST", default_host)

# Default port based on host (Switching to 587/TLS as it's more reliable on cloud providers)
default_port = "587"
raw_port = os.environ.get("EMAIL_PORT", default_port)

try:
    clean_port = "".join(filter(str.isdigit, str(raw_port)))
    EMAIL_PORT = int(clean_port) if clean_port else 587
except Exception:
    EMAIL_PORT = 587

# Security settings based on port
if EMAIL_PORT == 587:
    EMAIL_USE_TLS = True
    EMAIL_USE_SSL = False
else:
    # Usually 465
    EMAIL_USE_TLS = os.environ.get("EMAIL_USE_TLS", "False").strip().upper() == "TRUE"
    EMAIL_USE_SSL = os.environ.get("EMAIL_USE_SSL", "True").strip().upper() == "TRUE"

print(f"--- DEBUG: Settings loaded successfully (Host: {EMAIL_HOST}, Port: {EMAIL_PORT}, User: {EMAIL_HOST_USER}) ---")