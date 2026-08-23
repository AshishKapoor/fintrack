#!/bin/sh
set -e

/usr/local/bin/wait-for-db.sh

echo "Running migrations..."
uv run manage.py migrate --noinput

# The admin account is only created when you ask for one. There is deliberately
# no default password: set both variables to bootstrap an admin non-interactively,
# or run `uv run manage.py createsuperuser` yourself.
if [ -n "$FINTRACK_ADMIN_EMAIL" ] && [ -n "$FINTRACK_ADMIN_PASSWORD" ]; then
    echo "Ensuring admin account ${FINTRACK_ADMIN_EMAIL} exists..."
    FINTRACK_ADMIN_EMAIL="$FINTRACK_ADMIN_EMAIL" \
    FINTRACK_ADMIN_PASSWORD="$FINTRACK_ADMIN_PASSWORD" \
        uv run manage.py bootstrap_admin
elif [ -n "$FINTRACK_ADMIN_EMAIL" ] || [ -n "$FINTRACK_ADMIN_PASSWORD" ]; then
    echo "Both FINTRACK_ADMIN_EMAIL and FINTRACK_ADMIN_PASSWORD are required to create an admin; skipping." >&2
else
    echo "No FINTRACK_ADMIN_EMAIL/FINTRACK_ADMIN_PASSWORD set - skipping admin creation."
    echo "Register the first account in the web UI, or run: manage.py createsuperuser"
fi

# docker-compose.demo.yml sets this. The `beat` service takes over resetting
# it hourly from here on (see CELERY_BEAT_SCHEDULE, pft/tasks.py); this just
# makes sure a brand new demo instance is not empty for the first hour.
if [ "$FINTRACK_DEMO_MODE" = "true" ] || [ "$FINTRACK_DEMO_MODE" = "True" ] || [ "$FINTRACK_DEMO_MODE" = "1" ]; then
    echo "Demo mode is on - seeding the demo account..."
    uv run manage.py seed_demo \
        --email="${FINTRACK_DEMO_EMAIL:-demo@fintrack.local}" \
        --password="${FINTRACK_DEMO_PASSWORD:-demo-password-123}"
fi
