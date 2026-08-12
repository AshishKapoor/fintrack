#!/usr/bin/env sh
# Fintrack setup script.
#
# Usage:
#   ./setup.sh configure   Create the .env files from their examples
#   ./setup.sh start       Configure (if needed), build, and start all services
#   ./setup.sh stop        Stop all services (data is kept)
#   ./setup.sh clean       Stop everything and delete containers, volumes, and data
#
# Requires: Docker with the "docker compose" plugin.

set -eu

# Always run relative to the repository root, no matter where the script is
# invoked from.
cd "$(dirname "$0")"

COMPOSE="docker compose"

usage() {
    sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'
}

require_docker() {
    if ! command -v docker >/dev/null 2>&1; then
        echo "Error: docker is not installed or not on PATH." >&2
        echo "Install it from https://docs.docker.com/get-docker/ and retry." >&2
        exit 1
    fi
    if ! docker compose version >/dev/null 2>&1; then
        echo "Error: the 'docker compose' plugin is not available." >&2
        echo "Install Docker Compose v2: https://docs.docker.com/compose/install/" >&2
        exit 1
    fi
}

created_any=0

copy_env() {
    src="$1"
    dest="$2"
    if [ ! -f "$dest" ]; then
        cp "$src" "$dest"
        echo "  Created $dest (from $src)."
        created_any=1
    fi
}

# Idempotent: existing .env files are never touched, and runs that create
# nothing stay quiet so this can be invoked before every start.
configure() {
    copy_env .env.example .env
    copy_env api/.env.example api/.env
    copy_env web/.env.example web/.env
    if [ "$created_any" = 1 ]; then
        echo "Review the generated .env files before exposing this instance publicly"
        echo "(at minimum, change POSTGRES_PASSWORD in .env)."
    fi
}

start() {
    require_docker
    # Make sure the env files exist so first-time 'start' just works.
    configure
    echo
    echo "Building and starting services..."
    $COMPOSE up -d --build
    echo
    echo "Fintrack is starting. Once healthy, it is available at:"
    echo "  Frontend:  http://localhost:${WEB_PORT:-5173}"
    echo "  API:       http://localhost:${API_PORT:-8000}"
    echo "  API docs:  http://localhost:${API_PORT:-8000}/api/docs/"
    echo
    echo "Follow logs with: $COMPOSE logs -f"
}

stop() {
    require_docker
    echo "Stopping services (data volumes are preserved)..."
    $COMPOSE down
    echo "Stopped. Run './setup.sh start' to bring everything back up."
}

clean() {
    require_docker
    echo "This removes all Fintrack containers, networks, and volumes,"
    echo "INCLUDING the database. All application data will be lost."
    printf "Continue? [y/N] "
    read -r answer
    case "$answer" in
        [Yy]|[Yy][Ee][Ss])
            $COMPOSE down -v --remove-orphans
            echo "Cleaned. Run './setup.sh start' for a fresh install."
            ;;
        *)
            echo "Aborted. Nothing was removed."
            ;;
    esac
}

case "${1:-}" in
    start)     start ;;
    configure) configure ;;
    stop)      stop ;;
    clean)     clean ;;
    -h|--help|help) usage ;;
    "")
        usage
        exit 1
        ;;
    *)
        echo "Error: unknown command '$1'" >&2
        echo >&2
        usage >&2
        exit 1
        ;;
esac
