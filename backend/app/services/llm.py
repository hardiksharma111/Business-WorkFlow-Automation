from __future__ import annotations

import json
import re
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
