.PHONY: help up dev down build logs clean bootstrap test-api test-api-all feature-audit

COMPOSE_DEV := docker compose -f docker-compose.yml -f docker-compose.dev.yml

help:
	@echo "up             - start the stack (production-style settings)"
	@echo "dev            - start the stack with hot reload and dev settings"
	@echo "down           - stop the stack"
	@echo "build          - rebuild images"
	@echo "logs           - follow logs"
	@echo "clean          - stop the stack and delete its volumes (destroys data)"
	@echo "test-api       - run the backend smoke tests"
	@echo "test-api-all   - run the full backend test suite"
	@echo "feature-audit  - validate the feature matrix and regenerate the parity report"
	@echo "bootstrap      - create missing .env files (runs automatically before docker targets)"

bootstrap:
	@./setup.sh configure

up: bootstrap
	docker compose up -d

dev: bootstrap
	$(COMPOSE_DEV) up

down:
	docker compose down

build: bootstrap
	docker compose build

logs:
	docker compose logs -f

clean:
	docker compose down -v --remove-orphans

test-api: bootstrap
	$(COMPOSE_DEV) run --rm -e CELERY_TASK_ALWAYS_EAGER=True --entrypoint sh migrate -lc "uv run manage.py test pft.tests.test_api_smoke"

test-api-all: bootstrap
	$(COMPOSE_DEV) run --rm -e CELERY_TASK_ALWAYS_EAGER=True --entrypoint sh migrate -lc "uv run manage.py test"

feature-audit:
	python3 scripts/feature_audit.py
