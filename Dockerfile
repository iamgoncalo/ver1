# Versuni Intelligence Machine - one container, one service, one public URL.
# Stage 1 builds the React/Vite frontend; stage 2 runs FastAPI serving both
# the API and the built frontend from committed frozen evidence. The 30GB
# Amazon acquisition path is never run here - production reads only the
# already-committed real data under "2. Extra Project/data/".

FROM node:20-slim AS webbuild
WORKDIR /build
COPY ["2. Extra Project/web/package.json", "2. Extra Project/web/package-lock.json", "./"]
RUN npm ci
COPY ["2. Extra Project/web/", "./"]
RUN npm run build

FROM python:3.11-slim
WORKDIR /app

# Runtime deps only - streamlit (local analyst tool) deliberately excluded.
COPY ["2. Extra Project/requirements.txt", "/tmp/requirements.txt"]
RUN grep -vE "^streamlit" /tmp/requirements.txt > /tmp/req-prod.txt \
    && pip install --no-cache-dir -r /tmp/req-prod.txt

# Application code + frozen real data (no formal-case folder needed at runtime).
COPY ["2. Extra Project/api/", "api/"]
COPY ["2. Extra Project/src/", "src/"]
COPY ["2. Extra Project/scripts/", "scripts/"]
COPY ["2. Extra Project/data/", "data/"]
COPY ["2. Extra Project/deliverables/", "deliverables/"]
COPY --from=webbuild /build/dist web/dist

EXPOSE 8000
CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
