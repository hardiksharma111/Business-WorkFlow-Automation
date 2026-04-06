from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import UTC, datetime
from pathlib import Path

from app.models import WorkflowDecision, WorkflowIntakeRequest, WorkflowTask


class WorkflowTaskStore:
    def __init__(self, db_path: str) -> None:
        db_file = Path(db_path)
        db_file.parent.mkdir(parents=True, exist_ok=True)
        self._db_path = str(db_file)
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self._db_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _init_db(self) -> None:
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS workflow_tasks (
                    id TEXT PRIMARY KEY,
                    source TEXT NOT NULL,
                    message TEXT NOT NULL,
                    intent TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    mode TEXT NOT NULL,
                    status TEXT NOT NULL,
                    recommended_action TEXT NOT NULL,
                    requires_human_approval INTEGER NOT NULL,
                    metadata TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS service_status_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    service TEXT NOT NULL,
                    state TEXT NOT NULL,
                    detail TEXT NOT NULL,
                    changed_at TEXT NOT NULL
                )
                """
            )

    def create_task(self, request: WorkflowIntakeRequest, decision: WorkflowDecision) -> WorkflowTask:
        now = datetime.now(UTC).isoformat()
        task_id = str(uuid.uuid4())
        status = "pending_human" if decision.requires_human_approval else "auto_executed"

        task = WorkflowTask(
            id=task_id,
            source=request.source,
            message=request.message,
            intent=decision.intent,
            confidence=decision.confidence,
            mode=decision.mode,
            status=status,
            recommended_action=decision.recommended_action,
            requires_human_approval=decision.requires_human_approval,
            metadata=request.metadata,
            created_at=now,
            updated_at=now,
        )

        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO workflow_tasks (
                    id, source, message, intent, confidence, mode, status, recommended_action,
                    requires_human_approval, metadata, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    task.id,
                    task.source,
                    task.message,
                    task.intent,
                    task.confidence,
                    task.mode,
                    task.status,
                    task.recommended_action,
                    1 if task.requires_human_approval else 0,
                    json.dumps(task.metadata),
                    task.created_at,
                    task.updated_at,
                ),
            )

        return task

    def list_tasks(self, limit: int = 50) -> list[WorkflowTask]:
        with self._connect() as connection:
            rows = connection.execute(
                """
                SELECT * FROM workflow_tasks
                ORDER BY created_at DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()

        return [self._row_to_task(row) for row in rows]

    def update_status(self, task_id: str, status: str) -> WorkflowTask | None:
        now = datetime.now(UTC).isoformat()
        with self._connect() as connection:
            cursor = connection.execute(
                """
                UPDATE workflow_tasks
                SET status = ?, updated_at = ?
                WHERE id = ?
                """,
                (status, now, task_id),
            )
            if cursor.rowcount == 0:
                return None

            row = connection.execute("SELECT * FROM workflow_tasks WHERE id = ?", (task_id,)).fetchone()

        return self._row_to_task(row) if row else None

    def update_task(self, task_id: str, *, status: str | None = None, metadata: dict[str, object] | None = None) -> WorkflowTask | None:
        with self._connect() as connection:
            row = connection.execute("SELECT * FROM workflow_tasks WHERE id = ?", (task_id,)).fetchone()
            if not row:
                return None

            next_status = status or str(row["status"])
            next_metadata = json.loads(row["metadata"])
            if metadata:
                next_metadata.update(metadata)

            now = datetime.now(UTC).isoformat()
            connection.execute(
                """
                UPDATE workflow_tasks
                SET status = ?, metadata = ?, updated_at = ?
                WHERE id = ?
                """,
                (next_status, json.dumps(next_metadata), now, task_id),
            )

            updated_row = connection.execute("SELECT * FROM workflow_tasks WHERE id = ?", (task_id,)).fetchone()

        return self._row_to_task(updated_row) if updated_row else None

    def _row_to_task(self, row: sqlite3.Row) -> WorkflowTask:
        return WorkflowTask(
            id=row["id"],
            source=row["source"],
            message=row["message"],
            intent=row["intent"],
            confidence=float(row["confidence"]),
            mode=row["mode"],
            status=row["status"],
            recommended_action=row["recommended_action"],
            requires_human_approval=bool(row["requires_human_approval"]),
            metadata=json.loads(row["metadata"]),
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    def check_health(self) -> tuple[str, str]:
        try:
            with self._connect() as connection:
                row = connection.execute("SELECT COUNT(*) AS count FROM workflow_tasks").fetchone()
            count = int(row["count"]) if row else 0
            return "online", f"Task store reachable with {count} tasks."
        except Exception as exc:
            return "offline", f"Task store error: {exc}"

    def record_service_status(self, service: str, state: str, detail: str) -> None:
        now = datetime.now(UTC).isoformat()
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO service_status_history (service, state, detail, changed_at)
                VALUES (?, ?, ?, ?)
                """,
                (service, state, detail, now),
            )

    def get_service_status_history(self, limit: int = 100) -> list[dict[str, str]]:
        with self._connect() as connection:
            rows = connection.execute(
                """
                SELECT service, state, detail, changed_at
                FROM service_status_history
                ORDER BY id DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()

        return [
            {
                "service": str(row["service"]),
                "state": str(row["state"]),
                "detail": str(row["detail"]),
                "changed_at": str(row["changed_at"]),
            }
            for row in rows
        ]

    def get_task_analytics(self, limit: int = 50) -> dict[str, object]:
        tasks = self.list_tasks(limit=limit)

        total_tasks = len(tasks)
        completed_tasks = sum(1 for task in tasks if task.status == "completed")
        partial_tasks = sum(1 for task in tasks if task.status == "partial")
        failed_tasks = sum(1 for task in tasks if task.status == "failed")
        pending_tasks = sum(1 for task in tasks if task.status == "pending_human")
        auto_executed_tasks = sum(1 for task in tasks if task.status == "auto_executed")
        human_review_tasks = sum(1 for task in tasks if task.requires_human_approval)
        negotiation_runs = sum(1 for task in tasks if task.metadata.get("route") == "negotiation" or "negotiation" in task.metadata)
        negotiation_fallbacks = sum(
            1 for task in tasks if isinstance(task.metadata.get("negotiation"), dict) and task.metadata["negotiation"].get("fallback_reason")
        )

        confidence_values = [task.confidence for task in tasks]
        confidence_trend = list(reversed(confidence_values[:10]))

        top_intents = self._bucketize([task.intent for task in tasks])
        source_mix = self._bucketize([task.source for task in tasks])

        execution_labels: list[str] = []
        execution_fallback_steps = 0
        recent_failures: list[str] = []
        for task in tasks:
            execution = task.metadata.get("execution")
            if isinstance(execution, dict):
                execution_labels.append(str(execution.get("final_status", "unknown")))
                for step in execution.get("steps", []):
                    if isinstance(step, dict) and step.get("used_fallback"):
                        execution_fallback_steps += 1
                if execution.get("final_status") == "failed":
                    recent_failures.append(str(execution.get("summary", task.intent)))
            elif task.status in {"completed", "partial", "failed"}:
                execution_labels.append(task.status)

        execution_mix = self._bucketize(execution_labels)

        return {
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "partial_tasks": partial_tasks,
            "failed_tasks": failed_tasks,
            "pending_tasks": pending_tasks,
            "auto_executed_tasks": auto_executed_tasks,
            "human_review_tasks": human_review_tasks,
            "negotiation_runs": negotiation_runs,
            "negotiation_fallbacks": negotiation_fallbacks,
            "execution_fallback_steps": execution_fallback_steps,
            "avg_confidence": round(sum(confidence_values) / total_tasks, 4) if confidence_values else 0.0,
            "confidence_trend": confidence_trend,
            "top_intents": top_intents,
            "source_mix": source_mix,
            "execution_mix": execution_mix,
            "recent_failures": recent_failures[:5],
        }

    def _bucketize(self, values: list[str]) -> list[dict[str, object]]:
        counts: dict[str, int] = {}
        for value in values:
            key = str(value)
            counts[key] = counts.get(key, 0) + 1

        items = sorted(counts.items(), key=lambda item: (-item[1], item[0]))
        return [{"label": label, "value": count} for label, count in items[:6]]
