from fastapi import FastAPI

from app.config import settings
from app.models import (
    HealthResponse,
    KnowledgeIngestRequest,
    KnowledgeSearchRequest,
    WorkflowDecision,
    WorkflowIntakeRequest,
)
from app.services.embeddings import EmbeddingService
from app.services.llm import OllamaService
from app.services.vector_store import VectorStoreService
from app.services.workflow import WorkflowEngine

app = FastAPI(title="Business Workflow Automation API", version="0.1.0")

embedding_service = EmbeddingService(settings.hf_embedding_model)
vector_store = VectorStoreService(settings.chroma_persist_path, settings.chroma_collection)
ollama_service = OllamaService(settings.ollama_host, settings.ollama_model)
workflow_engine = WorkflowEngine(settings, embedding_service, vector_store, ollama_service)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        services={
            "ollama": True,
            "embeddings": True,
            "chroma": True,
        },
    )


@app.post("/api/v1/knowledge/documents")
def ingest_knowledge(payload: KnowledgeIngestRequest) -> dict[str, int]:
    ids = [document.id for document in payload.documents]
    texts = [document.text for document in payload.documents]
    metadatas = [document.metadata for document in payload.documents]
    embeddings = embedding_service.embed(texts)

    vector_store.upsert_documents(ids=ids, texts=texts, embeddings=embeddings, metadatas=metadatas)
    return {"ingested": len(ids)}


@app.post("/api/v1/knowledge/search")
def search_knowledge(payload: KnowledgeSearchRequest) -> dict[str, object]:
    query_vector = embedding_service.embed([payload.query])[0]
    matches = vector_store.query(query_vector, limit=payload.limit)
    return {"matches": [match.model_dump() for match in matches]}


@app.post("/api/v1/workflows/intake", response_model=WorkflowDecision)
def workflow_intake(payload: WorkflowIntakeRequest) -> WorkflowDecision:
    return workflow_engine.process(payload)
