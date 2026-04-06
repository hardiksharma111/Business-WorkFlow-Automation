# Backend MVP (FastAPI)

This backend provides a starter implementation for:

- Intent and entity extraction using Ollama
- Embedding generation using a Hugging Face model
- Semantic memory and retrieval using ChromaDB
- Confidence-based workflow decisioning

## Quick Start

1. Create and activate a virtual environment.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Copy env file and adjust values:

```bash
cp .env.example .env
```

4. Start server:

```bash
uvicorn app.main:app --reload --port 8000
```

## Endpoints

- `GET /health`
- `GET /api/v1/system/status`
- `GET /api/v1/system/status/history`
- `POST /api/v1/system/warmup`
- `GET /api/v1/system/ollama/models`
- `POST /api/v1/system/ollama/pull`
- `POST /api/v1/knowledge/documents`
- `POST /api/v1/knowledge/search`
- `POST /api/v1/workflows/intake`
- `POST /api/v1/workflows/intake-and-create`
- `GET /api/v1/workflows/tasks`
- `PATCH /api/v1/workflows/tasks/{task_id}`
- `POST /api/v1/connectors/{connector}/ingest`
- `POST /api/v1/evaluation/run`

## Ollama Local Pull

Run this on the same machine where the backend API is running (your local Windows PC in this setup):

```powershell
ollama pull llama3.2:3b
```

You can run it from any directory in terminal, as long as the `ollama` command is installed and available in PATH.
