import datetime
import os
import re
import sys
from pathlib import Path

from django.core.management.utils import get_random_secret_key
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Set ENV_FILE to point at a different env file (e.g. .env.prod).
env_file = os.getenv("ENV_FILE", ".env")

load_dotenv(BASE_DIR / env_file)


def env_bool(name, default=False):
    """Read a boolean from the environment. "False"/"0"/"no" are falsey."""
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    return raw.strip().strip("'\"").lower() in {"1", "true", "yes", "on"}


def env_list(name, default=None):
    """Read a list from the environment, split on commas and/or whitespace."""
    raw = os.getenv(name)
    if not raw:
        return list(default or [])
    return [item for item in re.split(r"[,\s]+", raw.strip().strip("'\"")) if item]


# Secret keys that were once shipped in this repo, or are obvious placeholders.
# Refusing them is what stops a self-hosted instance signing JWTs with a public key.
INSECURE_SECRET_KEYS = {
    "some-random-secret-key",
    "changeme",
    "change-me",
    "secret",
    "django-insecure",
}


def resolve_secret_key():
    """Return SECRET_KEY from the environment, or generate and persist one.

    A generated key is written to SECRET_KEY_FILE (default: BASE_DIR/.secret_key)
    so sessions and tokens survive a restart. Never falls back to a shared literal.
    """
    key = (os.getenv("SECRET_KEY") or "").strip().strip("'\"")
    if key and key.lower() not in INSECURE_SECRET_KEYS:
        return key

    if key:
        sys.stderr.write(
            f"\n!! SECRET_KEY is set to the known placeholder {key!r}. Ignoring it.\n"
        )

    key_file = Path(os.getenv("SECRET_KEY_FILE") or (BASE_DIR / ".secret_key"))
    if key_file.exists():
        stored = key_file.read_text(encoding="utf-8").strip()
        if stored:
            return stored

    generated = get_random_secret_key()
    try:
        key_file.write_text(generated + "\n", encoding="utf-8")
        key_file.chmod(0o600)
        sys.stderr.write(
            f"\n!! No SECRET_KEY configured. Generated one and saved it to {key_file}.\n"
            "!! Set SECRET_KEY in your environment for production deployments.\n\n"
        )
    except OSError as exc:
        sys.stderr.write(
            f"\n!! No SECRET_KEY configured and {key_file} is not writable ({exc}).\n"
            "!! Using an ephemeral key - every restart will invalidate all sessions\n"
            "!! and tokens. Set SECRET_KEY in your environment.\n\n"
        )
    return generated


SECRET_KEY = resolve_secret_key()
DEBUG = env_bool("DEBUG", False)
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", ["localhost", "127.0.0.1", "[::1]"])

AUTH_USER_MODEL = "pft.User"  # Add this line to use custom user model

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": datetime.timedelta(minutes=5),
    "REFRESH_TOKEN_LIFETIME": datetime.timedelta(days=1),
    # Rotation + blacklisting is what makes logout and "sign out everywhere"
    # actually invalidate a refresh token instead of merely forgetting it.
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
}

# Application definition

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "pft",
    "django_extensions",
    "rest_framework",
    "drf_spectacular",
    "drf_spectacular_sidecar",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
]

# NOTE: pagination is set per-viewset (see pft/views.py) rather than globally.
# The /api/v1/finance/* viewsets still return unpaginated lists; making pagination
# global here changes their response shape and needs a matching frontend change.
REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    # Throttling. Without this, /api/token/ and /api/v1/register/ are open to
    # brute force and mass account creation on every self-hosted instance.
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "anon": os.getenv("THROTTLE_ANON", "60/min"),
        "user": os.getenv("THROTTLE_USER", "1000/hour"),
        # Scoped rates for the endpoints worth guessing against.
        "login": os.getenv("THROTTLE_LOGIN", "10/min"),
        "register": os.getenv("THROTTLE_REGISTER", "5/hour"),
        "password_change": os.getenv("THROTTLE_PASSWORD_CHANGE", "5/min"),
    },
}

SPECTACULAR_SETTINGS = {
    "TITLE": "pft",
    "DESCRIPTION": "Personal Finance Tracker API Documentation",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "SWAGGER_UI_DIST": "SIDECAR",
    "SWAGGER_UI_FAVICON_HREF": "SIDECAR",
    "REDOC_DIST": "SIDECAR",
}

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

CORS_ALLOWED_ORIGINS = env_list("CORS_ALLOWED_ORIGINS", ["http://localhost:5173"])

CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS", ["http://localhost:5173"])

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_METHODS = [
    "DELETE",
    "GET",
    "OPTIONS",
    "PATCH",
    "POST",
    "PUT",
]
# CORS_ALLOW_HEADERS = [
#     'accept',
#     'accept-encoding',
#     'authorization',
#     'content-type',
#     'dnt',
#     'origin',
#     'user-agent',
#     'x-csrftoken',
#     'x-requested-with',
# ]

ROOT_URLCONF = "app.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
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

WSGI_APPLICATION = "app.wsgi.application"

# DATABASE_* is the documented naming; POSTGRES_* is accepted as a fallback so the
# same env file can drive both Django and the postgres container.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("DATABASE_NAME") or os.getenv("POSTGRES_DB"),
        "USER": os.getenv("DATABASE_USER") or os.getenv("POSTGRES_USER"),
        "PASSWORD": os.getenv("DATABASE_PASSWORD") or os.getenv("POSTGRES_PASSWORD"),
        "HOST": os.getenv("DATABASE_HOST") or os.getenv("POSTGRES_HOST", "localhost"),
        "PORT": os.getenv("DATABASE_PORT") or os.getenv("POSTGRES_PORT", "5432"),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- FinTrack limits ---------------------------------------------------------
# Import payloads and backup bundles are stored in the database as text and
# processed inside the request, so they need a ceiling.
FINTRACK_MAX_IMPORT_BYTES = int(os.getenv("FINTRACK_MAX_IMPORT_BYTES", 5 * 1024 * 1024))
FINTRACK_MAX_BACKUP_BYTES = int(
    os.getenv("FINTRACK_MAX_BACKUP_BYTES", 20 * 1024 * 1024)
)

# How long finished import/export jobs keep their payloads. These hold plaintext
# financial data; `manage.py prune_finance_jobs` clears anything older.
FINTRACK_JOB_RETENTION_DAYS = int(os.getenv("FINTRACK_JOB_RETENTION_DAYS", 30))

# --- Background jobs ---------------------------------------------------------
# With REDIS_URL set, imports and exports run on the Celery worker instead of
# inside the web request. Without it (bare-metal trials, the test suite) tasks
# run eagerly inline, so nothing requires a broker to merely work.
REDIS_URL = os.getenv("REDIS_URL")

CELERY_BROKER_URL = REDIS_URL
CELERY_TASK_ALWAYS_EAGER = env_bool("CELERY_TASK_ALWAYS_EAGER", REDIS_URL is None)
CELERY_TASK_EAGER_PROPAGATES = True
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True
# Job state lives on the ImportJob/ExportJob rows, not in a result backend.
CELERY_RESULT_BACKEND = None
CELERY_TASK_TIME_LIMIT = int(os.getenv("CELERY_TASK_TIME_LIMIT", 600))
CELERY_WORKER_MAX_TASKS_PER_CHILD = 100
