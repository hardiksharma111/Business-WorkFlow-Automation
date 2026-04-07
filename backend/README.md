# Backend MVP (FastAPI)

This backend provides a starter implementation for:

- Intent and entity extraction using Groq (legacy /api/v1/system/ollama/* routes are kept for compatibility)
- Embedding generation using a Hugging Face model (optional in deployment; fallback embeddings are available)
- Semantic memory and retrieval using ChromaDB
- Confidence-based workflow decisioning
- LangGraph negotiation routing with fallback seller referral

## Quick Start

1. Create and activate a virtual environment.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

Optional local quality upgrade for semantic embeddings:

```bash
pip install sentence-transformers==3.4.1
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

## Groq API Setup

Set `GROQ_API_KEY`, `GROQ_MODEL`, and `GROQ_BASE_URL` in `.env` or your deployment environment.

## Runtime Model Switch

To switch the backend's active Groq model without editing `.env`, call:

```http
PUT /api/v1/system/ollama/config
```

Body:

```json
{ "model": "llama-3.3-70b-versatile" }
```
