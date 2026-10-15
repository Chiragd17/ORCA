# ORCA Setup & Local Development Guide

## Prerequisites

- **Python**: Version 3.11 or 3.12
- **Node.js**: Version 20 or 22 (npm v10+)
- **PostgreSQL**: Version 15+ (with PostGIS optional if available)
- **Git**: Installed and configured

---

## 1. Environment Setup

Copy `.env.example` to `.env` in the project root:

```bash
cp .env.example .env
```

Ensure you update:
- `DATABASE_URL`: Connection string for your local or shared PostgreSQL database.
- `GROQ_API_KEY`: API key for Groq (Primary LLM provider).
- `GEMINI_API_KEY`: API key for Gemini (Secondary LLM provider).
- `OPENROUTER_API_KEY`: Optional fallback provider key.

---

## 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# Linux/macOS:
# source .venv/bin/activate

# Install dependencies in editable mode
pip install -e .

# Run database migrations
alembic upgrade head

# Start the development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Verify backend health at: [http://localhost:8000/health](http://localhost:8000/health) or interactive Swagger docs at [http://localhost:8000/docs](http://localhost:8000/docs).

---

## 3. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install npm dependencies
npm install

# Run the Vite development server
npm run dev
```

Access the frontend application at: [http://localhost:5173](http://localhost:5173).

---

## 4. Verification and Sanity Checks

Run the environment verification script to check your local configuration:

```bash
python scripts/check_environment.py
```

Run test suite:

```bash
cd backend
pytest
```
