.PHONY: up down build migrate seed logs backend-shell frontend-shell

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

rebuild:
	docker compose build --no-cache

logs:
	docker compose logs -f

migrate:
	docker compose exec backend alembic upgrade head

makemigrations:
	docker compose exec backend alembic revision --autogenerate -m "$(msg)"

seed:
	docker compose exec backend python -m app.services.rag_engine ingest

backend-shell:
	docker compose exec backend bash

frontend-shell:
	docker compose exec frontend sh

psql:
	docker compose exec postgres psql -U lexsmart -d lexsmart
