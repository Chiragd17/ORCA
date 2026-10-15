# ORCA Setup & Local Development Guide (Phase 1 Baseline)

## Prerequisites

- **Python**: Version 3.11 or 3.12
- **Node.js**: Version 20 or 24 (npm v10+)
- **PostgreSQL**: Version 15+ (local instance for development)
- **Git**: Installed and configured

---

## 1. Environment Configuration

Copy `.env.example` to `.env` in the project root:

```bash
cp .env.example .env
```

Configure the environment variables in `.env`:
- `DATABASE_URL`: Connection string for your local PostgreSQL instance:
  `postgresql+psycopg://orca_user:orca_password@localhost:5432/orca_db`
- `GROQ_API_KEY`: Groq API key (Primary LLM provider).
- `GEMINI_API_KEY`: Gemini API key (Secondary LLM provider).
- `OPENROUTER_API_KEY`: Optional fallback provider key.

*(Note: Phase 1 core services and health checks run without requiring live external LLM keys)*.

---

## 2. Backend Setup

```powershell
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment:
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# Linux / macOS:
# source .venv/bin/activate

# Install dependencies (choose one):
pip install -r requirements.txt
# Or editable mode:
# pip install -e ".[dev]"

# Apply database migrations to your local PostgreSQL instance:
alembic upgrade head

# Start FastAPI development server on port 8000:
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Verify backend health at: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health) or Swagger API docs at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

---

## 3. Frontend Setup

```powershell
# Open a second terminal and navigate to frontend directory
cd frontend

# Install npm dependencies
npm install

# Start the Vite development server on port 5173
npm run dev -- --host 127.0.0.1 --port 5173
```

Open the application in your browser: [http://127.0.0.1:5173](http://127.0.0.1:5173).

---

## 4. Full-Stack Verification & Sanity Checks

### Check System Environment
```powershell
python scripts/check_environment.py
```

### Run Backend Unit & API Integration Tests
```powershell
cd backend
python -m pytest tests/
```

### Run Frontend Production Build & Type Check
```powershell
cd frontend
npm run build
```

---

## 5. Truthful Health & Connectivity Reporting
- The top navigation bar includes a live system indicator connected to `GET /health`.
- **API Status**: Displays `API LIVE` when backend is accessible, `API OFFLINE` if unreachable.
- **DB Status**: Truthfully tests database connectivity. Displays `DB LIVE` when PostgreSQL is connected, or `DB NO-CONN` when disconnected.
- Click the refresh icon next to the indicator to trigger an on-demand health check.
