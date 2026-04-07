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
  metadata?: Record<string, string>;
};

type ServiceStatus = {
  name: string;
  state: "online" | "loading" | "offline";
  detail: string;
  latency_ms?: number | null;
};

type SystemStatus = {
  overall: "online" | "loading" | "offline";
  services: ServiceStatus[];
};

const CORE_SERVICE_ORDER = ["api", "ollama", "embeddings", "chromadb", "task_store"] as const;
type ServiceState = "online" | "loading" | "offline";

type ServiceObservation = {
  state: ServiceState;
  lastCheckedAt: string;
  lastChangedAt: string;
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

async function updateTaskStatus(taskId: string, status: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/v1/workflows/tasks/${taskId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ status })
  });

  if (!response.ok) {
    throw new Error("Failed to update task status.");
  }
}

async function fetchSystemStatus(): Promise<SystemStatus> {
  const response = await fetch(`${API_BASE}/api/v1/system/status`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Unable to load backend system status.");
  }

  return response.json();
}

async function triggerWarmup(target: "all" | "ollama" | "embeddings"): Promise<void> {
  const response = await fetch(`${API_BASE}/api/v1/system/warmup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ target })
  });

  if (!response.ok) {
    throw new Error("Warmup request failed.");
  }
}

function prettyLabel(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function OperationsDashboardPage() {
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [actionLoadingTaskId, setActionLoadingTaskId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [serviceObservations, setServiceObservations] = useState<Record<string, ServiceObservation>>(
    {}
  );
  const [warmupLoading, setWarmupLoading] = useState<"all" | "ollama" | "embeddings" | null>(null);
  const [warmupMessage, setWarmupMessage] = useState<string | null>(null);

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

  useEffect(() => {
    let mounted = true;

    const updateObservations = (states: Array<{ name: string; state: ServiceState }>) => {
      const now = new Date().toISOString();
      setServiceObservations((previous) => {
        const next = { ...previous };
        for (const item of states) {
          const existing = previous[item.name];
          next[item.name] = {
            state: item.state,
            lastCheckedAt: now,
            lastChangedAt:
              !existing || existing.state !== item.state ? now : existing.lastChangedAt,
          };
        }
        return next;
      });
    };

    const loadSystemStatus = async () => {
      try {
        const next = await fetchSystemStatus();
        if (mounted) {
          setSystemStatus(next);
          setStatusError(null);
          updateObservations(next.services.map((service) => ({ name: service.name, state: service.state })));
        }
      } catch (err) {
        if (mounted) {
          setStatusError(err instanceof Error ? err.message : "Failed to load status.");
          updateObservations(CORE_SERVICE_ORDER.map((name) => ({ name, state: "offline" as const })));
        }
      }
    };

    loadSystemStatus();
    const timer = setInterval(loadSystemStatus, 4000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const sources = useMemo(() => {
    return ["all", ...new Set(tasks.map((task) => task.source))];
  }, [tasks]);

  const statuses = useMemo(() => {
    return ["all", ...new Set(tasks.map((task) => task.status))];
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesQuery =
        !query ||
        `${task.message} ${task.intent} ${task.recommended_action}`
          .toLowerCase()
          .includes(query.toLowerCase());

      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      const matchesSource = sourceFilter === "all" || task.source === sourceFilter;

      return matchesQuery && matchesStatus && matchesSource;
    });
  }, [tasks, query, statusFilter, sourceFilter]);

  const selectedTask = useMemo(() => {
    if (!filteredTasks.length) {
      return null;
    }

    return (
      filteredTasks.find((task) => task.id === selectedTaskId) ??
      filteredTasks[0]
    );
  }, [filteredTasks, selectedTaskId]);

  const metrics = useMemo(() => {
    const total = tasks.length;
    const autoExecuted = tasks.filter((task) => task.mode === "auto_execute").length;
    const pendingHuman = tasks.filter((task) => task.status === "pending_human").length;
    const completed = tasks.filter((task) => task.status === "completed").length;
    const avgConfidence = total
      ? tasks.reduce((sum, task) => sum + task.confidence, 0) / total
      : 0;

    return {
      total,
      autoExecuted,
      pendingHuman,
      completed,
      avgConfidence
    };
  }, [tasks]);

  const runTaskAction = async (taskId: string, nextStatus: string) => {
    setActionLoadingTaskId(taskId);
    setActionError(null);

    try {
      await updateTaskStatus(taskId, nextStatus);
      const nextTasks = await fetchTasks();
      setTasks(nextTasks);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setActionLoadingTaskId(null);
    }
  };

  const badgeClass = (status: string): string => {
    if (status === "completed" || status === "approved") {
      return "ops-badge ops-badge-success";
    }
    if (status === "rejected") {
      return "ops-badge ops-badge-danger";
    }
    if (status === "pending_human") {
      return "ops-badge ops-badge-warning";
    }
    return "ops-badge";
  };

  const serviceStateClass = (state: "online" | "loading" | "offline") => {
    if (state === "online") {
      return "svc-dot svc-online";
    }
    if (state === "loading") {
      return "svc-dot svc-loading";
    }
    return "svc-dot svc-offline";
  };

  const displayedServices = useMemo<ServiceStatus[]>(() => {
    const byName = new Map((systemStatus?.services ?? []).map((service) => [service.name, service]));

    return CORE_SERVICE_ORDER.map((name) => {
      const found = byName.get(name);
      if (found) {
        return found;
      }

      return {
        name,
        state: "offline",
        detail: statusError
          ? "No response from backend status endpoint."
          : "Service status not reported yet.",
        latency_ms: null
      };
    });
  }, [statusError, systemStatus]);

  const overallState: "online" | "loading" | "offline" = systemStatus
    ? systemStatus.overall
    : statusError
      ? "offline"
      : "loading";

  const offlineServices = displayedServices.filter((service) => service.state === "offline");

  const runWarmup = async (target: "all" | "ollama" | "embeddings") => {
    setWarmupLoading(target);
    setWarmupMessage(null);
    try {
      await triggerWarmup(target);
      setWarmupMessage(`Warmup completed for ${prettyLabel(target)}.`);
      const latest = await fetchSystemStatus();
      setSystemStatus(latest);
    } catch (err) {
      setWarmupMessage(err instanceof Error ? err.message : "Warmup failed.");
    } finally {
      setWarmupLoading(null);
    }
  };

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
          <h2>Completed</h2>
          <strong>{metrics.completed}</strong>
        </article>
        <article className="ops-metric-card">
          <h2>Avg confidence</h2>
          <strong>{(metrics.avgConfidence * 100).toFixed(1)}%</strong>
        </article>
      </section>

      <section className="ops-controls">
        <label>
          Search
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search message, intent, action"
          />
        </label>

        <label>
          Source
          <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
            {sources.map((source) => (
              <option key={source} value={source}>
                {prettyLabel(source)}
              </option>
            ))}
          </select>
        </label>

        <label>
          Status
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {prettyLabel(status)}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="ops-system-panel">
        <header className="ops-system-head">
          <h2>Settings & Backend Health</h2>
          <span className={serviceStateClass(overallState)}>
            <span />
            {prettyLabel(overallState)}
          </span>
        </header>

        <p className="ops-note">
          Service states: green = online, yellow = loading/waiting, red = offline.
        </p>
        {statusError ? <p className="ops-error">{statusError}</p> : null}
        {warmupMessage ? <p className="ops-note">{warmupMessage}</p> : null}

        {offlineServices.length ? (
          <div className="ops-alert-banner">
            Attention: {offlineServices.map((service) => prettyLabel(service.name)).join(", ")} are offline.
          </div>
        ) : null}

        <div className="ops-warmup-actions">
          <button
            type="button"
            className="ops-action complete"
            onClick={() => runWarmup("all")}
            disabled={warmupLoading !== null}
          >
            {warmupLoading === "all" ? "Warming Up..." : "Warmup All"}
          </button>
          <button
            type="button"
            className="ops-action"
            onClick={() => runWarmup("ollama")}
            disabled={warmupLoading !== null}
          >
            {warmupLoading === "ollama" ? "Warming..." : "Warmup Ollama"}
          </button>
          <button
            type="button"
            className="ops-action"
            onClick={() => runWarmup("embeddings")}
            disabled={warmupLoading !== null}
          >
            {warmupLoading === "embeddings" ? "Warming..." : "Warmup Embeddings"}
          </button>
        </div>

        <div className="ops-service-grid">
          {displayedServices.map((service) => (
            <article key={service.name} className="ops-service-card">
              <div className="ops-service-top">
                <h3>{prettyLabel(service.name)}</h3>
                <span className={serviceStateClass(service.state)}>
                  <span />
                  {prettyLabel(service.state)}
                </span>
              </div>
              <p>{service.detail}</p>
              {typeof service.latency_ms === "number" ? (
                <small>Latency: {service.latency_ms} ms</small>
              ) : null}
              <small>
                Last checked: {serviceObservations[service.name]?.lastCheckedAt
                  ? new Date(serviceObservations[service.name].lastCheckedAt).toLocaleTimeString()
                  : "--"}
              </small>
              <small>
                Last changed: {serviceObservations[service.name]?.lastChangedAt
                  ? new Date(serviceObservations[service.name].lastChangedAt).toLocaleTimeString()
                  : "--"}
              </small>
            </article>
          ))}
        </div>
      </section>

      <section className="ops-grid">
        <section className="ops-table-wrap">
        <header className="ops-table-head">
          <h2>Recent workflow tasks ({filteredTasks.length})</h2>
          <span className="ops-refresh">Auto-refresh: 5s</span>
        </header>

        {loading ? <p className="ops-note">Loading tasks...</p> : null}
        {error ? <p className="ops-error">{error}</p> : null}
        {actionError ? <p className="ops-error">{actionError}</p> : null}

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
                <th>Controls</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => (
                <tr
                  key={task.id}
                  className={selectedTask?.id === task.id ? "ops-row-active" : ""}
                  onClick={() => setSelectedTaskId(task.id)}
                >
                  <td>{new Date(task.created_at).toLocaleString()}</td>
                  <td>{task.source}</td>
                  <td>{task.intent}</td>
                  <td>{task.recommended_action}</td>
                  <td>{task.mode}</td>
                  <td>
                    <span className={badgeClass(task.status)}>{prettyLabel(task.status)}</span>
                  </td>
                  <td>{(task.confidence * 100).toFixed(0)}%</td>
                  <td>
                    <div className="ops-actions-inline" onClick={(event) => event.stopPropagation()}>
                      <button
                        type="button"
                        className="ops-action approve"
                        disabled={actionLoadingTaskId === task.id || task.status === "approved"}
                        onClick={() => runTaskAction(task.id, "approved")}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="ops-action reject"
                        disabled={actionLoadingTaskId === task.id || task.status === "rejected"}
                        onClick={() => runTaskAction(task.id, "rejected")}
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        className="ops-action complete"
                        disabled={actionLoadingTaskId === task.id || task.status === "completed"}
                        onClick={() => runTaskAction(task.id, "completed")}
                      >
                        Complete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredTasks.length && !loading ? (
                <tr>
                  <td colSpan={8} className="ops-note">
                    No tasks yet. Send messages to `/api/v1/connectors/webhook/ingest` or
                    `/api/v1/workflows/intake-and-create`.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        </section>

        <aside className="ops-detail-panel">
          <h2>Task detail</h2>
          {!selectedTask ? <p className="ops-note">Select a task to inspect details.</p> : null}

          {selectedTask ? (
            <div className="ops-detail-content">
              <div className="ops-detail-row">
                <span>ID</span>
                <code>{selectedTask.id.slice(0, 8)}</code>
              </div>
              <div className="ops-detail-row">
                <span>Source</span>
                <strong>{prettyLabel(selectedTask.source)}</strong>
              </div>
              <div className="ops-detail-row">
                <span>Intent</span>
                <strong>{prettyLabel(selectedTask.intent)}</strong>
              </div>
              <div className="ops-detail-row">
                <span>Status</span>
                <span className={badgeClass(selectedTask.status)}>
                  {prettyLabel(selectedTask.status)}
                </span>
              </div>
              <div className="ops-detail-row">
                <span>Mode</span>
                <strong>{prettyLabel(selectedTask.mode)}</strong>
              </div>
              <div className="ops-detail-row">
                <span>Confidence</span>
                <strong>{(selectedTask.confidence * 100).toFixed(1)}%</strong>
              </div>
              <div className="ops-detail-message">
                <h3>Message</h3>
                <p>{selectedTask.message}</p>
              </div>
              <div className="ops-detail-message">
                <h3>Suggested action</h3>
                <p>{prettyLabel(selectedTask.recommended_action)}</p>
              </div>
            </div>
          ) : null}
        </aside>
      </section>
    </main>
  );
}
