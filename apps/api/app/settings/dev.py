from .base import *  # noqa: F403

DEBUG = env_bool("DEBUG", True)  # noqa: F405
ALLOWED_HOSTS = ["*"]

INTERNAL_IPS = ["127.0.0.1"]

# Development CORS settings
CORS_ALLOW_ALL_ORIGINS = True  # Only use this in development!
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
    # Opts a browser call to /api/token/* into the HttpOnly refresh cookie -
    # see pft/auth_cookies.py and ARCHITECTURE.md's Authentication section.
    # Without this, `pnpm dev` against a bare `manage.py runserver` (a
    # different origin, unlike the same-origin nginx proxy docker-compose
    # uses) fails every login/refresh at the CORS preflight.
    "x-use-refresh-cookie",
]
