"""Celery application.

Configuration comes from Django settings under the CELERY_ namespace, so there
is exactly one place deployment values live. When no broker is configured the
settings switch the app into eager mode - tasks run inline in the calling
process - which keeps bare-metal installs and the test suite working with no
Redis at all.
"""

import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "app.settings")

app = Celery("fintrack")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
