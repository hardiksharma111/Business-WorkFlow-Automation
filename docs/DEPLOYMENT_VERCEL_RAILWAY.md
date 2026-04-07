# Deployment Guide (Vercel + Railway)

## 1. Deploy Backend (Railway)

1. Create a Railway service from this repo with root set to `backend/`.
2. Start command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

3. Set environment variables using `backend/.env.example` as baseline.
4. Set `CORS_ORIGINS` with explicit origins, for example:

```text
https://your-app.vercel.app,http://localhost:3000
```

5. Verify:
- `/health`
- `/api/v1/system/status`

## 2. Deploy Frontend (Vercel)

1. Import this repository in Vercel.
2. Use root project settings for Next.js.
3. Set:

```text
NEXT_PUBLIC_API_BASE=https://your-backend.up.railway.app
```

4. Deploy and verify:
- `/`
- `/settings`
- `/vendors`
- `/storage`

## 3. Production Checks

- Confirm frontend can call backend without CORS errors.
- Confirm `/api/v1/chat` and workflow task endpoints respond.
- Confirm settings page status cards load from deployed API.

## Free Tier Note

- Vercel Hobby is free for personal/hobby workloads.
- Railway usually uses trial credits and is not a permanent free backend tier.
