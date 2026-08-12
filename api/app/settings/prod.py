from .base import *  # noqa: F403

DEBUG = env_bool("DEBUG", False)  # noqa: F405

# ALLOWED_HOSTS, CORS_ALLOWED_ORIGINS and CSRF_TRUSTED_ORIGINS all come from the
# environment (see base.py). Set them to your own domain before exposing this
# instance to the internet:
#
#   DJANGO_ALLOWED_HOSTS=api.yourdomain.com
#   CORS_ALLOWED_ORIGINS=https://yourdomain.com
#   CSRF_TRUSTED_ORIGINS=https://yourdomain.com

# HTTPS hardening. Enabled by default, but every switch is env-driven so a
# plain-HTTP deployment on a LAN or behind a local reverse proxy still works:
# set SECURE_SSL=False in that case.
_secure = env_bool("SECURE_SSL", True)  # noqa: F405

CSRF_COOKIE_SECURE = _secure
SESSION_COOKIE_SECURE = _secure
SECURE_SSL_REDIRECT = _secure
SECURE_HSTS_SECONDS = int(os.getenv("SECURE_HSTS_SECONDS", "31536000" if _secure else "0"))  # noqa: F405
SECURE_HSTS_INCLUDE_SUBDOMAINS = _secure
SECURE_HSTS_PRELOAD = _secure
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {name} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": os.getenv("LOG_LEVEL", "INFO"),  # noqa: F405
    },
    "loggers": {
        "django.request": {
            "handlers": ["console"],
            "level": "ERROR",
            "propagate": False,
        },
    },
}
