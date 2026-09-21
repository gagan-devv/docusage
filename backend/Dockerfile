# syntax=docker/dockerfile:1.4

# Stage 1: Fast virtual environment build using uv and BuildKit cache
FROM python:3.12-slim AS builder

WORKDIR /app

# Copy official standalone uv binary
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Create isolated virtual environment
RUN uv venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .

# Install dependencies into /opt/venv with host-persisted uv cache mount
RUN --mount=type=cache,target=/root/.cache/uv \
    uv pip install -r requirements.txt

# Stage 2: Minimal runtime image
FROM python:3.12-slim AS runner

WORKDIR /app

ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv

# Copy application source
COPY . .

EXPOSE 8000

CMD ["uvicorn", "src.backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]