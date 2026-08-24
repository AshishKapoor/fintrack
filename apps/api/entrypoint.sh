#!/bin/sh
set -e

/usr/local/bin/wait-for-db.sh

# *.mo files are gitignored build output (see apps/api/.gitignore) compiled
# from the committed locale/*/LC_MESSAGES/*.po catalogs - see docs/i18n.md.
# The image already has one from the Dockerfile's build-time compile, but
# `make dev`'s bind mount (docker-compose.dev.yml) overlays the whole /app
# directory, including locale/, with the host checkout - which has .po but
# not .mo. Recompiling on every boot is cheap and keeps both paths working
# without maintaining two copies of this step.
uv run manage.py compilemessages --verbosity 0

# Some platforms' Docker integration can only override CMD, not ENTRYPOINT
# (e.g. Render's `dockerCommand` - see deploy/render.yaml), so a command
# passed here runs instead of the default gunicorn server below. Useful for
# running a Celery worker/beat process from the same image without a
# separate entrypoint. docker-compose's worker/beat services bypass this
# file entirely instead, via their own `entrypoint:` override - this exists
# for platforms that don't allow that.
if [ "$#" -gt 0 ]; then
    echo "Running: $*"
    exec "$@"
fi

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
