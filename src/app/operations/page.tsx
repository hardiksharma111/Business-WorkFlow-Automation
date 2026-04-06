"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type WorkflowTask = {
  id: string;
  source: string;
  message: string;
  intent: string;
  confidence: number;
  mode: string;
  status: string;
  recommended_action: string;
  requires_human_approval: boolean;
  created_at: string;
  updated_at: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

async function fetchTasks(): Promise<WorkflowTask[]> {
  const response = await fetch(`${API_BASE}/api/v1/workflows/tasks?limit=30`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Unable to fetch workflow tasks.");
  }

  return response.json();
}

export default function OperationsDashboardPage() {
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const nextTasks = await fetchTasks();
        if (mounted) {
          setTasks(nextTasks);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();
    const timer = setInterval(load, 5000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const metrics = useMemo(() => {
    const total = tasks.length;
    const autoExecuted = tasks.filter((task) => task.mode === "auto_execute").length;
    const pendingHuman = tasks.filter((task) => task.status === "pending_human").length;
    const avgConfidence = total
      ? tasks.reduce((sum, task) => sum + task.confidence, 0) / total
      : 0;

    return {
      total,
      autoExecuted,
      pendingHuman,
      avgConfidence
    };
  }, [tasks]);

  return (
    <main className="ops-shell">
      <section className="ops-hero">
        <div>
          <span className="eyebrow">Operations dashboard</span>
          <h1>Live Agent Work Monitor</h1>
          <p>
            See workflow agents classify requests, select actions, and surface items that still need
            human approval.
          </p>
        </div>
        <Link className="secondary-action" href="/">
          Back to website
        </Link>
      </section>

      <section className="ops-metrics">
        <article className="ops-metric-card">
          <h2>Total tasks</h2>
          <strong>{metrics.total}</strong>
        </article>
        <article className="ops-metric-card">
          <h2>Auto-executed</h2>
          <strong>{metrics.autoExecuted}</strong>
        </article>
        <article className="ops-metric-card">
          <h2>Pending human</h2>
          <strong>{metrics.pendingHuman}</strong>
        </article>
        <article className="ops-metric-card">
          <h2>Avg confidence</h2>
          <strong>{(metrics.avgConfidence * 100).toFixed(1)}%</strong>
        </article>
      </section>

      <section className="ops-table-wrap">
        <header className="ops-table-head">
          <h2>Recent workflow tasks</h2>
          <span className="ops-refresh">Auto-refresh: 5s</span>
        </header>

        {loading ? <p className="ops-note">Loading tasks...</p> : null}
        {error ? <p className="ops-error">{error}</p> : null}

        <div className="ops-table-scroll">
          <table className="ops-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Source</th>
                <th>Intent</th>
                <th>Action</th>
                <th>Mode</th>
                <th>Status</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td>{new Date(task.created_at).toLocaleString()}</td>
                  <td>{task.source}</td>
                  <td>{task.intent}</td>
                  <td>{task.recommended_action}</td>
                  <td>{task.mode}</td>
                  <td>{task.status}</td>
                  <td>{(task.confidence * 100).toFixed(0)}%</td>
                </tr>
              ))}
              {!tasks.length && !loading ? (
                <tr>
                  <td colSpan={7} className="ops-note">
                    No tasks yet. Send messages to `/api/v1/connectors/webhook/ingest` or
                    `/api/v1/workflows/intake-and-create`.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
