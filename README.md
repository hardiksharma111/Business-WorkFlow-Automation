# Business Workflow Automation

Business Workflow Automation is a chat-first operations platform that turns unstructured business messages into structured actions with human approval controls.

The app is built for fast demos and practical execution:
- Chat-first command center UX
- AI routing and negotiation fallback
- Approval-ready action flow
- Live system observability

## Architecture

- Frontend (UI and web app):
	- Next.js 16 (App Router)
	- React 19
	- TypeScript 5
	- CSS modules via global stylesheet (`frontend/app/globals.css`)
	- ESLint 9 + `eslint-config-next`
- Backend (API and orchestration):
	- Python 3.11+
	- FastAPI
	- Uvicorn (`uvicorn[standard]`)
	- Pydantic Settings (`pydantic-settings`) for env/config management
	- LangGraph (negotiation graph path)
	- ChromaDB (vector storage)
	- Groq API for chat/completion inference
	- python-dotenv for local environment loading
- Workflow Engine: intent routing, negotiation handling, execution fallback

### LangGraph Status (Current)

- LangGraph is currently used in the negotiation path (`backend/app/services/negotiation.py`) to orchestrate:
	- classify -> local seller search -> negotiation -> optional online referral -> finalize.
- The rest of the workflow engine (intake, decisioning, execution, task status updates) is implemented as direct service logic in FastAPI/Python.
- Planned expansion: move more end-to-end workflow orchestration into graph-based flows after deployment stabilization.

## Repository Structure

- `frontend/`: primary frontend source (app routes and components)
- `src/`: compatibility bridge for existing path expectations
- `backend/`: API, workflow logic, services, and data store
- `scripts/`: local startup and shutdown helpers

## Submission Docs

- `docs/REPO_STRUCTURE.md`: quick folder ownership and monorepo map
- `docs/DEPLOYMENT_VERCEL_RAILWAY.md`: deployment checklist
- `docs/CODE_QUALITY_AND_SECURITY.md`: quality/security notes for analyzers

## Local Development

### Prerequisites

- Node.js 20+
- Python 3.11+
- Windows PowerShell (for provided scripts)
- Optional: Groq API key for live AI behavior

### 1. Install Frontend Dependencies

```powershell
npm install
```

### 2. Set Up Backend Environment

```powershell
cd backend
..\.venv\Scripts\python.exe -m pip install -r requirements.txt
copy .env.example .env
cd ..
```

### 3. Start Full Stack

```powershell
npm run dev:up
```

Expected URL:
https://business-work-flow-automation-8xqicscww.vercel.app/

### 4. Stop Full Stack

```powershell
npm run dev:down
```

## NPM Scripts

- `npm run dev`: start Next.js app only
- `npm run dev:up`: clean ports and start backend + frontend
- `npm run dev:down`: stop listeners on ports 3000 and 8000
- `npm run build`: production frontend build
- `npm run lint`: run ESLint
- `npm run test:api:smoke`: backend smoke tests
- `npm run test:api:regression`: backend regression tests

## Deployment (Vercel + Railway)

### Free Tier Reality

- Vercel: Hobby plan is free for personal/non-commercial use and is usually enough for demos.
- Railway: no long-running fully free tier. It typically provides trial credits, then becomes paid.

If you need fully free backend hosting after trial, consider Render/Fly alternatives.

### 1. Deploy Backend First (Railway)

1. Create a Railway project from this repo, backend service rooted at `backend/`.
2. Set start command:
	- `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Add environment variables (Railway service settings):
	- `GROQ_API_KEY`
	- `GROQ_MODEL`
	- `GROQ_BASE_URL`
	- `HF_EMBEDDING_MODEL`
	- `CHROMA_PERSIST_PATH`
	- `CHROMA_COLLECTION`
	- `AUTO_EXECUTE_THRESHOLD`
	- `SUGGEST_ONLY_THRESHOLD`
	- `CORS_ORIGINS` (comma-separated; include Vercel URL)
4. Deploy and confirm API health at `/health` and `/api/v1/system/status`.

### 2. Deploy Frontend (Vercel)

1. Import this repo in Vercel.
2. Set project root to repository root (Next app is already configured here).
3. Add environment variable:
	- `NEXT_PUBLIC_API_BASE=https://<your-railway-api-domain>`
4. Deploy and verify routes: `/`, `/settings`, `/vendors`, `/storage`.

### 3. CORS for Production

Set backend `CORS_ORIGINS` to include your Vercel production URL (and preview URL pattern if needed), for example:

`CORS_ORIGINS=https://your-app.vercel.app,http://localhost:3000`

## Backend API Highlights

- `GET /health`
- `GET /api/v1/system/status`
- `GET /api/v1/system/status/history`
- `GET /api/v1/system/ollama/models`
- `POST /api/v1/chat`
- `POST /api/v1/negotiation/chat`
- `POST /api/v1/workflows/intake-and-create`
- `GET /api/v1/workflows/tasks`
- `PATCH /api/v1/workflows/tasks/{task_id}`
- `GET /api/v1/analytics/overview`

## Demo Flow

For a judge-friendly flow, use the command center demo panel:
1. Enter an unstructured message
2. Run the staged AI reasoning sequence
3. Review the generated action card
4. Approve or reject the proposed action

This demonstrates the core value clearly: unstructured input to structured execution with oversight.

## Troubleshooting

### Backend does not start

- Run `npm run dev:down`
- Confirm no stale process is holding port 8000
- Start again with `npm run dev:up`

### Frontend cannot reach backend

- Verify backend health at `http://localhost:8000/api/v1/system/status`
- Confirm `NEXT_PUBLIC_API_BASE` is set to `http://localhost:8000`

### AI model unavailable

- Core app can still run with fallback behavior if Groq is unavailable
- For full AI behavior, set `GROQ_API_KEY` and ensure `GROQ_MODEL` is valid

## Notes

- Keep `frontend/` as the primary UI source.
- Use `src/` bridge files only for compatibility unless intentionally removing that bridge.
