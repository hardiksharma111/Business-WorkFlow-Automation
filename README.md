# Business Workflow Automation

Business Workflow Automation is a chat-first operations platform that turns unstructured business messages into structured actions with human approval controls.

The app is built for fast demos and practical execution:
- Chat-first command center UX
- AI routing and negotiation fallback
- Approval-ready action flow
- Live system observability

## Architecture

- Frontend: Next.js 16 + React 19 + TypeScript
- Backend: FastAPI + Python
- AI Services: Ollama, Hugging Face embeddings, ChromaDB
- Workflow Engine: intent routing, negotiation handling, execution fallback

## Repository Structure

- `frontend/`: primary frontend source (app routes and components)
- `src/`: compatibility bridge for existing path expectations
- `backend/`: API, workflow logic, services, and data store
- `scripts/`: local startup and shutdown helpers

## Local Development

### Prerequisites

- Node.js 20+
- Python 3.11+
- Windows PowerShell (for provided scripts)
- Optional: local Ollama runtime for full AI behavior

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

Expected URLs:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000

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

### Ollama unavailable

- Core app can still run with fallback behavior
- For full local model features, start Ollama and pull configured models

## Notes

- Keep `frontend/` as the primary UI source.
- Use `src/` bridge files only for compatibility unless intentionally removing that bridge.
