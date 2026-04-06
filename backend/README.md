# Backend MVP (FastAPI)

This backend provides a starter implementation for:

- Intent and entity extraction using Ollama
- Embedding generation using a Hugging Face model
- Semantic memory and retrieval using ChromaDB
- Confidence-based workflow decisioning
- LangGraph negotiation routing with fallback seller referral

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
- `GET /api/v1/system/warmup/periodic`
- `GET /api/v1/system/ollama/models`
- `POST /api/v1/system/ollama/pull`
- `PUT /api/v1/system/ollama/config`
- `POST /api/v1/knowledge/documents`
- `POST /api/v1/knowledge/search`
- `POST /api/v1/chat`
- `POST /api/v1/workflows/intake`
- `POST /api/v1/workflows/intake-and-create`
- `POST /api/v1/negotiation/chat`
- `GET /api/v1/workflows/tasks`
- `PATCH /api/v1/workflows/tasks/{task_id}`
- `POST /api/v1/connectors/{connector}/ingest`
- `POST /api/v1/evaluation/run`

## Negotiation Flow

The negotiation endpoint is designed for messages coming from a WhatsApp Chrome extension or other chat source.

It will:

- classify the request with the workflow engine,
- look for local seller matches first,
- draft a negotiation reply with LangGraph,
- search online for new seller referrals if the local seller pool is thin,
- return the selected seller, alternatives, and fallback path in one response.

## Phase 2 Execution (Completed)

`POST /api/v1/workflows/intake-and-create` and `POST /api/v1/connectors/{connector}/ingest` now run a workflow execution layer for auto-executable tasks.

- Supports approval, procurement, escalation, and general workflows.
- Executes multiple steps per workflow.
- Uses fallback actions when a primary step fails.
- Persists execution summary in task metadata and updates task status (`completed`, `pending_human`, or `failed`).

## Ollama Local Pull

Run this on the same machine where the backend API is running (your local Windows PC in this setup):

```powershell
ollama pull llama3.2:3b
```

You can run it from any directory in terminal, as long as the `ollama` command is installed and available in PATH.

## Runtime Model Switch

To switch the backend's active Ollama model without editing `.env`, call:

```http
PUT /api/v1/system/ollama/config
```

Body:

```json
{ "model": "gemma3:4b" }
```
