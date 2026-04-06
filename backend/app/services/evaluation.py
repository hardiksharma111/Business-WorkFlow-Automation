from __future__ import annotations

from app.models import EvaluationRunRequest, EvaluationRunResponse
from app.services.workflow import WorkflowEngine


class EvaluationService:
    def __init__(self, workflow_engine: WorkflowEngine) -> None:
        self._workflow_engine = workflow_engine

    def run(self, payload: EvaluationRunRequest) -> EvaluationRunResponse:
        details: list[dict[str, object]] = []
        matched = 0

        for sample in payload.samples:
            decision = self._workflow_engine.classify_only(sample.message)
            is_match = decision.intent == sample.expected_intent
            if is_match:
                matched += 1

            details.append(
                {
                    "message": sample.message,
                    "expected_intent": sample.expected_intent,
                    "predicted_intent": decision.intent,
                    "confidence": decision.confidence,
                    "match": is_match,
                }
            )

        total = len(payload.samples)
        accuracy = matched / total if total else 0.0
        return EvaluationRunResponse(total=total, matched=matched, accuracy=accuracy, details=details)
