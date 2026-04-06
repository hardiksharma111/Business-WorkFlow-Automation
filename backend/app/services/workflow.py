from __future__ import annotations

from app.config import Settings
from app.models import WorkflowDecision, WorkflowIntakeRequest
from app.services.embeddings import EmbeddingService
from app.services.llm import OllamaService
from app.services.vector_store import VectorStoreService


class WorkflowEngine:
    def __init__(
        self,
        settings: Settings,
        embedding_service: EmbeddingService,
        vector_store: VectorStoreService,
        llm_service: OllamaService,
    ) -> None:
        self._settings = settings
        self._embeddings = embedding_service
        self._vector_store = vector_store
        self._llm = llm_service

    def _select_mode(self, confidence: float) -> tuple[str, bool]:
        if confidence >= self._settings.auto_execute_threshold:
            return "auto_execute", False
        if confidence >= self._settings.suggest_only_threshold:
            return "suggest", True
        return "manual_review", True

    def process(self, request: WorkflowIntakeRequest) -> WorkflowDecision:
        query_vector = self._embeddings.embed([request.message])[0]
        matches = self._vector_store.query(query_vector, limit=5)
        context_texts = [match.text for match in matches]

        llm_result = self._llm.classify(request.message, context_texts)

        confidence = max(0.0, min(1.0, float(llm_result["confidence"])))
        mode, requires_human = self._select_mode(confidence)

        return WorkflowDecision(
            intent=llm_result["intent"],
            entities=llm_result.get("entities", {}),
            confidence=confidence,
            recommended_action=llm_result["recommended_action"],
            mode=mode,
            requires_human_approval=requires_human,
            retrieved_context=matches,
        )
