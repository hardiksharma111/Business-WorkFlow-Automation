from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.request
from typing import Any


class GroqService:
    def __init__(self, api_key: str, model: str, base_url: str = "https://api.groq.com/openai/v1") -> None:
        self._api_key = api_key.strip()
        self._model = model
        self._base_url = base_url.rstrip("/")
        self._timeout = 30.0

    def _api_headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self._api_key:
            headers["Authorization"] = f"Bearer {self._api_key}"
        return headers

    def _request_json(self, method: str, path: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        url = f"{self._base_url}{path}"
        data = None
        if payload is not None:
            data = json.dumps(payload).encode("utf-8")

        request = urllib.request.Request(url, data=data, headers=self._api_headers(), method=method)
        try:
            with urllib.request.urlopen(request, timeout=self._timeout) as response:
                body = response.read().decode("utf-8").strip()
        except urllib.error.HTTPError as exc:
            error_body = exc.read().decode("utf-8", errors="replace") if exc.fp else ""
            raise RuntimeError(f"Groq API request failed with status {exc.code}: {error_body or exc.reason}") from exc
        except urllib.error.URLError as exc:
            raise RuntimeError(f"Groq API request failed: {exc.reason}") from exc

        if not body:
            return {}

        return json.loads(body)

    def _chat_completion(self, prompt: str, temperature: float) -> dict[str, Any]:
        if not self._api_key:
            raise RuntimeError("GROQ_API_KEY is not configured.")

        payload = {
            "model": self._model,
            "messages": [
                {"role": "system", "content": "You output strict JSON only."},
                {"role": "user", "content": prompt},
            ],
            "temperature": temperature,
            "stream": False,
        }
        return self._request_json("POST", "/chat/completions", payload)

    def _extract_content(self, response: Any) -> str:
        if isinstance(response, dict):
            choices = response.get("choices") or []
            if choices:
                message = choices[0].get("message") or {}
                return str(message.get("content", ""))
        return ""

    def _parse_json_content(self, content: str) -> dict[str, Any]:
        cleaned = re.sub(r"^```json|```$", "", content.strip(), flags=re.MULTILINE).strip()
        return json.loads(cleaned)

    def _fallback(self, message: str) -> dict[str, Any]:
        text = message.lower()

        if any(keyword in text for keyword in ["approve", "approval", "budget"]):
            intent = "approval_request"
            action = "route_to_approver"
            confidence = 0.70
        elif any(keyword in text for keyword in ["supplier", "vendor", "purchase"]):
            intent = "procurement"
            action = "create_procurement_task"
            confidence = 0.68
        elif any(keyword in text for keyword in ["urgent", "escalate", "blocked"]):
            intent = "escalation"
            action = "escalate_issue"
            confidence = 0.72
        else:
            intent = "general_request"
            action = "triage"
            confidence = 0.56

        return {
            "intent": intent,
            "entities": {},
            "confidence": confidence,
            "recommended_action": action,
        }

    def classify(self, message: str, context: list[str]) -> dict[str, Any]:
        context_block = "\n".join(f"- {item}" for item in context[:5])

        prompt = (
            "You are an operations workflow classifier for business requests. "
            "Return only valid JSON with keys: intent, entities, confidence, recommended_action.\n\n"
            "Intent guidance:\n"
            "- general_request: greetings, small talk, or unclear requests\n"
            "- procurement: ordering, sourcing, buying, prices, quantities, vendors\n"
            "- approval_request: requests that need approval or sign-off\n"
            "- escalation: blockers, urgent issues, complaints, or incidents\n\n"
            "Examples:\n"
            "Message: how are you\n"
            "Output: {\"intent\":\"general_request\",\"entities\":{},\"confidence\":0.95,\"recommended_action\":\"triage\"}\n"
            "Message: order 50kg tomato\n"
            "Output: {\"intent\":\"procurement\",\"entities\":{\"item\":\"tomato\",\"quantity\":\"50kg\"},\"confidence\":0.96,\"recommended_action\":\"create_procurement_task\"}\n\n"
            f"Message:\n{message}\n\n"
            f"Relevant context:\n{context_block if context_block else '- none'}\n"
        )

        try:
            response = self._chat_completion(prompt, temperature=0.1)
            parsed = self._parse_json_content(self._extract_content(response))

            return {
                "intent": str(parsed.get("intent", "general_request")),
                "entities": parsed.get("entities", {}),
                "confidence": float(parsed.get("confidence", 0.5)),
                "recommended_action": str(parsed.get("recommended_action", "triage")),
            }
        except Exception:
            return self._fallback(message)

    def negotiate(
        self,
        message: str,
        decision: dict[str, Any],
        context: list[str],
        local_sellers: list[dict[str, Any]],
    ) -> dict[str, Any]:
        context_block = "\n".join(f"- {item}" for item in context[:5])
        seller_block = "\n".join(
            f"- {seller.get('name')} | {seller.get('category')} | {seller.get('summary')}"
            for seller in local_sellers[:5]
        )

        prompt = (
            "You are a negotiation agent for business workflows. "
            "Return only valid JSON with keys: reply, strategy, selected_seller_name, "
            "needs_online_search, fallback_reason, alternative_path, summary.\n\n"
            f"User message:\n{message}\n\n"
            f"Classification:\n{json.dumps(decision, ensure_ascii=False)}\n\n"
            f"Relevant context:\n{context_block if context_block else '- none'}\n\n"
            f"Local sellers:\n{seller_block if seller_block else '- none'}\n"
        )

        try:
            response = self._chat_completion(prompt, temperature=0.15)
            parsed = self._parse_json_content(self._extract_content(response))

            return {
                "reply": str(parsed.get("reply", "")),
                "strategy": str(parsed.get("strategy", "negotiation")),
                "selected_seller_name": parsed.get("selected_seller_name"),
                "needs_online_search": bool(parsed.get("needs_online_search", False)),
                "fallback_reason": str(parsed.get("fallback_reason", "")),
                "alternative_path": str(parsed.get("alternative_path", "")),
                "summary": str(parsed.get("summary", "")),
            }
        except Exception:
            return self._fallback_negotiation(message, local_sellers)

    def check_health(self) -> tuple[str, str, int | None]:
        start = time.perf_counter()
        try:
            response = self._request_json("GET", "/models")
            elapsed_ms = int((time.perf_counter() - start) * 1000)

            model_names = set(self._extract_model_names(response))

            if self._model in model_names:
                return "online", f"Groq model {self._model} is available.", elapsed_ms

            return "loading", f"Groq API reachable, but model {self._model} is not in the returned model list yet.", elapsed_ms
        except Exception as exc:
            return "offline", f"Groq API not reachable: {exc}", None

    def warmup(self) -> tuple[str, str, int | None]:
        start = time.perf_counter()
        try:
            self._chat_completion("Respond with a single word: ready.", temperature=0.0)
            elapsed_ms = int((time.perf_counter() - start) * 1000)
            return "online", f"Groq model {self._model} warmup completed.", elapsed_ms
        except Exception as exc:
            return "offline", f"Groq warmup failed: {exc}", None

    def configured_model(self) -> str:
        return self._model

    def set_configured_model(self, model_name: str) -> str:
        self._model = model_name.strip()
        return self._model

    def current_model(self) -> str:
        return self._model

    def list_models(self) -> list[str]:
        try:
            response = self._request_json("GET", "/models")
        except Exception:
            return [self._model]
        return sorted(set(self._extract_model_names(response)))

    def pull_model(self, model_name: str | None = None) -> tuple[str, str]:
        target = model_name or self._model
        self._model = target.strip()
        return "online", f"Groq model selection updated to {self._model}."

    def _extract_model_names(self, response: Any) -> list[str]:
        models: list[Any]

        if isinstance(response, dict):
            models = list(response.get("data") or response.get("models") or [])
        elif hasattr(response, "models"):
            models = list(getattr(response, "models") or [])
        else:
            models = []

        names: list[str] = []
        for model in models:
            if hasattr(model, "model"):
                name = getattr(model, "model")
            elif isinstance(model, dict):
                name = model.get("model")
            else:
                name = None

            if name:
                names.append(str(name))

        return names

    def _fallback_negotiation(self, message: str, local_sellers: list[dict[str, Any]]) -> dict[str, Any]:
        if local_sellers:
            selected = local_sellers[0].get("name") or "existing seller"
            reply = (
                f"I can start with {selected} and keep the negotiation moving. "
                "If the current seller cannot meet the terms, I will pull in online alternatives next."
            )
            summary = f"Negotiation anchored on {selected}."
            alternative_path = "Escalate to online seller search if terms fail."
            needs_online_search = len(local_sellers) < 2
        else:
            reply = (
                "No suitable seller was found in the current catalog, so I will source new options online "
                "before we continue the negotiation."
            )
            summary = "No local seller fit the request."
            alternative_path = "Search online sellers and return referral options."
            needs_online_search = True

        return {
            "reply": reply,
            "strategy": "fallback_negotiation",
            "selected_seller_name": local_sellers[0].get("name") if local_sellers else None,
            "needs_online_search": needs_online_search,
            "fallback_reason": f"Fallback negotiation used for: {message[:120]}",
            "alternative_path": alternative_path,
            "summary": summary,
        }


OllamaService = GroqService
