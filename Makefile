.PHONY: up down build logs clean bootstrap test-api test-api-all feature-audit

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

logs:
	docker compose logs -f

clean:
	docker compose down -v --remove-orphans

bootstrap:
	@test -f api/.env.dev || cp api/.env.example api/.env.dev
	@test -f web/.env || cp web/.env.example web/.env
	@echo "Bootstrap complete. Environment files are ready."

test-api:
	docker compose run --rm --entrypoint sh migrate -lc "uv run manage.py test pft.tests.test_api_smoke"

test-api-all:
	docker compose run --rm --entrypoint sh migrate -lc "uv run manage.py test"

feature-audit:
	python3 scripts/feature_audit.py
