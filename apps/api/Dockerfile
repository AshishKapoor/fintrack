FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app

ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy

COPY entrypoint.sh /entrypoint.sh
COPY entrypoint.migrate.sh /entrypoint.migrate.sh
COPY wait-for-db.sh /usr/local/bin/wait-for-db.sh
RUN chmod +x /entrypoint.sh /entrypoint.migrate.sh /usr/local/bin/wait-for-db.sh

RUN apt-get update && \
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

EXPOSE 8000


ENTRYPOINT ["/entrypoint.sh"]
