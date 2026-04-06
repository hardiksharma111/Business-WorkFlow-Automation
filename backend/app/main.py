import asyncio

from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.models import (
    ConnectorIngestRequest,
    ChatRunResponse,
    EvaluationRunRequest,
    EvaluationRunResponse,
    HealthResponse,
    OllamaConfigRequest,
    OllamaConfigResponse,
    KnowledgeIngestRequest,
    KnowledgeSearchRequest,
    NegotiationRunResponse,
    WorkflowAnalyticsResponse,
    WorkflowDecision,
    WorkflowIntakeRequest,
    WorkflowRunResponse,
    SystemStatusResponse,
    ServiceStatus,
    ServiceStatusHistoryItem,
    OllamaModelListResponse,
    OllamaPullRequest,
    OllamaPullResponse,
    SystemWarmupRequest,
    SystemWarmupResponse,
    PeriodicWarmupResponse,
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

embedding_service = EmbeddingService(settings.hf_embedding_model)
vector_store = VectorStoreService(settings.chroma_persist_path, settings.chroma_collection)
ollama_service = OllamaService(settings.ollama_host, settings.ollama_model)
workflow_engine = WorkflowEngine(settings, embedding_service, vector_store, ollama_service)
task_store = WorkflowTaskStore("./data/workflows.db")
evaluation_service = EvaluationService(workflow_engine)
_last_service_states: dict[str, str] = {}
_periodic_warmup_task: asyncio.Task[None] | None = None


NEGOTIATION_INTENTS = {"procurement", "approval_request"}
NEGOTIATION_KEYWORDS = {
    "negotiate",
    "negotiation",
    "supplier",
    "vendor",
    "price",
    "quote",
    "discount",
    "bulk",
    "terms",
}


def should_invoke_negotiation(payload: WorkflowIntakeRequest, decision: WorkflowDecision) -> bool:
    if bool(payload.metadata.get("force_negotiation", False)):
        return True

    if decision.intent in NEGOTIATION_INTENTS:
        return True

    text = payload.message.lower()
    return any(keyword in text for keyword in NEGOTIATION_KEYWORDS)


def get_system_status() -> SystemStatusResponse:
    ollama_state, ollama_detail, ollama_latency = ollama_service.check_health()
    embeddings_state, embeddings_detail = embedding_service.check_health()
    chroma_state, chroma_detail = vector_store.check_health()
    task_store_state, task_store_detail = task_store.check_health()

    services = [
        ServiceStatus(
            name="api",
            state="online",
            detail="Backend API is running and responding.",
            latency_ms=None,
        ),
        ServiceStatus(
            name="ollama",
            state=ollama_state,
            detail=ollama_detail,
            latency_ms=ollama_latency,
        ),
        ServiceStatus(name="embeddings", state=embeddings_state, detail=embeddings_detail),
        ServiceStatus(name="chromadb", state=chroma_state, detail=chroma_detail),
        ServiceStatus(name="task_store", state=task_store_state, detail=task_store_detail),
    ]

    for service in services:
        previous = _last_service_states.get(service.name)
        if previous != service.state:
            task_store.record_service_status(service.name, service.state, service.detail)
            _last_service_states[service.name] = service.state

    states = {service.state for service in services}
    if "offline" in states:
        overall = "offline"
    elif "loading" in states:
        overall = "loading"
    else:
        overall = "online"

    return SystemStatusResponse(overall=overall, services=services)


async def periodic_warmup_loop() -> None:
    while True:
        try:
            await asyncio.to_thread(ollama_service.warmup)
            await asyncio.to_thread(embedding_service.warmup)
            await asyncio.to_thread(get_system_status)
        except asyncio.CancelledError:
            raise
        except Exception:
            pass

        await asyncio.sleep(settings.warmup_interval_seconds)


@app.on_event("startup")
async def startup_event() -> None:
    global _periodic_warmup_task

    if settings.enable_periodic_warmup and _periodic_warmup_task is None:
        _periodic_warmup_task = asyncio.create_task(periodic_warmup_loop())


@app.on_event("shutdown")
async def shutdown_event() -> None:
    global _periodic_warmup_task

    if _periodic_warmup_task is not None:
        _periodic_warmup_task.cancel()
        try:
            await _periodic_warmup_task
        except asyncio.CancelledError:
            pass
        _periodic_warmup_task = None


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    status = get_system_status()
    is_online = {service.name: service.state != "offline" for service in status.services}

    return HealthResponse(
        status="ok" if status.overall != "offline" else "degraded",
        services=is_online,
    )


@app.get("/api/v1/system/status", response_model=SystemStatusResponse)
def system_status() -> SystemStatusResponse:
    return get_system_status()


@app.post("/api/v1/system/warmup", response_model=SystemWarmupResponse)
def system_warmup(payload: SystemWarmupRequest) -> SystemWarmupResponse:
    target = payload.target.lower().strip()
    requested = {target} if target != "all" else {"ollama", "embeddings"}

    results: list[ServiceStatus] = []

    if "ollama" in requested:
        state, detail, latency = ollama_service.warmup()
        results.append(ServiceStatus(name="ollama", state=state, detail=detail, latency_ms=latency))

    if "embeddings" in requested:
        state, detail = embedding_service.warmup()
        results.append(ServiceStatus(name="embeddings", state=state, detail=detail, latency_ms=None))

    if not results:
        raise HTTPException(status_code=400, detail="target must be one of: all, ollama, embeddings")

    return SystemWarmupResponse(target=target, results=results)


@app.get("/api/v1/system/status/history", response_model=list[ServiceStatusHistoryItem])
def system_status_history(limit: int = 100) -> list[ServiceStatusHistoryItem]:
    records = task_store.get_service_status_history(limit=limit)
    return [ServiceStatusHistoryItem(**record) for record in records]


@app.get("/api/v1/system/ollama/models", response_model=OllamaModelListResponse)
def ollama_models() -> OllamaModelListResponse:
    models = ollama_service.list_models()
    return OllamaModelListResponse(configured_model=ollama_service.configured_model(), models=models)


@app.post("/api/v1/system/ollama/pull", response_model=OllamaPullResponse)
def ollama_pull(payload: OllamaPullRequest) -> OllamaPullResponse:
    target_model = payload.model or ollama_service.configured_model()
    status, detail = ollama_service.pull_model(payload.model)
    return OllamaPullResponse(model=target_model, status=status, detail=detail)


@app.put("/api/v1/system/ollama/config", response_model=OllamaConfigResponse)
def ollama_config(payload: OllamaConfigRequest) -> OllamaConfigResponse:
    configured = ollama_service.set_configured_model(payload.model)
    task_store.record_service_status("ollama_config", "online", f"Configured model switched to {configured}.")
    return OllamaConfigResponse(
        configured_model=configured,
        status="online",
        detail=f"Configured model switched to {configured}.",
    )


@app.get("/api/v1/system/warmup/periodic", response_model=PeriodicWarmupResponse)
def periodic_warmup_status() -> PeriodicWarmupResponse:
    enabled = settings.enable_periodic_warmup
    return PeriodicWarmupResponse(
        enabled=enabled,
        interval_seconds=settings.warmup_interval_seconds,
        detail="Periodic warmup is running." if enabled else "Periodic warmup is disabled.",
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

    execution = None
    if not decision.requires_human_approval:
        execution = workflow_engine.execute(decision, payload.metadata)
        status_map = {
            "completed": "completed",
            "partial": "pending_human",
            "failed": "failed",
        }
        task = task_store.update_task(
            task.id,
            status=status_map.get(execution.final_status, task.status),
            metadata={"execution": execution.model_dump()},
        ) or task

    return WorkflowRunResponse(task=task, decision=decision, execution=execution)


@app.post("/api/v1/chat", response_model=ChatRunResponse)
def chat(payload: WorkflowIntakeRequest) -> ChatRunResponse:
    decision = workflow_engine.process(payload)

    if should_invoke_negotiation(payload, decision):
        negotiation_decision, negotiation = workflow_engine.negotiate(payload)
        enriched_metadata = dict(payload.metadata)
        enriched_metadata["route"] = "negotiation"
        enriched_metadata["negotiation"] = negotiation.model_dump()
        task_payload = WorkflowIntakeRequest(source=payload.source, message=payload.message, metadata=enriched_metadata)
        task = task_store.create_task(task_payload, negotiation_decision)
        return ChatRunResponse(
            task=task,
            decision=negotiation_decision,
            route="negotiation",
            assistant_reply=negotiation.reply,
            negotiation=negotiation,
        )

    assistant_reply = (
        f"I mapped this request to {decision.intent} with {(decision.confidence * 100):.1f}% confidence. "
        f"Recommended action: {decision.recommended_action}."
    )
    enriched_metadata = dict(payload.metadata)
    enriched_metadata["route"] = "general_ai"
    task_payload = WorkflowIntakeRequest(source=payload.source, message=payload.message, metadata=enriched_metadata)
    task = task_store.create_task(task_payload, decision)

    return ChatRunResponse(
        task=task,
        decision=decision,
        route="general_ai",
        assistant_reply=assistant_reply,
        negotiation=None,
    )


@app.post("/api/v1/negotiation/chat", response_model=NegotiationRunResponse)
def negotiation_chat(payload: WorkflowIntakeRequest) -> NegotiationRunResponse:
    decision, negotiation = workflow_engine.negotiate(payload)
    enriched_metadata = dict(payload.metadata)
    enriched_metadata["negotiation"] = negotiation.model_dump()
    request_for_task = WorkflowIntakeRequest(source=payload.source, message=payload.message, metadata=enriched_metadata)
    task = task_store.create_task(request_for_task, decision)
    return NegotiationRunResponse(task=task, decision=decision, negotiation=negotiation)


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

    execution = None
    if not decision.requires_human_approval:
        execution = workflow_engine.execute(decision, intake.metadata)
        status_map = {
            "completed": "completed",
            "partial": "pending_human",
            "failed": "failed",
        }
        task = task_store.update_task(
            task.id,
            status=status_map.get(execution.final_status, task.status),
            metadata={"execution": execution.model_dump()},
        ) or task

    return WorkflowRunResponse(task=task, decision=decision, execution=execution)


@app.post("/api/v1/evaluation/run", response_model=EvaluationRunResponse)
def run_evaluation(payload: EvaluationRunRequest) -> EvaluationRunResponse:
    return evaluation_service.run(payload)


@app.get("/api/v1/analytics/overview", response_model=WorkflowAnalyticsResponse)
def analytics_overview(limit: int = 50) -> WorkflowAnalyticsResponse:
    limit = max(1, min(limit, 100))
    return WorkflowAnalyticsResponse(**task_store.get_task_analytics(limit=limit))
