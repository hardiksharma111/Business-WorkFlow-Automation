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
