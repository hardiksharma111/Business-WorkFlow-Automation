from __future__ import annotations

from app.models import ConnectorIngestRequest, WorkflowIntakeRequest


SUPPORTED_CONNECTORS = {"gmail", "whatsapp", "whatsapp_chrome_extension", "chrome_extension", "webhook", "manual"}


def _normalize_connector_name(connector: str) -> str:
    normalized = connector.lower().strip().replace("-", "_").replace(" ", "_")
    if normalized in {"whatsapp_chrome_extension", "chrome_extension", "whatsapp_web", "whatsapp_extension"}:
        return "whatsapp_chrome_extension"
    if normalized == "whatsappchromeextension":
        return "whatsapp_chrome_extension"
    return normalized


def to_workflow_intake(connector: str, payload: ConnectorIngestRequest) -> WorkflowIntakeRequest:
    normalized = _normalize_connector_name(connector)
    if normalized not in SUPPORTED_CONNECTORS:
        normalized = "webhook"

    metadata = dict(payload.metadata)
    metadata["connector"] = normalized

    return WorkflowIntakeRequest(
        source=normalized,
        message=payload.message,
        metadata=metadata,
    )
