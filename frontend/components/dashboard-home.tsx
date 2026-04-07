"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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

type ServiceHistoryItem = {
  service: string;
  state: string;
  detail: string;
  changed_at: string;
};

type AnalyticsBucket = {
  label: string;
  value: number;
};

type WorkflowAnalyticsResponse = {
  total_tasks: number;
  completed_tasks: number;
  partial_tasks: number;
  failed_tasks: number;
  pending_tasks: number;
  auto_executed_tasks: number;
  human_review_tasks: number;
  negotiation_runs: number;
  negotiation_fallbacks: number;
  execution_fallback_steps: number;
  avg_confidence: number;
  confidence_trend: number[];
  top_intents: AnalyticsBucket[];
  source_mix: AnalyticsBucket[];
  execution_mix: AnalyticsBucket[];
  recent_failures: string[];
};

type OllamaModelsResponse = {
  configured_model: string;
  models: string[];
};

type NegotiationSellerLead = {
  name: string;
  category: string;
  summary: string;
  origin: string;
  url?: string | null;
  contact?: string | null;
  confidence: number;
};

type NegotiationOutcome = {
  reply: string;
  strategy: string;
  selected_seller: NegotiationSellerLead | null;
  local_sellers: NegotiationSellerLead[];
  online_sellers: NegotiationSellerLead[];
  fallback_reason?: string | null;
  alternative_path: string;
  trace: string[];
  error_notes: string[];
  summary: string;
};

type NegotiationRunResponse = {
  route: string;
  assistant_reply: string;
  task: WorkflowTask;
  negotiation?: NegotiationOutcome | null;
};

type DemoMessage = {
  id: string;
  role: "user" | "agent" | "system";
  text: string;
};

type DemoActionCard = {
  title: string;
  details: string;
  taskId: string;
};

type ViewMode = "command-center" | "workflow-flow" | "system-health" | "model-lab";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
const API_HOST = API_BASE.replace(/^https?:\/\//, "");

const viewModes: Array<{ value: ViewMode; label: string; description: string }> = [
  {
    value: "command-center",
    label: "Command Center",
    description: "High-level health, routing pressure, and live throughput"
  },
  {
    value: "workflow-flow",
    label: "Workflow Flow",
    description: "Task handoffs, statuses, and action recommendations"
  },
  {
    value: "system-health",
    label: "System Health",
    description: "Backend, Ollama, embeddings, ChromaDB, and storage"
  },
  {
    value: "model-lab",
    label: "Model Lab",
    description: "Configured model, available models, and warm signals"
  }
];

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`);
  }
  return response.json();
}

function statusTone(state: string): "good" | "warn" | "bad" {
  if (state === "online" || state === "completed") return "good";
  if (state === "loading" || state === "pending_human") return "warn";
  return "bad";
}

function prettyLabel(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleTimeString();
}

function MiniSparkline({ values }: { values: number[] }) {
  if (!values.length) {
    return <span className="sparkline-empty" />;
  }

  return (
    <div className="sparkline-bars" aria-hidden="true">
      {values.map((value, index) => (
        <span key={`${value}-${index}`} style={{ height: `${Math.max(12, value * 100)}%` }} />
      ))}
    </div>
  );
}

export default function DashboardHome() {
  const [mode, setMode] = useState<ViewMode>("command-center");
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [history, setHistory] = useState<ServiceHistoryItem[]>([]);
  const [analytics, setAnalytics] = useState<WorkflowAnalyticsResponse | null>(null);
  const [models, setModels] = useState<OllamaModelsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [negotiationMessage, setNegotiationMessage] = useState(
    "Source a wholesale seller who can negotiate pricing, shipping, and provide a backup option if the first quote fails."
  );
  const [negotiationResult, setNegotiationResult] = useState<NegotiationRunResponse | null>(null);
  const [negotiationLoading, setNegotiationLoading] = useState(false);
  const [negotiationError, setNegotiationError] = useState<string | null>(null);
  const [demoInput, setDemoInput] = useState("Order 50kg tomatoes for tomorrow.");
  const [demoMessages, setDemoMessages] = useState<DemoMessage[]>([]);
  const [demoBusy, setDemoBusy] = useState(false);
  const [demoActionCard, setDemoActionCard] = useState<DemoActionCard | null>(null);
  const [demoDecision, setDemoDecision] = useState<"pending" | "approved" | "rejected">("pending");

  useEffect(() => {
    let mounted = true;

    const loadCore = async () => {
      try {
        const [nextStatus, nextTasks, nextHistory, nextModels] = await Promise.all([
          fetchJson<SystemStatus>(`${API_BASE}/api/v1/system/status`),
          fetchJson<WorkflowTask[]>(`${API_BASE}/api/v1/workflows/tasks?limit=10`),
          fetchJson<ServiceHistoryItem[]>(`${API_BASE}/api/v1/system/status/history?limit=8`),
          fetchJson<OllamaModelsResponse>(`${API_BASE}/api/v1/system/ollama/models`)
        ]);

        if (mounted) {
          setSystemStatus(nextStatus);
          setTasks(nextTasks);
          setHistory(nextHistory);
          setModels(nextModels);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load dashboard data.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    const loadAnalytics = async () => {
      try {
        const nextAnalytics = await fetchJson<WorkflowAnalyticsResponse>(
          `${API_BASE}/api/v1/analytics/overview?limit=50`
        );
        if (mounted) {
          setAnalytics(nextAnalytics);
        }
      } catch {
        if (mounted) {
          setAnalytics(null);
        }
      }
    };

    loadCore();
    loadAnalytics();

    const timer = setInterval(() => {
      loadCore();
      loadAnalytics();
    }, 5000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const heroMetrics = useMemo(() => {
    const total = analytics?.total_tasks ?? tasks.length;
    const completed = analytics?.completed_tasks ?? tasks.filter((task) => task.status === "completed").length;
    const pending = analytics?.pending_tasks ?? tasks.filter((task) => task.status === "pending_human").length;
    const avgConfidence = analytics ? analytics.avg_confidence : total ? tasks.reduce((sum, task) => sum + task.confidence, 0) / total : 0;
    const fallbackSteps = analytics?.execution_fallback_steps ?? 0;
    const successRate = total ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      pending,
      avgConfidence,
      fallbackSteps,
      successRate
    };
  }, [analytics, tasks]);

  const activeServices = systemStatus?.services ?? [];
  const selectedMode = viewModes.find((item) => item.value === mode) ?? viewModes[0];
  const liveTasks = tasks.slice(0, 4);
  const confidenceSeries = analytics?.confidence_trend ?? [];
  const topIntents = analytics?.top_intents ?? [];
  const topSources = analytics?.source_mix ?? [];
  const executionMix = analytics?.execution_mix ?? [];
  const apiLabel = API_HOST.replace(/^www\./, "");

  const handleNegotiationSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNegotiationLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          source: "whatsapp_chrome_extension",
          message: negotiationMessage,
          metadata: {
            channel: "whatsapp_chrome_extension",
            workspace: mode,
            entry_point: "from_scratch_frontend"
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Negotiation request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as NegotiationRunResponse;
      setNegotiationResult(payload);
      setNegotiationError(null);
    } catch (err) {
      setNegotiationError(err instanceof Error ? err.message : "Negotiation request failed.");
    } finally {
      setNegotiationLoading(false);
    }
  };

  const pushDemoMessage = (role: DemoMessage["role"], text: string) => {
    setDemoMessages((previous) => [
      ...previous,
      {
        id: `${Date.now()}-${Math.random()}`,
        role,
        text
      }
    ]);
  };

  const waitStep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const runDemoFlow = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!demoInput.trim() || demoBusy) {
      return;
    }

    const cleanMessage = demoInput.trim();
    setDemoBusy(true);
    setDemoDecision("pending");
    setDemoActionCard(null);
    setDemoMessages([]);

    pushDemoMessage("user", cleanMessage);
    await waitStep(500);
    pushDemoMessage("system", "Parsing intent from unstructured message...");
    await waitStep(900);
    pushDemoMessage("agent", "Stock out at primary vendor. Initiating self-healing protocol...");
    await waitStep(900);
    pushDemoMessage("agent", "Contacting 3 local suppliers and ranking negotiated offers...");

    try {
      const response = await fetch(`${API_BASE}/api/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          source: "demo_command_center",
          message: cleanMessage,
          metadata: {
            channel: "demo_mode",
            workspace: mode,
            entry_point: "action_card_demo"
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Demo request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as NegotiationRunResponse;
      setNegotiationResult(payload);
      setNegotiationError(null);

      const seller = payload.negotiation?.selected_seller?.name ?? "Backup Supplier Network";
      const summary = payload.negotiation?.summary ?? payload.assistant_reply;
      const details = `${summary} Route: ${payload.route}.`;
      setDemoActionCard({ title: `Best offer ready from ${seller}`, details, taskId: payload.task.id });
      pushDemoMessage("agent", "Proposal ready. Review the action card and approve to send.");
    } catch (err) {
      const fallbackId = `demo-${Date.now()}`;
      setDemoActionCard({
        title: "Best fallback offer ready",
        details:
          "Primary vendor unavailable. Secondary supplier can fulfill 50kg for same-day confirmation with backup logistics included.",
        taskId: fallbackId
      });
      pushDemoMessage(
        "agent",
        err instanceof Error
          ? `Backend slow during demo. Showing fail-safe proposal card: ${err.message}`
          : "Backend slow during demo. Showing fail-safe proposal card."
      );
    } finally {
      setDemoBusy(false);
    }
  };

  const handleDemoApprove = async () => {
    if (!demoActionCard || demoDecision !== "pending") {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/v1/workflows/tasks/${demoActionCard.taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: "completed" })
      });

      if (!response.ok) {
        pushDemoMessage("system", "Approved locally. Task could not be patched remotely in this run.");
      } else {
        pushDemoMessage("system", "Approved and sent. Workflow task updated to completed.");
      }
    } catch {
      pushDemoMessage("system", "Approved locally. Backend patch skipped for this run.");
    }

    setDemoDecision("approved");
  };

  const handleDemoReject = () => {
    if (!demoActionCard || demoDecision !== "pending") {
      return;
    }
    setDemoDecision("rejected");
    pushDemoMessage("system", "Proposal rejected. Agent will request alternate terms.");
  };

  return (
    <main className="control-room-shell">
      <div className="control-orb control-orb-a" />
      <div className="control-orb control-orb-b" />
      <div className="control-orb control-orb-c" />

      <header className="control-topbar">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            <span className="brand-mark-dot" />
          </span>
          <div>
            <p className="brand-kicker">Blue control room</p>
            <h1>Business workflow automation</h1>
          </div>
        </div>

        <div className="control-actions">
          <label className="view-switcher">
            <span>View</span>
            <select value={mode} onChange={(event) => setMode(event.target.value as ViewMode)}>
              {viewModes.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <span className={`connection-badge ${systemStatus ? "online" : "loading"}`}>
            API {API_HOST}
          </span>

          <Link className="secondary-action" href="/operations">
            Open operations
          </Link>
        </div>
      </header>

      <section className="control-hero">
        <div className="control-hero-copy">
          <span className="eyebrow">From-scratch frontend build</span>
          <h2>{selectedMode.description}</h2>
          <p>
            This version keeps the backend integration, but the interface is rebuilt as a cleaner blue command surface for live task routing, system telemetry, and negotiation runs.
          </p>

          <div className="hero-actions">
            <a className="primary-action" href="#signal-grid">
              View live signal
            </a>
            <a className="secondary-action" href="#negotiation-studio">
              Try negotiation
            </a>
          </div>

          <div className="hero-metrics">
            <div className="metric-card-alt">
              <span>Total tasks</span>
              <strong>{heroMetrics.total}</strong>
            </div>
            <div className="metric-card-alt">
              <span>Completed</span>
              <strong>{heroMetrics.completed}</strong>
            </div>
            <div className="metric-card-alt">
              <span>Pending</span>
              <strong>{heroMetrics.pending}</strong>
            </div>
            <div className="metric-card-alt">
              <span>Success rate</span>
              <strong>{heroMetrics.successRate}%</strong>
            </div>
          </div>
        </div>

        <div className="control-hero-panel glass-card deep">
          <div className="panel-headline">
            <div>
              <span className="panel-tag">Current mode</span>
              <h3>{selectedMode.label}</h3>
            </div>
            <span className={`status-chip ${systemStatus ? statusTone(systemStatus.overall) : "warn"}`}>
              {systemStatus ? prettyLabel(systemStatus.overall) : "Loading"}
            </span>
          </div>

          <div className="radar-panel">
            <div className="radar-panel-core">
              <strong>{(heroMetrics.avgConfidence * 100).toFixed(1)}%</strong>
              <span>confidence</span>
            </div>
            <div className="radar-panel-ring radar-panel-ring-a" />
            <div className="radar-panel-ring radar-panel-ring-b" />
            <div className="radar-panel-ring radar-panel-ring-c" />
          </div>

          <div className="status-board">
            {activeServices.map((service) => (
              <article key={service.name} className="status-board-item">
                <div>
                  <strong>{prettyLabel(service.name)}</strong>
                  <p>{service.detail}</p>
                </div>
                <span className={`status-chip ${statusTone(service.state)}`}>{prettyLabel(service.state)}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="status-ribbon" aria-label="Live status ribbon">
        <article className="status-ribbon-item">
          <span>Frontend</span>
          <strong>Ready</strong>
          <p>Blue control room on port 3000</p>
        </article>
        <article className="status-ribbon-item">
          <span>Backend</span>
          <strong>{systemStatus ? prettyLabel(systemStatus.overall) : "Syncing"}</strong>
          <p>{apiLabel}</p>
        </article>
        <article className="status-ribbon-item">
          <span>Workspace</span>
          <strong>{selectedMode.label}</strong>
          <p>{currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
        </article>
      </section>

      <section className="signal-grid" id="signal-grid">
        <article className="workspace-panel signal-panel">
          <div className="panel-headline">
            <div>
              <span className="panel-tag">Live task feed</span>
              <h3>Recent workflow decisions</h3>
            </div>
            {loading ? <span className="status-chip warn">Syncing</span> : null}
          </div>

          <div className="task-stack">
            {liveTasks.map((task) => (
              <article key={task.id} className="task-item">
                <div className="task-item-top">
                  <div>
                    <strong>{prettyLabel(task.intent)}</strong>
                    <p>{task.message}</p>
                  </div>
                  <span className={`status-chip ${statusTone(task.status)}`}>{prettyLabel(task.status)}</span>
                </div>
                <div className="task-item-meta">
                  <span>{prettyLabel(task.source)}</span>
                  <span>{prettyLabel(task.mode)}</span>
                  <span>{(task.confidence * 100).toFixed(0)}%</span>
                </div>
              </article>
            ))}
          </div>
        </article>

        <article className="workspace-panel signal-panel">
          <div className="panel-headline">
            <div>
              <span className="panel-tag">Telemetry</span>
              <h3>Execution and fallback pulse</h3>
            </div>
            <span className="status-chip good">{heroMetrics.fallbackSteps} fallback steps</span>
          </div>

          <MiniSparkline values={confidenceSeries} />

          <div className="bucket-columns compact">
            <div>
              <h4>Top intents</h4>
              {topIntents.map((bucket) => (
                <div key={bucket.label} className="bucket-row">
                  <strong>{bucket.label}</strong>
                  <span>{bucket.value}</span>
                </div>
              ))}
            </div>
            <div>
              <h4>Sources</h4>
              {topSources.map((bucket) => (
                <div key={bucket.label} className="bucket-row">
                  <strong>{bucket.label}</strong>
                  <span>{bucket.value}</span>
                </div>
              ))}
            </div>
            <div>
              <h4>Execution mix</h4>
              {executionMix.map((bucket) => (
                <div key={bucket.label} className="bucket-row">
                  <strong>{bucket.label}</strong>
                  <span>{bucket.value}</span>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="workspace-panel signal-panel">
          <div className="panel-headline">
            <div>
              <span className="panel-tag">System timeline</span>
              <h3>Backend events and warm state</h3>
            </div>
            <span className="status-chip good">{models?.configured_model ?? "Loading"}</span>
          </div>

          <div className="timeline">
            {history.map((item) => (
              <div key={`${item.service}-${item.changed_at}`} className="timeline-item">
                <span className={`dot ${statusTone(item.state)}`} />
                <div>
                  <strong>{prettyLabel(item.service)}</strong>
                  <p>{item.detail}</p>
                  <small>{formatTime(item.changed_at)}</small>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="workspace-panel signal-panel">
          <div className="panel-headline">
            <div>
              <span className="panel-tag">Model lab</span>
              <h3>Configured model inventory</h3>
            </div>
            <span className="status-chip good">{models?.models?.length ?? 0} models</span>
          </div>

          <div className="model-lab-compact">
            <div className="glass-card deep compact-card">
              <span className="panel-tag">Current model</span>
              <h4>{models?.configured_model ?? "Loading..."}</h4>
              <p>Managed by the backend and refreshed on load.</p>
            </div>
            <div className="glass-card deep compact-card">
              <span className="panel-tag">Available models</span>
              <div className="model-list compact">
                {(models?.models ?? []).map((model) => (
                  <span key={model}>{model}</span>
                ))}
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="workflow-grid" id="negotiation-studio">
        <article className="workspace-panel negotiation-panel">
          <span className="panel-tag">Demo command center</span>
          <h3>Unstructured message to structured action</h3>
          <p>
            Type a raw business message and run a staged AI story that ends in an approve-or-reject action card.
          </p>

          <form className="negotiation-form" onSubmit={runDemoFlow}>
            <textarea
              value={demoInput}
              onChange={(event) => setDemoInput(event.target.value)}
              rows={5}
              placeholder="Order 50kg Tomatoes for tomorrow."
            />
            <button className="primary-action" type="submit" disabled={demoBusy}>
              {demoBusy ? "Running demo..." : "Run perfect demo flow"}
            </button>
          </form>

          {negotiationError ? <p className="error-line">{negotiationError}</p> : null}
        </article>

        <article className="workspace-panel negotiation-panel">
          <span className="panel-tag">Agent timeline</span>
          <div className="demo-chat-log">
            {demoMessages.length ? (
              demoMessages.map((item) => (
                <article key={item.id} className={`demo-chat-item ${item.role}`}>
                  <strong>{item.role === "user" ? "User" : item.role === "agent" ? "Agent" : "System"}</strong>
                  <p>{item.text}</p>
                </article>
              ))
            ) : (
              <p className="negotiation-empty">Run the demo flow to show staged AI reasoning in this panel.</p>
            )}
          </div>

          {demoActionCard ? (
            <article className="action-card">
              <p className="action-card-kicker">Agent proposal</p>
              <h4>{demoActionCard.title}</h4>
              <p>{demoActionCard.details}</p>
              <div className="action-card-buttons">
                <button type="button" className="action-reject" onClick={handleDemoReject} disabled={demoDecision !== "pending"}>
                  Reject
                </button>
                <button type="button" className="action-approve" onClick={handleDemoApprove} disabled={demoDecision !== "pending"}>
                  Approve and send
                </button>
              </div>
              <p className="action-card-status">Decision: {prettyLabel(demoDecision)}</p>
            </article>
          ) : null}
        </article>
      </section>

      {error ? <p className="error-line control-error">{error}</p> : null}
    </main>
  );
}
