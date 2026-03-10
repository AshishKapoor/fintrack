.PHONY: up down build logs clean feature-audit

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

feature-audit:
	python3 scripts/feature_audit.py
