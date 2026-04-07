from __future__ import annotations

from app.config import Settings
from app.models import WorkflowDecision, WorkflowExecutionResult, WorkflowIntakeRequest
from app.services.embeddings import EmbeddingService
from app.services.execution import WorkflowExecutionService
from app.services.llm import GroqService
from app.services.negotiation import NegotiationGraph
from app.services.seller_registry import SellerRegistryService
from app.services.vector_store import VectorStoreService


class WorkflowEngine:
    def __init__(
        self,
        settings: Settings,
        embedding_service: EmbeddingService,
        vector_store: VectorStoreService,
        llm_service: GroqService,
    ) -> None:
        self._settings = settings
        self._embeddings = embedding_service
        self._vector_store = vector_store
        self._llm = llm_service
        self._seller_registry = SellerRegistryService()
        self._execution = WorkflowExecutionService()
        self._negotiation_graph = NegotiationGraph(self.classify_only, self._llm, self._seller_registry)

    def _select_mode(self, confidence: float) -> tuple[str, bool]:
        if confidence >= self._settings.auto_execute_threshold:
            return "auto_execute", False
        if confidence >= self._settings.suggest_only_threshold:
            return "suggest", True
        return "manual_review", True

    def classify_only(self, message: str) -> WorkflowDecision:
        query_vector = self._embeddings.embed([message])[0]
        matches = self._vector_store.query(query_vector, limit=5)
        context_texts = [match.text for match in matches]

        llm_result = self._llm.classify(message, context_texts)
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

    def process(self, request: WorkflowIntakeRequest) -> WorkflowDecision:
        return self.classify_only(request.message)

    def negotiate(self, request: WorkflowIntakeRequest):
        return self._negotiation_graph.run(request)

    def execute(self, decision: WorkflowDecision, metadata: dict[str, object]) -> WorkflowExecutionResult:
        return self._execution.run(decision, metadata)
