from __future__ import annotations

from app.models import ConnectorIngestRequest, WorkflowIntakeRequest


SUPPORTED_CONNECTORS = {"gmail", "whatsapp", "webhook", "manual"}


def to_workflow_intake(connector: str, payload: ConnectorIngestRequest) -> WorkflowIntakeRequest:
    normalized = connector.lower().strip()
    if normalized not in SUPPORTED_CONNECTORS:
        normalized = "webhook"

    metadata = dict(payload.metadata)
    metadata["connector"] = normalized

    return WorkflowIntakeRequest(
        source=normalized,
        message=payload.message,
        metadata=metadata,
    )
