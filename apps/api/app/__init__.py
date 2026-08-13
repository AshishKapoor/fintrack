# Import the Celery app on Django startup so @shared_task binds to it.
from .celery import app as celery_app

__all__ = ("celery_app",)
