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
