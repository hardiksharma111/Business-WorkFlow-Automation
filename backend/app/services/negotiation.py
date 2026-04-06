from __future__ import annotations

from typing import Any, Callable, TypedDict

from langgraph.graph import END, StateGraph

from app.models import NegotiationOutcome, SellerLead, WorkflowDecision, WorkflowIntakeRequest
from app.services.llm import OllamaService
from app.services.seller_registry import SellerRegistryService


class NegotiationState(TypedDict, total=False):
    message: str
    source: str
    metadata: dict[str, Any]
    decision: dict[str, Any]
    local_sellers: list[dict[str, Any]]
    online_sellers: list[dict[str, Any]]
    reply: str
    strategy: str
    selected_seller_name: str | None
    needs_online_search: bool
    fallback_reason: str
    alternative_path: str
    summary: str
    trace: list[str]
    error_notes: list[str]


class NegotiationGraph:
    def __init__(
        self,
        classify_message: Callable[[str], WorkflowDecision],
        llm_service: OllamaService,
        seller_registry: SellerRegistryService,
    ) -> None:
        self._classify_message = classify_message
        self._llm = llm_service
        self._seller_registry = seller_registry
        self._graph = self._build_graph()

    def run(self, request: WorkflowIntakeRequest) -> tuple[WorkflowDecision, NegotiationOutcome]:
        state: NegotiationState = {
            "message": request.message,
            "source": request.source,
            "metadata": dict(request.metadata),
            "trace": ["intake_received"],
            "error_notes": [],
        }
        result = self._graph.invoke(state)
        decision = WorkflowDecision(**result["decision"])
        negotiation = NegotiationOutcome(
            reply=str(result.get("reply", "")),
            strategy=str(result.get("strategy", "negotiation")),
            selected_seller=self._resolve_seller(result.get("selected_seller_name"), result),
            local_sellers=[self._to_seller_lead(item) for item in result.get("local_sellers", [])],
            online_sellers=[self._to_seller_lead(item) for item in result.get("online_sellers", [])],
            fallback_reason=result.get("fallback_reason") or None,
            alternative_path=str(result.get("alternative_path", "Proceed with the best available seller path.")),
            trace=[str(item) for item in result.get("trace", [])],
            error_notes=[str(item) for item in result.get("error_notes", [])],
            summary=str(result.get("summary", "Negotiation completed.")),
        )
        return decision, negotiation

    def _build_graph(self):
        builder = StateGraph(NegotiationState)
        builder.add_node("classify", self._classify_node)
        builder.add_node("local_sellers", self._local_seller_node)
        builder.add_node("negotiation", self._negotiation_node)
        builder.add_node("online_referral", self._online_referral_node)
        builder.add_node("finalize", self._finalize_node)
        builder.set_entry_point("classify")
        builder.add_edge("classify", "local_sellers")
        builder.add_edge("local_sellers", "negotiation")
        builder.add_conditional_edges(
            "negotiation",
            self._route_after_negotiation,
            {
                "online_referral": "online_referral",
                "finalize": "finalize",
            },
        )
        builder.add_edge("online_referral", "finalize")
        builder.add_edge("finalize", END)
        return builder.compile()

    def _classify_node(self, state: NegotiationState) -> dict[str, Any]:
        trace = self._trace(state)
        errors = self._errors(state)
        try:
            decision = self._classify_message(state["message"])
            trace.append(f"classified:{decision.intent}")
            return {"decision": decision.model_dump(), "trace": trace, "error_notes": errors}
        except Exception as exc:
            trace.append("classification_fallback")
            errors.append(f"Classification fallback used: {exc}")
            fallback = WorkflowDecision(
                intent="general_request",
                entities={},
                confidence=0.45,
                recommended_action="triage",
                mode="manual_review",
                requires_human_approval=True,
                retrieved_context=[],
            )
            return {"decision": fallback.model_dump(), "trace": trace, "error_notes": errors}

    def _local_seller_node(self, state: NegotiationState) -> dict[str, Any]:
        trace = self._trace(state)
        errors = self._errors(state)
        decision = WorkflowDecision(**state["decision"])
        try:
            local_sellers = self._seller_registry.find_local_candidates(
                state["message"],
                state["decision"],
                state.get("metadata", {}),
                limit=3,
            )
            trace.append(f"local_sellers:{len(local_sellers)}")
            return {
                "local_sellers": [seller.model_dump() for seller in local_sellers],
                "selected_seller_name": local_sellers[0].name if local_sellers else None,
                "needs_online_search": len(local_sellers) == 0 or decision.confidence < 0.65,
                "trace": trace,
                "error_notes": errors,
            }
        except Exception as exc:
            trace.append("local_seller_fallback")
            errors.append(f"Local seller search failed: {exc}")
            return {
                "local_sellers": [],
                "selected_seller_name": None,
                "needs_online_search": True,
                "trace": trace,
                "error_notes": errors,
            }

    def _negotiation_node(self, state: NegotiationState) -> dict[str, Any]:
        trace = self._trace(state)
        errors = self._errors(state)
        decision = WorkflowDecision(**state["decision"])
        local_sellers = state.get("local_sellers", [])
        context = [getattr(match, "text", "") for match in decision.retrieved_context]

        try:
            result = self._llm.negotiate(state["message"], decision.model_dump(), context, local_sellers)
            selected_name = result.get("selected_seller_name")
            if selected_name and not self._seller_name_exists(selected_name, local_sellers):
                selected_name = local_sellers[0]["name"] if local_sellers else selected_name

            needs_online = bool(result.get("needs_online_search", False))
            if not local_sellers:
                needs_online = True

            trace.append(f"negotiation:{result.get('strategy', 'negotiation')}")
            if needs_online:
                trace.append("online_referral_requested")

            return {
                "reply": str(result.get("reply", "")),
                "strategy": str(result.get("strategy", "negotiation")),
                "selected_seller_name": selected_name,
                "needs_online_search": needs_online,
                "fallback_reason": str(result.get("fallback_reason", "")),
                "alternative_path": str(result.get("alternative_path", "")),
                "summary": str(result.get("summary", "")),
                "trace": trace,
                "error_notes": errors,
            }
        except Exception as exc:
            trace.append("negotiation_fallback")
            errors.append(f"Negotiation generation failed: {exc}")
            fallback_reply = (
                "I am keeping the request moving with the sellers I can see now. "
                "If those options cannot meet the target, I will source new sellers online and return alternatives."
            )
            return {
                "reply": fallback_reply,
                "strategy": "fallback_negotiation",
                "selected_seller_name": local_sellers[0]["name"] if local_sellers else None,
                "needs_online_search": True,
                "fallback_reason": "Negotiation model fallback used.",
                "alternative_path": "Search online sellers and continue with the best referral.",
                "summary": "Fallback negotiation path selected.",
                "trace": trace,
                "error_notes": errors,
            }

    def _route_after_negotiation(self, state: NegotiationState) -> str:
        if state.get("needs_online_search"):
            return "online_referral"
        return "finalize"

    def _online_referral_node(self, state: NegotiationState) -> dict[str, Any]:
        trace = self._trace(state)
        errors = self._errors(state)
        decision = WorkflowDecision(**state["decision"])

        try:
            online_sellers = self._seller_registry.search_online_candidates(state["message"], decision.model_dump(), limit=3)
            trace.append(f"online_sellers:{len(online_sellers)}")
            selected_name = state.get("selected_seller_name")
            if not selected_name and online_sellers:
                selected_name = online_sellers[0].name
            return {
                "online_sellers": [seller.model_dump() for seller in online_sellers],
                "selected_seller_name": selected_name,
                "fallback_reason": state.get("fallback_reason") or "Local seller coverage was thin, so online referral search was triggered.",
                "trace": trace,
                "error_notes": errors,
            }
        except Exception as exc:
            trace.append("online_referral_fallback")
            errors.append(f"Online referral search failed: {exc}")
            return {
                "online_sellers": [],
                "fallback_reason": state.get("fallback_reason") or "Online referral search failed; using the best available local answer.",
                "trace": trace,
                "error_notes": errors,
            }

    def _finalize_node(self, state: NegotiationState) -> dict[str, Any]:
        trace = self._trace(state)
        errors = self._errors(state)
        local_sellers = [self._to_seller_lead(item) for item in state.get("local_sellers", [])]
        online_sellers = [self._to_seller_lead(item) for item in state.get("online_sellers", [])]
        selected_seller = self._resolve_seller(state.get("selected_seller_name"), state)

        reply = state.get("reply", "")
        if online_sellers and "online" not in reply.lower():
            referral_names = ", ".join(seller.name for seller in online_sellers[:3])
            reply = f"{reply}\n\nI also found online seller alternatives: {referral_names}."

        if not reply:
            reply = "Negotiation completed, but no final reply was generated."

        fallback_reason = state.get("fallback_reason") or None
        summary = state.get("summary") or (
            f"Negotiation completed for {selected_seller.name if selected_seller else 'the request'} with {len(local_sellers)} local and {len(online_sellers)} online seller options."
        )
        alternative_path = state.get("alternative_path") or (
            "Proceed with the selected seller or escalate to a human reviewer if the deal needs manual approval."
        )

        trace.append("finalized")
        return {
            "reply": reply,
            "strategy": state.get("strategy", "negotiation"),
            "selected_seller_name": selected_seller.name if selected_seller else None,
            "local_sellers": [seller.model_dump() for seller in local_sellers],
            "online_sellers": [seller.model_dump() for seller in online_sellers],
            "fallback_reason": fallback_reason,
            "alternative_path": alternative_path,
            "summary": summary,
            "trace": trace,
            "error_notes": errors,
        }

    def _trace(self, state: NegotiationState) -> list[str]:
        return list(state.get("trace", []))

    def _errors(self, state: NegotiationState) -> list[str]:
        return list(state.get("error_notes", []))

    def _seller_name_exists(self, seller_name: str, sellers: list[dict[str, Any]]) -> bool:
        return any(str(seller.get("name")) == seller_name for seller in sellers)

    def _resolve_seller(self, seller_name: str | None, state: NegotiationState) -> SellerLead | None:
        if not seller_name:
            return None

        for seller in state.get("local_sellers", []):
            if str(seller.get("name")) == seller_name:
                return self._to_seller_lead(seller)

        for seller in state.get("online_sellers", []):
            if str(seller.get("name")) == seller_name:
                return self._to_seller_lead(seller)

        return None

    def _to_seller_lead(self, payload: dict[str, Any]) -> SellerLead:
        return SellerLead(
            name=str(payload.get("name", "Unknown seller")),
            category=str(payload.get("category", "referral")),
            summary=str(payload.get("summary", "")),
            origin=str(payload.get("origin", "unknown")),
            url=payload.get("url") if payload.get("url") else None,
            contact=payload.get("contact") if payload.get("contact") else None,
            confidence=float(payload.get("confidence", 0.0)),
        )
