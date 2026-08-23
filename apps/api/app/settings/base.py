import datetime
import os
import re
import sys
from pathlib import Path
from urllib.parse import urlsplit

from celery.schedules import crontab
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

# --- Demo mode -----------------------------------------------------------
# Powers a public, read-only "try before you self-host" instance (see
# docker-compose.demo.yml and pft/demo_mode.py). Off by default: turning it on
# rejects every mutating request instance-wide except signing in, so it is
# never something a real deployment could enable by accident.
FINTRACK_DEMO_MODE = env_bool("FINTRACK_DEMO_MODE", False)
FINTRACK_DEMO_EMAIL = os.getenv("FINTRACK_DEMO_EMAIL", "demo@fintrack.local")
FINTRACK_DEMO_PASSWORD = os.getenv("FINTRACK_DEMO_PASSWORD", "demo-password-123")

# --- Refresh-token cookie -----------------------------------------------------
# See pft/auth_cookies.py: browser clients opt in to an HttpOnly refresh-token
# cookie instead of a JSON body field, so page JavaScript never has a copy of
# it. SECURE mirrors SECURE_SSL (default True) rather than DEBUG, because what
# matters is whether the connection is HTTPS, not which settings module is
# active. SameSite=Strict is enough on its own to stop the cookie being sent
# cross-site at all (so CSRF is not a concern for these endpoints), as long as
# the frontend and API are served from the same site - the supported topology
# described in ARCHITECTURE.md.
REFRESH_COOKIE_SECURE = env_bool("SECURE_SSL", True)
REFRESH_COOKIE_SAMESITE = os.getenv("REFRESH_COOKIE_SAMESITE", "Strict")

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
    # JSON only. Advertising form and multipart in the schema made every
    # generated client emit three body encodings per operation, and the Python
    # generator picked multipart, which cannot carry nested postings.
    "DEFAULT_PARSER_CLASSES": ("rest_framework.parsers.JSONParser",),
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
        # Not a DRF endpoint - see pft/admin_throttle.py for how this scope
        # reaches the plain-Django admin login.
        "admin_login": os.getenv("THROTTLE_ADMIN_LOGIN", "10/min"),
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
    # Both of these reject a request before any other middleware does work
    # for one that is about to be refused anyway. DemoModeMiddleware is a
    # no-op unless FINTRACK_DEMO_MODE is on.
    "pft.demo_mode.DemoModeMiddleware",
    "pft.admin_throttle.AdminLoginThrottleMiddleware",
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
def database_config_from_env():
    """Build the `default` DATABASES entry from the environment.

    Most platforms this project is deployed to hand over discrete
    DATABASE_NAME/USER/PASSWORD/HOST/PORT (or POSTGRES_* - docker-compose.yml
    sets both from the same values so either naming works). Others - Render,
    Railway, Heroku-style PaaS in general - hand over one DATABASE_URL
    instead. Support both rather than requiring self-hosters on those
    platforms to split a URL Render already gave them back into five vars.
    """
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        parsed = urlsplit(database_url)
        return {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": parsed.path.lstrip("/"),
            "USER": parsed.username,
            "PASSWORD": parsed.password,
            "HOST": parsed.hostname,
            "PORT": str(parsed.port or 5432),
        }
    return {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("DATABASE_NAME") or os.getenv("POSTGRES_DB"),
        "USER": os.getenv("DATABASE_USER") or os.getenv("POSTGRES_USER"),
        "PASSWORD": os.getenv("DATABASE_PASSWORD") or os.getenv("POSTGRES_PASSWORD"),
        "HOST": os.getenv("DATABASE_HOST") or os.getenv("POSTGRES_HOST", "localhost"),
        "PORT": os.getenv("DATABASE_PORT") or os.getenv("POSTGRES_PORT", "5432"),
    }


DATABASES = {"default": database_config_from_env()}

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

# Runs once a day on whichever process runs `celery -A app beat` (the "beat"
# service in docker-compose.yml). Without a beat process this schedule simply
# never fires - prune_finance_jobs is still available as a manual command for
# bare-metal installs that would rather cron it themselves.
CELERY_TIMEZONE = "UTC"
CELERY_BEAT_SCHEDULE = {
    "prune-finance-jobs-daily": {
        "task": "pft.tasks.prune_finance_jobs_task",
        "schedule": crontab(hour=3, minute=0),
    },
}
if FINTRACK_DEMO_MODE:
    CELERY_BEAT_SCHEDULE["reset-demo-data-hourly"] = {
        "task": "pft.tasks.reset_demo_data_task",
        "schedule": crontab(minute=0),
    }

# --- Cache ---------------------------------------------------------------
# DRF's throttle classes (and pft/admin_throttle.py) count requests through
# django.core.cache. The default LocMemCache is per-process: with multiple
# gunicorn workers (the shipped default is 3, see entrypoint.sh), each one
# enforces its own separate counter, so a "10/min" limit is really closer to
# "10 * workers /min" against the deployment as a whole - the rate limit
# silently gets weaker exactly where it matters most. With REDIS_URL set,
# every worker (API and Celery alike) shares one real counter instead. No
# extra dependency: Django's redis cache backend just needs the `redis`
# package, already pulled in by celery[redis].
if os.getenv("REDIS_URL"):
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": os.getenv("REDIS_URL"),
        }
    }
