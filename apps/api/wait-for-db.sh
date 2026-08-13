#!/bin/sh
# Block until Postgres accepts connections, or give up after DB_WAIT_TIMEOUT seconds.
# Replaces the third-party wait-for-it.sh that used to be curl'd at image build time.

set -e

DB_HOST="${DATABASE_HOST:-${POSTGRES_HOST:-db}}"
DB_PORT="${DATABASE_PORT:-${POSTGRES_PORT:-5432}}"
DB_WAIT_TIMEOUT="${DB_WAIT_TIMEOUT:-60}"

echo "Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT} (timeout ${DB_WAIT_TIMEOUT}s)..."

elapsed=0
while [ "$elapsed" -lt "$DB_WAIT_TIMEOUT" ]; do
    if python -c "
import socket, sys
sock = socket.socket()
sock.settimeout(2)
try:
    sock.connect(('${DB_HOST}', ${DB_PORT}))
except OSError:
    sys.exit(1)
finally:
    sock.close()
" 2>/dev/null; then
        echo "Database is up."
        exit 0
    fi
    sleep 1
    elapsed=$((elapsed + 1))
done

echo "Timed out waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}" >&2
exit 1
