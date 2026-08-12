"""Settings package.

Importing ``app.settings`` directly resolves to the production settings unless
DJANGO_ENV says otherwise. Prefer being explicit with
``DJANGO_SETTINGS_MODULE=app.settings.dev`` or ``app.settings.prod``.
"""

import os

if os.getenv("DJANGO_ENV", "production").lower() in {"dev", "development", "local"}:
    from .dev import *  # noqa: F401,F403
else:
    from .prod import *  # noqa: F401,F403
