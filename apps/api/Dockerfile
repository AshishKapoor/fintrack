FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app

ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy

COPY entrypoint.sh /entrypoint.sh
COPY entrypoint.migrate.sh /entrypoint.migrate.sh
COPY wait-for-db.sh /usr/local/bin/wait-for-db.sh
RUN chmod +x /entrypoint.sh /entrypoint.migrate.sh /usr/local/bin/wait-for-db.sh

# `upgrade` as well as `install`: the uv base image tracks bookworm-slim,
# which lags Debian's security updates, and the difference is not academic -
# a scan of the published image found a CRITICAL in libgnutls30 and HIGHs
# across krb5 and libcap2, all with fixes already in the archive. This is what
# .github/workflows/dependency-scan.yml gates on.
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y libpq-dev gcc build-essential gettext && \
    rm -rf /var/lib/apt/lists/*

RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    uv sync --frozen --no-install-project --no-dev

ADD . /app

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev

ENV PATH="/app/.venv/bin:$PATH"

# uv run implicitly re-syncs the venv before every invocation, using uv's
# default groups - which include "dev" (ruff, hypothesis, pre-commit) even
# though the venv above was built with --no-dev. Left unset, every uv run in
# entrypoint.sh/entrypoint.migrate.sh/docker-compose's worker&beat commands
# would redownload and reinstall the dev group from scratch on each container
# boot. The venv above is already exactly what --frozen --no-dev produces, so
# skip that resync. docker-compose.dev.yml resets this to 0, since its bind
# mount shadows this venv and `make dev` needs uv to sync one back into place.
ENV UV_NO_SYNC=1

EXPOSE 8000


ENTRYPOINT ["/entrypoint.sh"]
