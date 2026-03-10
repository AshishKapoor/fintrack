# 💰 Fintrack

**Fintrack** is a privacy-first, self-hostable personal finance tracker built by [Sannty](https://sannty.in). Designed for individuals who want to take full control of their income, expenses, budgets, and financial goals without relying on third-party services.

## [Self Host] Admin Credentials (change me!)
URL: http://localhost:5173
```
email: admin@example.com
password: fintrack
```

## Screenshot

<img src="https://github.com/user-attachments/assets/e66ad9e7-a967-4d5b-9139-9c327b6b466f" alt="screenshot" width="800" height="600" />

---

## 🚀 Features

- 📊 Track income and expenses with ease
- 🧾 Add custom categories and tags
- 📅 View transactions by day, week, or month
- 📈 Budget planning and progress tracking
- 🔒 100% self-hosted – your data, your server
- 📦 Export data as CSV or JSON
- 👤 Multi-user support (optional)
- 🌗 Light/Dark mode UI
- 📱 Responsive design (mobile + desktop)
- 🔌 API-first architecture

---

## 🛠️ Tech Stack

### 📱 Web (Frontend)
- **Framework**: React 18
- **Styling**: TailwindCSS
- **State Management**: Zustand
- **Build Tool**: Vite
- **Package Manager**: pnpm

### 🔧 API (Backend)
- **Framework**: Django + Django REST Framework
- **Database**: PostgreSQL
- **Package Manager**: Poetry
- **Authentication**: JWT-based

### 🐳 Infrastructure
- **Containerization**: Docker & Docker Compose
- **Development**: Hot-reload enabled for both frontend and backend

---

## 📁 Project Structure

```
fintrack/
├── api/                # Django backend
│   ├── app/            # Django project settings
│   ├── pft/            # Main Django app
│   └── manage.py       # Django CLI
├── web/                # React frontend
│   ├── app/            # Application source
│   ├── public/         # Static assets
│   └── schema/         # API schema
└── README.md
```

---

## 🏁 Getting Started

### 📋 Prerequisites

- [Node.js](https://nodejs.org/) >= 18.x
- [Python](https://python.org/) >= 3.12
- [pnpm](https://pnpm.io/) >= 8.x
- [Poetry](https://python-poetry.org/) >= 1.7
- [Docker](https://www.docker.com/) (optional but recommended)

### 🔧 Setup Instructions

#### Option 1: Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/ashishkapoor/fintrack.git
cd fintrack

# Copy environment files
cp api/.env.example api/.env
cp web/.env.example web/.env

# Start the services
docker compose up --build
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/api/docs/

#### Option 2: Manual Setup

1. Clone the repository:
```bash
git clone https://github.com/ashishkapoor/fintrack.git
cd fintrack
```

2. Setup API (Backend):
```bash
cd api

# Install poetry if not already installed
curl -sSL https://install.python-poetry.org | python3 -

# Install dependencies
poetry install

# Setup environment variables
cp .env.example .env

# Run migrations
poetry run python manage.py migrate

# Start the development server
poetry run python manage.py runserver
```

3. Setup Web (Frontend):
```bash
cd web

# Install dependencies
pnpm install

# Setup environment variables
cp .env.example .env

# Start the development server
pnpm dev
```

---

## ⚙️ Configuration

### API Environment Variables

```env
# api/.env
DEBUG=True
SECRET_KEY=your_secure_secret_key
DATABASE_URL=postgres://user:password@localhost:5432/fintrack
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

### Web Environment Variables

```env
# web/.env
VITE_API_URL=http://localhost:8000
```

---

## 🧪 Tests

### API Tests
```bash
cd api
poetry run python manage.py test
```

### Web Tests
```bash
cd web
pnpm test
```

---

## 🧭 Feature Audit

The budgeting-core audit artifacts and prioritized roadmap live in:

- `docs/feature-audit/README.md`
- `docs/feature-audit/feature-matrix.json`
- `docs/feature-audit/prioritized-roadmap.md`
- `docs/feature-audit/parity-report.md`
- `docs/feature-audit/test-plan.md`

Run the audit validator and parity report generator:

```bash
make feature-audit
```

---

## 📤 API Documentation

The API documentation is available at:
- Swagger UI: http://localhost:8000/api/docs/
- ReDoc: http://localhost:8000/api/redoc/

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!  
Feel free to fork and submit a pull request.

---

## 📄 License

MIT License © 2025 [Sannty](https://github.com/ashishkapoor)

---

## 💡 Inspiration

FinTrack was built to give privacy-conscious users a simple but powerful way to manage their finances independently, free of subscription fees or vendor lock-in.

---

## 🙌 Support

If you find FinTrack useful, consider giving a ⭐ on GitHub or sharing it with others!

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=ashishkapoor/fintrack&type=Date)](https://www.star-history.com/#ashishkapoor/fintrack&Date)
