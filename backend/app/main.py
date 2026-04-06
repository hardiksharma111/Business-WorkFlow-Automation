from fastapi import FastAPI
from fastapi import HTTPException

from app.config import settings
from app.models import (
    ConnectorIngestRequest,
    EvaluationRunRequest,
    EvaluationRunResponse,
    HealthResponse,
    KnowledgeIngestRequest,
    KnowledgeSearchRequest,
    WorkflowDecision,
    WorkflowIntakeRequest,
    WorkflowRunResponse,
    WorkflowStatusUpdateRequest,
    WorkflowTask,
)
from app.services.connectors import to_workflow_intake
from app.services.embeddings import EmbeddingService
from app.services.evaluation import EvaluationService
from app.services.llm import OllamaService
from app.services.task_store import WorkflowTaskStore
from app.services.vector_store import VectorStoreService
from app.services.workflow import WorkflowEngine

app = FastAPI(title="Business Workflow Automation API", version="0.1.0")

embedding_service = EmbeddingService(settings.hf_embedding_model)
vector_store = VectorStoreService(settings.chroma_persist_path, settings.chroma_collection)
ollama_service = OllamaService(settings.ollama_host, settings.ollama_model)
workflow_engine = WorkflowEngine(settings, embedding_service, vector_store, ollama_service)
task_store = WorkflowTaskStore("./data/workflows.db")
evaluation_service = EvaluationService(workflow_engine)


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


@app.post("/api/v1/workflows/intake-and-create", response_model=WorkflowRunResponse)
def workflow_intake_and_create(payload: WorkflowIntakeRequest) -> WorkflowRunResponse:
    decision = workflow_engine.process(payload)
    task = task_store.create_task(payload, decision)
    return WorkflowRunResponse(task=task, decision=decision)


@app.get("/api/v1/workflows/tasks", response_model=list[WorkflowTask])
def list_workflow_tasks(limit: int = 50) -> list[WorkflowTask]:
    return task_store.list_tasks(limit=limit)


@app.patch("/api/v1/workflows/tasks/{task_id}", response_model=WorkflowTask)
def update_workflow_task(task_id: str, payload: WorkflowStatusUpdateRequest) -> WorkflowTask:
    updated = task_store.update_status(task_id, payload.status)
    if not updated:
        raise HTTPException(status_code=404, detail="Task not found")
    return updated


@app.post("/api/v1/connectors/{connector}/ingest", response_model=WorkflowRunResponse)
def ingest_from_connector(connector: str, payload: ConnectorIngestRequest) -> WorkflowRunResponse:
    intake = to_workflow_intake(connector, payload)
    decision = workflow_engine.process(intake)
    task = task_store.create_task(intake, decision)
    return WorkflowRunResponse(task=task, decision=decision)


@app.post("/api/v1/evaluation/run", response_model=EvaluationRunResponse)
def run_evaluation(payload: EvaluationRunRequest) -> EvaluationRunResponse:
    return evaluation_service.run(payload)
