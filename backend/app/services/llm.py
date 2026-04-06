from __future__ import annotations

import json
import re
import time
from typing import Any

from ollama import Client


class OllamaService:
    def __init__(self, host: str, model: str) -> None:
        self._client = Client(host=host)
        self._model = model

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
            "You are an operations workflow classifier. "
            "Return only valid JSON with keys: intent, entities, confidence, recommended_action.\n\n"
            f"Message:\n{message}\n\n"
            f"Relevant context:\n{context_block if context_block else '- none'}\n"
        )

        try:
            response = self._client.chat(
                model=self._model,
                messages=[
                    {"role": "system", "content": "You output strict JSON only."},
                    {"role": "user", "content": prompt},
                ],
                options={"temperature": 0.1},
            )
            content = response["message"]["content"].strip()
            content = re.sub(r"^```json|```$", "", content, flags=re.MULTILINE).strip()
            parsed = json.loads(content)

            return {
                "intent": str(parsed.get("intent", "general_request")),
                "entities": parsed.get("entities", {}),
                "confidence": float(parsed.get("confidence", 0.5)),
                "recommended_action": str(parsed.get("recommended_action", "triage")),
            }
        except Exception:
            return self._fallback(message)

    def check_health(self) -> tuple[str, str, int | None]:
        start = time.perf_counter()
        try:
            response = self._client.list()
            elapsed_ms = int((time.perf_counter() - start) * 1000)

            model_names = set(self._extract_model_names(response))

            if self._model in model_names:
                return "online", f"Model {self._model} is available.", elapsed_ms

            return "loading", f"Ollama reachable, but model {self._model} is not pulled yet.", elapsed_ms
        except Exception as exc:
            return "offline", f"Ollama not reachable: {exc}", None

    def warmup(self) -> tuple[str, str, int | None]:
        start = time.perf_counter()
        try:
            self._client.chat(
                model=self._model,
                messages=[
                    {"role": "system", "content": "Respond with a single word: ready."},
                    {"role": "user", "content": "warmup"},
                ],
                options={"temperature": 0},
            )
            elapsed_ms = int((time.perf_counter() - start) * 1000)
            return "online", f"Ollama model {self._model} warmup completed.", elapsed_ms
        except Exception as exc:
            return "offline", f"Ollama warmup failed: {exc}", None

    def configured_model(self) -> str:
        return self._model

    def list_models(self) -> list[str]:
        response = self._client.list()
        return sorted(set(self._extract_model_names(response)))

    def pull_model(self, model_name: str | None = None) -> tuple[str, str]:
        target = model_name or self._model
        try:
            self._client.pull(model=target, stream=False)
            return "online", f"Model {target} pulled successfully."
        except Exception as exc:
            return "offline", f"Failed to pull model {target}: {exc}"

    def _extract_model_names(self, response: Any) -> list[str]:
        models: list[Any]

        if hasattr(response, "models"):
            models = list(getattr(response, "models") or [])
        elif isinstance(response, dict):
            models = list(response.get("models") or [])
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
