#!/bin/sh
set -e

/usr/local/bin/wait-for-db.sh

if [ "${DJANGO_ENV:-production}" = "development" ] || [ "${DJANGO_ENV:-}" = "dev" ]; then
    echo "Starting Django development server..."
    exec uv run manage.py runserver 0.0.0.0:8000
fi

echo "Collecting static files..."
uv run manage.py collectstatic --noinput

echo "Starting gunicorn..."
exec uv run gunicorn app.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers "${GUNICORN_WORKERS:-3}" \
    --timeout "${GUNICORN_TIMEOUT:-60}" \
    --access-logfile - \
    --error-logfile -
