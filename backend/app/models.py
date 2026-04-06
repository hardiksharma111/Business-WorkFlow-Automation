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
