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
- `POST /api/v1/knowledge/documents`
- `POST /api/v1/knowledge/search`
- `POST /api/v1/workflows/intake`
