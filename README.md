# Business Workflow Automation

A polished Next.js template for business workflow automation products and service pages.

## Start Here

- Main project brief: `PROJECT_BLUEPRINT.md`

## Implementation Status

- Frontend: Next.js dashboard home is implemented with a live AI chat console.
- Backend: FastAPI MVP has been added in `backend/` with Ollama, Hugging Face embeddings, ChromaDB, and LangGraph negotiation routing.
- Operations Dashboard: Live monitoring page is available at `/operations`.
- Chat Intake: The home dashboard now sends WhatsApp Chrome-extension style messages to the AI chat API, and negotiation activates only when needed.

## Progress Snapshot

- 2026-04-07: Added LangGraph negotiation flow with local-seller-first and online referral fallback.
- 2026-04-07: Added `POST /api/v1/chat` as the default AI route with conditional negotiation fallback.
- 2026-04-07: Updated dashboard UI to use normal AI chat path and show negotiation details only when triggered.
- 2026-04-07: Completed Phase 2 execution layer with step-by-step workflow execution, fallback actions, and status updates for `intake-and-create` and connector ingestion.
- 2026-04-07: Started Phase 3 observability with workflow analytics and dashboard telemetry panels.

## Frontend API Integration

- Set `NEXT_PUBLIC_API_BASE` to the backend URL (default is `http://localhost:8000`).
- Example on Windows PowerShell before `npm run dev`:

```powershell
$env:NEXT_PUBLIC_API_BASE="http://localhost:8000"
```

## Backend Quick Start

1. Open `backend/`.
2. Create a Python virtual environment and activate it.
3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Copy env values:

```bash
cp .env.example .env
```

5. Run API:

```bash
uvicorn app.main:app --reload --port 8000
```

## Backend Endpoints

- `GET /health`
- `POST /api/v1/chat`
- `POST /api/v1/negotiation/chat`
- `POST /api/v1/knowledge/documents`
- `POST /api/v1/knowledge/search`
- `POST /api/v1/workflows/intake`

## Stack

- Next.js 16
- React 19
- TypeScript
- ESLint

## Scripts

- `npm run dev` - start the development server
- `npm run build` - create a production build
- `npm run lint` - run ESLint
- `npm run start` - run the production server
