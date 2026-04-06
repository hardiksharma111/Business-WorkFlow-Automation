from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from app.models import WorkflowDecision, WorkflowExecutionResult, WorkflowStepResult


@dataclass
class ExecutionStep:
    name: str
    action: str
    fallback_action: str


class WorkflowExecutionService:
    """Deterministic step executor with fallback so one failed step does not halt the workflow."""

    def run(self, decision: WorkflowDecision, metadata: dict[str, Any]) -> WorkflowExecutionResult:
        started_at = datetime.now(UTC).isoformat()
        steps: list[ExecutionStep] = self._plan(decision.intent)
        results: list[WorkflowStepResult] = []
        used_alternative_path = False

        for step in steps:
            primary_ok, primary_note = self._execute_action(step.action, metadata, decision)
            if primary_ok:
                results.append(
                    WorkflowStepResult(
                        name=step.name,
                        action=step.action,
                        status="completed",
                        note=primary_note,
                        used_fallback=False,
                    )
                )
                continue

            fallback_ok, fallback_note = self._execute_action(step.fallback_action, metadata, decision)
            used_alternative_path = True
            results.append(
                WorkflowStepResult(
                    name=step.name,
                    action=step.action,
                    status="completed" if fallback_ok else "failed",
                    note=f"Primary failed: {primary_note}. Fallback: {fallback_note}.",
                    used_fallback=True,
                )
            )

        failed_steps = sum(1 for item in results if item.status == "failed")
        completed_steps = sum(1 for item in results if item.status == "completed")
        ended_at = datetime.now(UTC).isoformat()

        if failed_steps == 0:
            final_status = "completed"
            summary = f"Execution completed with {completed_steps}/{len(results)} steps successful."
        elif completed_steps > 0:
            final_status = "partial"
            summary = (
                f"Execution partially completed with {completed_steps}/{len(results)} successful steps. "
                "Fallback path was used to keep the workflow moving."
            )
        else:
            final_status = "failed"
            summary = "Execution failed across all planned steps and requires manual intervention."

        return WorkflowExecutionResult(
            workflow=decision.intent,
            final_status=final_status,
            started_at=started_at,
            ended_at=ended_at,
            used_alternative_path=used_alternative_path,
            steps=results,
            summary=summary,
        )

    def _plan(self, intent: str) -> list[ExecutionStep]:
        if intent == "approval_request":
            return [
                ExecutionStep("collect_policy_context", "fetch_approval_policy", "use_default_approval_policy"),
                ExecutionStep("route_to_approver", "assign_approver", "assign_backup_approver"),
                ExecutionStep("notify_requester", "send_approval_notification", "queue_notification_retry"),
            ]

        if intent == "procurement":
            return [
                ExecutionStep("gather_requirements", "extract_procurement_requirements", "use_minimum_procurement_profile"),
                ExecutionStep("match_supplier", "match_local_supplier", "search_online_supplier_referrals"),
                ExecutionStep("draft_purchase_action", "prepare_purchase_action", "prepare_manual_purchase_packet"),
            ]

        if intent == "escalation":
            return [
                ExecutionStep("triage_severity", "score_escalation_severity", "assign_default_severity"),
                ExecutionStep("assign_owner", "assign_escalation_owner", "assign_backup_escalation_owner"),
                ExecutionStep("trigger_alert", "trigger_primary_alert_channel", "trigger_secondary_alert_channel"),
            ]

        return [
            ExecutionStep("classify_and_route", "route_general_task", "queue_for_manual_triage"),
            ExecutionStep("notify", "send_general_notification", "queue_notification_retry"),
        ]

    def _execute_action(self, action: str, metadata: dict[str, Any], decision: WorkflowDecision) -> tuple[bool, str]:
        forced_failures = metadata.get("force_fail_actions", [])
        if isinstance(forced_failures, list) and action in forced_failures:
            return False, f"Action {action} was forced to fail for testing."

        if action == "match_local_supplier" and not metadata.get("local_supplier_available", True):
            return False, "No local supplier matched the procurement constraints."

        if action == "assign_approver" and metadata.get("approver_unavailable", False):
            return False, "Primary approver unavailable within SLA window."

        if action == "trigger_primary_alert_channel" and metadata.get("primary_alert_down", False):
            return False, "Primary alert channel unreachable."

        if decision.confidence < 0.45 and action not in {
            "queue_for_manual_triage",
            "use_default_approval_policy",
            "use_minimum_procurement_profile",
            "assign_default_severity",
            "assign_backup_approver",
            "search_online_supplier_referrals",
            "assign_backup_escalation_owner",
            "trigger_secondary_alert_channel",
            "queue_notification_retry",
            "prepare_manual_purchase_packet",
        }:
            return False, f"Action {action} blocked due to low confidence score {decision.confidence:.2f}."

        return True, f"Action {action} executed successfully."
