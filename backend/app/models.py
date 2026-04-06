from typing import Any

from pydantic import BaseModel, Field


class KnowledgeDocument(BaseModel):
    id: str
    text: str = Field(min_length=1)
    metadata: dict[str, Any] = Field(default_factory=dict)


class KnowledgeIngestRequest(BaseModel):
    documents: list[KnowledgeDocument]


class KnowledgeSearchRequest(BaseModel):
    query: str = Field(min_length=1)
    limit: int = Field(default=5, ge=1, le=20)


class KnowledgeMatch(BaseModel):
    id: str
    text: str
    score: float
    metadata: dict[str, Any]


class WorkflowIntakeRequest(BaseModel):
    source: str = Field(default="manual")
    message: str = Field(min_length=1)
    metadata: dict[str, Any] = Field(default_factory=dict)


class WorkflowDecision(BaseModel):
    intent: str
    entities: dict[str, Any]
    confidence: float
    recommended_action: str
    mode: str
    requires_human_approval: bool
    retrieved_context: list[KnowledgeMatch]


class WorkflowStepResult(BaseModel):
    name: str
    action: str
    status: str
    note: str
    used_fallback: bool = False


class WorkflowExecutionResult(BaseModel):
    workflow: str
    final_status: str
    started_at: str
    ended_at: str
    used_alternative_path: bool
    steps: list[WorkflowStepResult]
    summary: str


class HealthResponse(BaseModel):
    status: str
    services: dict[str, bool]


class ConnectorIngestRequest(BaseModel):
    source: str = Field(min_length=1)
    message: str = Field(min_length=1)
    metadata: dict[str, Any] = Field(default_factory=dict)


class WorkflowTask(BaseModel):
    id: str
    source: str
    message: str
    intent: str
    confidence: float
    mode: str
    status: str
    recommended_action: str
    requires_human_approval: bool
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: str
    updated_at: str


class WorkflowRunResponse(BaseModel):
    task: WorkflowTask
    decision: WorkflowDecision
    execution: WorkflowExecutionResult | None = None


class SellerLead(BaseModel):
    name: str
    category: str
    summary: str
    origin: str
    url: str | None = None
    contact: str | None = None
    confidence: float = 0.0


class NegotiationOutcome(BaseModel):
    reply: str
    strategy: str
    selected_seller: SellerLead | None = None
    local_sellers: list[SellerLead] = Field(default_factory=list)
    online_sellers: list[SellerLead] = Field(default_factory=list)
    fallback_reason: str | None = None
    alternative_path: str
    trace: list[str] = Field(default_factory=list)
    error_notes: list[str] = Field(default_factory=list)
    summary: str


class NegotiationRunResponse(BaseModel):
    task: WorkflowTask
    decision: WorkflowDecision
    negotiation: NegotiationOutcome


class ChatRunResponse(BaseModel):
    task: WorkflowTask
    decision: WorkflowDecision
    route: str
    assistant_reply: str
    negotiation: NegotiationOutcome | None = None


class WorkflowStatusUpdateRequest(BaseModel):
    status: str = Field(min_length=1)


class EvaluationSample(BaseModel):
    message: str = Field(min_length=1)
    expected_intent: str = Field(min_length=1)


class EvaluationRunRequest(BaseModel):
    samples: list[EvaluationSample] = Field(min_length=1)


class EvaluationRunResponse(BaseModel):
    total: int
    matched: int
    accuracy: float
    details: list[dict[str, Any]]


class ServiceStatus(BaseModel):
    name: str
    state: str
    detail: str
    latency_ms: int | None = None


class SystemStatusResponse(BaseModel):
    overall: str
    services: list[ServiceStatus]


class SystemWarmupRequest(BaseModel):
    target: str = Field(default="all")


class SystemWarmupResponse(BaseModel):
    target: str
    results: list[ServiceStatus]


class OllamaModelListResponse(BaseModel):
    configured_model: str
    models: list[str]


class OllamaPullRequest(BaseModel):
    model: str | None = None


class OllamaPullResponse(BaseModel):
    model: str
    status: str
    detail: str


class OllamaConfigRequest(BaseModel):
    model: str = Field(min_length=1)


class OllamaConfigResponse(BaseModel):
    configured_model: str
    status: str
    detail: str


class PeriodicWarmupResponse(BaseModel):
    enabled: bool
    interval_seconds: int
    detail: str


class ServiceStatusHistoryItem(BaseModel):
    service: str
    state: str
    detail: str
    changed_at: str
