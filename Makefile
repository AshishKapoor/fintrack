.PHONY: help up dev down build logs clean bootstrap test-api test-api-all feature-audit

COMPOSE_DEV := docker compose -f docker-compose.yml -f docker-compose.dev.yml

help:
	@echo "bootstrap      - create .env files from the examples (run this first)"
	@echo "up             - start the stack (production-style settings)"
	@echo "dev            - start the stack with hot reload and dev settings"
	@echo "down           - stop the stack"
	@echo "build          - rebuild images"
	@echo "logs           - follow logs"
	@echo "clean          - stop the stack and delete its volumes (destroys data)"
	@echo "test-api       - run the backend smoke tests"
	@echo "test-api-all   - run the full backend test suite"
	@echo "feature-audit  - validate the feature matrix and regenerate the parity report"

bootstrap:
	@test -f .env || cp .env.example .env
	@test -f web/.env || cp web/.env.example web/.env
	@echo "Bootstrap complete. Review .env before exposing this instance publicly."

up:
	docker compose up -d

dev:
	$(COMPOSE_DEV) up

down:
	docker compose down

build:
	docker compose build

logs:
	docker compose logs -f

clean:
	docker compose down -v --remove-orphans

test-api:
	$(COMPOSE_DEV) run --rm --entrypoint sh migrate -lc "uv run manage.py test pft.tests.test_api_smoke"

test-api-all:
	$(COMPOSE_DEV) run --rm --entrypoint sh migrate -lc "uv run manage.py test"

feature-audit:
	python3 scripts/feature_audit.py
