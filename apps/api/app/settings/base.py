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
        # The send-a-test-notification action makes the server issue an
        # outbound HTTP request (ntfy/webhook) or send mail on the caller's
        # behalf - worth its own modest cap independent of the general "user"
        # rate, same reasoning as login/register.
        "notification_test": os.getenv("THROTTLE_NOTIFICATION_TEST", "10/hour"),
        # Bank sync actions (link/callback/sync/institutions) call out to
        # GoCardless or a user-supplied SimpleFIN URL on the caller's behalf -
        # same reasoning as notification_test, and GoCardless's own free tier
        # separately caps daily calls per account regardless of this.
        "bank_sync": os.getenv("THROTTLE_BANK_SYNC", "30/hour"),
        "fx_sync": os.getenv("THROTTLE_FX_SYNC", "10/hour"),
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
    # Reads Accept-Language (there's no session/cookie login page to carry a
    # `django_language` cookie override on this JSON API, so the header is the
    # only signal) and activates a language from LANGUAGES for the rest of the
    # request - what makes gettext/gettext_lazy calls in serializers and
    # emails translate. Must sit between Session and Common per Django's docs.
    "django.middleware.locale.LocaleMiddleware",
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

LANGUAGE_CODE = "en"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# Every language a translation.json/django.po pair exists for - see docs/i18n.md.
# LocaleMiddleware picks one of these from the Accept-Language header (or the
# `?lang=` override it also understands) per request, so hand-written strings
# wrapped in gettext/gettext_lazy translate the same way DRF's own built-in
# validation messages already do. The frontend's language list in
# apps/web/app/i18n.ts is the same two codes, kept in sync by hand since the
# two apps have no shared config.
LANGUAGES = [
    ("en", "English"),
    ("es", "Español"),
]
LOCALE_PATHS = [BASE_DIR / "locale"]

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

# Runs on whichever process runs `celery -A app beat` (the "beat" service in
# docker-compose.yml). Without a beat process these schedules simply never
# fire - both prune_finance_jobs and "run due" scheduled transactions remain
# available as a manual command / API action for bare-metal installs and
# beat-less deployments (e.g. the Render one-click deploy) that would rather
# trigger them another way.
CELERY_TIMEZONE = "UTC"
CELERY_BEAT_SCHEDULE = {
    "prune-finance-jobs-daily": {
        "task": "pft.tasks.prune_finance_jobs_task",
        "schedule": crontab(hour=3, minute=0),
    },
    # Hourly rather than daily so a schedule due "today" posts within the
    # hour instead of waiting for a once-a-day sweep - see ROADMAP.md's
    # Phase 1 "Celery beat scheduler" item.
    "materialize-due-scheduled-transactions-hourly": {
        "task": "pft.tasks.materialize_due_scheduled_transactions_task",
        "schedule": crontab(minute=0),
    },
    # Daily rather than hourly: these are alerts, not time-critical postings,
    # and NotificationLog's dedupe key already makes re-running safe - once
    # a day is just enough not to spam a worker that restarts mid-run.
    "check-budget-threshold-alerts-daily": {
        "task": "pft.tasks.check_budget_threshold_alerts_task",
        "schedule": crontab(hour=8, minute=0),
    },
    "send-scheduled-transaction-reminders-daily": {
        "task": "pft.tasks.send_scheduled_transaction_reminders_task",
        "schedule": crontab(hour=8, minute=15),
    },
    "send-weekly-digest-mondays": {
        "task": "pft.tasks.send_weekly_digest_task",
        "schedule": crontab(hour=8, minute=30, day_of_week=1),
    },
    # Every 6 hours, not hourly - see sync_bank_connections_task's docstring
    # for why (provider rate limits, and neither bank's data changes fast
    # enough for hourly to matter).
    "sync-bank-connections-every-6-hours": {
        "task": "pft.tasks.sync_bank_connections_task",
        "schedule": crontab(minute=0, hour="*/6"),
    },
    # After the ECB's ~16:00 CET publish time.
    "sync-fx-rates-daily": {
        "task": "pft.tasks.sync_fx_rates_task",
        "schedule": crontab(hour=15, minute=30),
    },
}
if FINTRACK_DEMO_MODE:
    CELERY_BEAT_SCHEDULE["reset-demo-data-hourly"] = {
        "task": "pft.tasks.reset_demo_data_task",
        "schedule": crontab(minute=0),
    }

# --- Email (notifications) ------------------------------------------------
# Console backend by default - self-hosters see the message that would have
# been sent (in the api/worker process's own log) without configuring SMTP
# first, which is enough to try the feature. Set EMAIL_HOST for real delivery;
# see docs/self-hosting.md. Explicitly setting EMAIL_BACKEND always wins, for
# the rare case of wanting a different backend entirely (e.g. a file backend
# for debugging).
EMAIL_BACKEND = os.getenv(
    "EMAIL_BACKEND",
    "django.core.mail.backends.smtp.EmailBackend"
    if os.getenv("EMAIL_HOST")
    else "django.core.mail.backends.console.EmailBackend",
)
EMAIL_HOST = os.getenv("EMAIL_HOST", "")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", True)
EMAIL_USE_SSL = env_bool("EMAIL_USE_SSL", False)
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "FinTrack <notifications@fintrack.local>")

# --- Bank sync (ROADMAP.md Phase 2) ---------------------------------------
# SyncConnection credentials (GoCardless requisition/agreement ids, SimpleFIN
# access URLs) are encrypted at rest with this key - see pft/crypto.py.
# Falls back to deriving one from SECRET_KEY so bank sync works with zero
# extra configuration; set a dedicated key in production so rotating
# SECRET_KEY (which signs everyone out) does not also strand every stored
# bank connection - see docs/self-hosting.md#bank-sync.
FINTRACK_SYNC_ENCRYPTION_KEY = os.getenv("FINTRACK_SYNC_ENCRYPTION_KEY") or SECRET_KEY

# GoCardless Bank Account Data (https://developer.gocardless.com/bank-account-data/overview):
# instance-wide API credentials from a free GoCardless developer account, not
# per-user - the same shape as EMAIL_HOST for outbound mail. Bank sync via
# GoCardless is unavailable (SyncConnectionViewSet.providers reports
# configured: false) until both are set.
GOCARDLESS_SECRET_ID = os.getenv("GOCARDLESS_SECRET_ID", "")
GOCARDLESS_SECRET_KEY = os.getenv("GOCARDLESS_SECRET_KEY", "")
GOCARDLESS_API_BASE_URL = os.getenv(
    "GOCARDLESS_API_BASE_URL", "https://bankaccountdata.gocardless.com/api/v2"
)

# Where FinTrack's own web app is served, so a redirect-based provider
# (GoCardless) can send the user back after they finish authenticating at
# their bank. Defaults to CORS_ALLOWED_ORIGINS' own default, i.e. `pnpm dev`.
FINTRACK_FRONTEND_URL = os.getenv("FINTRACK_FRONTEND_URL", "http://localhost:5173")

# --- Multi-currency (ROADMAP.md Phase 2) -----------------------------------
# frankfurter.app (ECB reference rates) needs no API key. Overridable mostly
# for tests and self-hosters running their own mirror.
FRANKFURTER_BASE_URL = os.getenv("FRANKFURTER_BASE_URL", "https://api.frankfurter.app")

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
