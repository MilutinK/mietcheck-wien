# Backend (FastAPI) für Railway/Fly – Build-Kontext ist der Repo-Root,
# weil die API die JSON-Daten aus data/ und frontend/public/data/ liest.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PYTHONUTF8=1
WORKDIR /srv

COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend backend
COPY data/processed data/processed
COPY frontend/public/data/mietpreise.json frontend/public/data/wohnsitztyp.json frontend/public/data/

WORKDIR /srv/backend
# Railway setzt $PORT; lokal Fallback 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
