# 🚀 Backend API

A DRF designed with developer productivity and best practices in mind.

## 🧩 Features

- ✅ Django 5.x with modular settings
- ✅ PostgreSQL as default database
- ✅ DRF (Django REST Framework) for API development
- ✅ OpenAPI documentation using drf-spectacular
- ✅ Psycopg 3 integration (PostgreSQL adapter)
- ✅ Ruff for linting and formatting
- ✅ Pre-commit hook to enforce code style
- ✅ Task automation via Makefile
- ✅ Docker support (uv-based image, optimized build)
- ✅ VSCode dev container support

---

## 🛠 Getting Started

### Option 1: Using Docker

1. Copy and rename `.env.example` to `.env.dev`
2. Run Docker:

```bash
docker compose build
docker compose run migrate
docker compose up
```

Django will be available at: http://localhost:8000

### Option 2: Using Makefile

1. Copy and rename `.env.example` to `.env.dev`
2. Sync and install dependencies:

```bash
make install
```

3. Run migrations and dev server:

```bash
make migrate
make run
```

---

## 🧪 Development

### Available Makefile Commands

⚠️ Warning

Makefile commands only work on your local development machine, when DATABASE_HOST is set to localhost.
For development inside Docker, execute commands using:
docker compose exec web {your command}

```bash
make install        # Sync dependencies with uv
make run            # Start development server
make migrate        # Apply database migrations
make shell          # Open Django shell_plus
make test           # Run tests
make lint           # Run Ruff linter
make format         # Format code using Ruff
make clean          # Delete cache and temporary files
make superuser name # Make super user
make app name={app_name} # Create app
make command app={app_name} command={command_name} # Create command with app name and command name
```

---

## ✅ Linting

We use [Ruff](https://docs.astral.sh/ruff/) for linting and formatting.

Configure rules inside `pyproject.toml` under `[tool.ruff]`, `[tool.ruff.lint]`, and `[tool.ruff.format]`.

To run manually:

```bash
make lint
make format
```

---

## 🔄 Pre-commit Hook

Set up the pre-commit hook for consistent code quality:

```bash
pre-commit install
```

It will run Ruff check, formatting and GitLeaks inspection before every commit.

---

## 📦 Docker

The Dockerfile is based on `ghcr.io/astral-sh/uv` with pre-installed uv support. It:

- Installs dependencies using uv
- Waits for PostgreSQL using `wait-for-it.sh`
- Runs migrations
- Starts Django development server

Example `docker-compose.yml` connects the Django app to a PostgreSQL container.

---

## 📚 API Docs

OpenAPI documentation is powered by `drf-spectacular`:

- `/api/schema/` – schema endpoint
- `/api/docs/` – Swagger UI

---

Purely inspired from
https://github.com/saba-ab/advanced_django_blueprint
