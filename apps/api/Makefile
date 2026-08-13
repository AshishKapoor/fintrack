GREEN  := \033[0;32m
YELLOW := \033[1;33m
RED    := \033[0;31m
RESET  := \033[0m

.PHONY: help install run test lint format clean migrate migrations shell collectstatic app command superuser

help:
	@printf "${YELLOW}Available commands:${RESET}\n"
	@printf "  ${GREEN}install${RESET}         - Install project dependencies\n"
	@printf "  ${GREEN}run${RESET}             - Run development server\n"
	@printf "  ${GREEN}test${RESET}            - Run tests\n"
	@printf "  ${GREEN}lint${RESET}            - Run code linting\n"
	@printf "  ${GREEN}format${RESET}          - Format code\n"
	@printf "  ${GREEN}clean${RESET}           - Remove cached files\n"
	@printf "  ${GREEN}migrate${RESET}         - Apply database migrations\n"
	@printf "  ${GREEN}migrations${RESET}  - Create new database migrations\n"
	@printf "  ${GREEN}shell${RESET}           - Open Django shell\n"
	@printf "  ${GREEN}collectstatic${RESET}   - Collect static files\n"
	@printf "  ${GREEN}app${RESET}             - Create a new app (name=your_app)\n"
	@printf "  ${GREEN}command${RESET}         - Create a custom Django command (app=your_app name=your_command)\n"
	@printf "  ${GREEN}superuser${RESET}       - Create a superuser\n"

install:
	@printf "${YELLOW}Installing dependencies...${RESET}\n"
	uv sync

run:
	@printf "${YELLOW}Starting development server...${RESET}\n"
	uv run manage.py runserver

test:
	@printf "${YELLOW}Running tests...${RESET}\n"
	uv run manage.py test

lint:
	@printf "${YELLOW}Running linter...${RESET}\n"
	uv run ruff check .

format:
	@printf "${YELLOW}Formatting code...${RESET}\n"
	uv run ruff format .
	uv run ruff check --fix .

clean:
	@printf "${YELLOW}Cleaning up cache files...${RESET}\n"
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type f -name "*.pyd" -delete
	find . -type f -name ".coverage" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	find . -type d -name "*.egg" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".tox" -exec rm -rf {} +

migrate:
	@printf "${YELLOW}Running migrations...${RESET}\n"
	uv run manage.py migrate

migrations:
	@printf "${YELLOW}Creating migrations...${RESET}\n"
	uv run manage.py makemigrations

shell:
	@printf "${YELLOW}Starting Django shell...${RESET}\n"
	uv run manage.py shell_plus

collectstatic:
	@printf "${YELLOW}Collecting static files...${RESET}\n"
	uv run manage.py collectstatic --noinput

app:
	@if [ -z "$(name)" ]; then \
		printf "${RED}Error: Please provide app name like 'make app name=core'${RESET}\n"; \
		exit 1; \
	fi; \
	uv run manage.py startapp $(name) && \
	rm $(name)/tests.py && \
	mkdir -p $(name)/tests/ && \
	touch $(name)/tests/__init__.py && \
	printf "${GREEN}App '$(name)' created successfully!${RESET}\n"

command:
	@printf "${YELLOW}Creating command '${name}' in '${app}' app...${RESET}\n"
	@if [ -z "$(app)" ] || [ -z "$(name)" ]; then \
		printf "${RED}Error: Provide app and command name like 'make command app=core name=seed_data'${RESET}\n"; \
		exit 1; \
	fi
	@if [ -f "$(app)/management/commands/$(name).py" ]; then \
		printf "${RED}Error: Command '$(name)' already exists in '$(app)' app${RESET}\n"; \
		exit 1; \
	fi
	@mkdir -p $(app)/management/commands
	@touch $(app)/management/__init__.py
	@touch $(app)/management/commands/__init__.py
	@touch $(app)/management/commands/$(name).py
	@printf "${GREEN}Command '$(name)' created successfully in '$(app)' app!${RESET}\n"

superuser:
	@printf "${YELLOW}Creating superuser...${RESET}\n"
	uv run manage.py createsuperuser