# Repository Structure

This repository is a single monorepo with two runtimes.

## Ownership

- Frontend app (Next.js UI): `frontend/`
- Backend app (FastAPI API + workflow logic): `backend/`
- Compatibility bridge (re-exports): `src/`
- Local dev scripts: `scripts/`

## Practical Rule

- If a file renders pages/components, it belongs to frontend.
- If a file exposes API routes/services/models, it belongs to backend.

## Suggested Submission View

- Keep feature implementation under `frontend/` and `backend/`.
- Keep `src/` bridge thin (or remove after migration is complete).
- Keep docs in `docs/` for quick reviewer navigation.

## High-Level Tree

```text
.
|-- backend/
|   |-- app/
|   |-- requirements.txt
|   |-- .env.example
|-- frontend/
|   |-- app/
|   |-- components/
|   |-- lib/
|-- src/                 # compatibility bridge layer
|-- scripts/
|-- docs/
|-- README.md
|-- PROJECT_BLUEPRINT.md
```
