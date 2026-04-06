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

type WorkflowDecision = {
  intent: string;
  entities: Record<string, unknown>;
  confidence: number;
  recommended_action: string;
  mode: string;
  requires_human_approval: boolean;
};

type ServiceHistoryItem = {
  service: string;
  state: string;
  detail: string;
  changed_at: string;
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
  task: WorkflowTask;
  decision: WorkflowDecision;
  route: string;
  assistant_reply: string;
  negotiation?: NegotiationOutcome | null;
};

type WorkspaceKey = "command-center" | "workflow-flow" | "system-health" | "model-lab";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

const workspaceOptions: Array<{ value: WorkspaceKey; label: string; description: string }> = [
  {
    value: "command-center",
    label: "Command Center",
    description: "Live throughput, confidence, and routing pulse"
  },
  {
    value: "workflow-flow",
    label: "Workflow Flow",
    description: "Queued requests, approvals, and execution chain"
  },
  {
    value: "system-health",
    label: "System Health",
    description: "API, Ollama, embeddings, ChromaDB, task store"
  },
  {
    value: "model-lab",
    label: "Model Lab",
    description: "Model selection, lists, and warmup state"
  }
];

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`);
  }
  return response.json();
}

function prettyLabel(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function tone(state: string) {
  if (state === "online") return "good";
  if (state === "loading") return "warn";
  return "bad";
}

function WaveGrid() {
  return (
    <div className="wave-grid" aria-hidden="true">
      <span className="wave-line wave-line-a" />
      <span className="wave-line wave-line-b" />
      <span className="wave-line wave-line-c" />
      <svg viewBox="0 0 1200 520" className="wave-svg">
        <defs>
          <linearGradient id="waveStroke" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(125,211,252,0.05)" />
            <stop offset="45%" stopColor="rgba(59,130,246,0.95)" />
            <stop offset="100%" stopColor="rgba(125,211,252,0.05)" />
          </linearGradient>
        </defs>
        <path d="M30 360 C 180 120, 280 120, 400 220 S 700 360, 880 140 S 1050 100, 1170 250" />
        <path d="M40 120 C 180 300, 310 270, 470 160 S 720 90, 860 220 S 1010 390, 1160 120" />
        <path d="M60 250 C 180 120, 340 110, 470 210 S 740 390, 930 250 S 1060 90, 1140 70" />
      </svg>
    </div>
  );
}

export default function DashboardHome() {
  const [workspace, setWorkspace] = useState<WorkspaceKey>("command-center");
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [history, setHistory] = useState<ServiceHistoryItem[]>([]);
  const [ollamaModels, setOllamaModels] = useState<OllamaModelsResponse | null>(null);
  const [negotiationMessage, setNegotiationMessage] = useState(
    "Need a wholesale seller that can negotiate on pricing, timeline, and a backup option if the first offer fails."
  );
  const [negotiationResult, setNegotiationResult] = useState<NegotiationRunResponse | null>(null);
  const [negotiationLoading, setNegotiationLoading] = useState(false);
  const [negotiationError, setNegotiationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const [status, nextTasks, nextHistory, nextModels] = await Promise.all([
          fetchJson<SystemStatus>(`${API_BASE}/api/v1/system/status`),
          fetchJson<WorkflowTask[]>(`${API_BASE}/api/v1/workflows/tasks?limit=8`),
          fetchJson<ServiceHistoryItem[]>(`${API_BASE}/api/v1/system/status/history?limit=8`),
          fetchJson<OllamaModelsResponse>(`${API_BASE}/api/v1/system/ollama/models`)
        ]);

        if (mounted) {
          setSystemStatus(status);
          setTasks(nextTasks);
          setHistory(nextHistory);
          setOllamaModels(nextModels);
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

    load();
    const timer = setInterval(load, 5000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const metrics = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((task) => task.status === "completed").length;
    const pending = tasks.filter((task) => task.status === "pending_human").length;
    const avgConfidence = total
      ? tasks.reduce((sum, task) => sum + task.confidence, 0) / total
      : 0;

    return { total, completed, pending, avgConfidence };
  }, [tasks]);

  const pulseValue = Math.min(100, Math.max(25, Math.round((metrics.avgConfidence || 0.25) * 100)));
  const services = systemStatus?.services ?? [];
  const activeWorkspace = workspaceOptions.find((option) => option.value === workspace) ?? workspaceOptions[0];

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
            workspace,
            entry_point: "homepage_dashboard"
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

  return (
    <main className="dashboard-shell">
      <div className="dashboard-orb dashboard-orb-a" />
      <div className="dashboard-orb dashboard-orb-b" />
      <div className="dashboard-orb dashboard-orb-c" />
      <WaveGrid />

      <header className="dashboard-topbar">
        <div>
          <span className="eyebrow">Blue-themed workflow UI</span>
          <h1>Workflow automation command center</h1>
          <p className="dashboard-subtitle">
            A dense, highly visual dashboard for approvals, backend status, and workflow orchestration.
          </p>
        </div>

        <div className="topbar-actions">
          <label className="view-switcher">
            <span>Workspace</span>
            <select value={workspace} onChange={(event) => setWorkspace(event.target.value as WorkspaceKey)}>
              {workspaceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <Link className="secondary-action dashboard-link" href="/operations">
            Operations
          </Link>
        </div>
      </header>

      <section className="hero-surface">
        <div className="hero-surface-inner">
          <div className="hero-copy dashboard-copy">
            <div className="hero-kicker-row">
              <span className={`status-chip ${tone(systemStatus?.overall ?? "loading")}`}>
                {systemStatus ? prettyLabel(systemStatus.overall) : "Loading"}
              </span>
              <span className="mini-chip">{activeWorkspace.label}</span>
            </div>

            <h2>{activeWorkspace.description}</h2>
            <p>
              Switch the dashboard workspace without leaving the home page. Every view is powered by the backend we already built.
            </p>

            <div className="hero-actions dashboard-actions">
              <a className="primary-action" href="#workspace-panel">
                Explore workspace
              </a>
              <a className="secondary-action" href="#signal-grid">
                Inspect backend
              </a>
            </div>
          </div>

          <div className="hero-radar">
            <div className="radar-ring radar-ring-a" />
            <div className="radar-ring radar-ring-b" />
            <div className="radar-ring radar-ring-c" />
            <div className="radar-core">
              <span>Signal</span>
              <strong>{pulseValue}%</strong>
              <p>confidence pulse</p>
            </div>
          </div>
        </div>
      </section>

      <section className="stats-strip" aria-label="Dashboard metrics">
        <article className="stat-tile">
          <p>Tasks routed</p>
          <strong>{metrics.total}</strong>
          <span>Live backend task feed</span>
        </article>
        <article className="stat-tile">
          <p>Completed</p>
          <strong>{metrics.completed}</strong>
          <span>Closed workflow actions</span>
        </article>
        <article className="stat-tile">
          <p>Pending review</p>
          <strong>{metrics.pending}</strong>
          <span>Human approval queue</span>
        </article>
        <article className="stat-tile">
          <p>Avg confidence</p>
          <strong>{(metrics.avgConfidence * 100).toFixed(1)}%</strong>
          <span>Model + retrieval score</span>
        </article>
      </section>

      <section className="workspace-grid" id="workspace-panel">
        <article className="workspace-panel workspace-panel-main">
          <div className="panel-heading">
            <div>
              <span className="panel-tag">{activeWorkspace.label}</span>
              <h3>{activeWorkspace.description}</h3>
            </div>
            {loading ? <span className="status-chip warn">Syncing</span> : null}
          </div>

          {workspace === "command-center" ? (
            <div className="command-center-layout">
              <div className="command-stack">
                <div className="glass-card deep">
                  <div className="mini-header">
                    <span>Task throughput</span>
                    <strong>{metrics.total}</strong>
                  </div>
                  <div className="bar-chart">
                    {[34, 62, 48, 85, 70, 92, 58].map((value, index) => (
                      <span key={index} style={{ height: `${value}%` }} />
                    ))}
                  </div>
                </div>

                <div className="glass-card deep">
                  <div className="mini-header">
                    <span>Approval pressure</span>
                    <strong>{metrics.pending}</strong>
                  </div>
                  <div className="approval-map">
                    <div>
                      <label>Queued</label>
                      <strong>{metrics.pending}</strong>
                    </div>
                    <div>
                      <label>Completed</label>
                      <strong>{metrics.completed}</strong>
                    </div>
                    <div>
                      <label>Confidence</label>
                      <strong>{metrics.avgConfidence.toFixed(2)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-card deep signal-card">
                <span className="panel-tag">Live stream</span>
                <div className="task-stream">
                  {tasks.slice(0, 4).map((task) => (
                    <article key={task.id} className="task-row">
                      <div>
                        <strong>{prettyLabel(task.intent)}</strong>
                        <p>{task.message}</p>
                      </div>
                      <span className={`status-chip ${tone(task.status === "completed" ? "online" : task.status === "pending_human" ? "loading" : "offline")}`}>
                        {prettyLabel(task.status)}
                      </span>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {workspace === "workflow-flow" ? (
            <div className="flowboard">
              {tasks.slice(0, 6).map((task, index) => (
                <article key={task.id} className="flow-card">
                  <div className="flow-top">
                    <span>{index + 1}</span>
                    <strong>{prettyLabel(task.source)}</strong>
                  </div>
                  <p>{task.recommended_action}</p>
                  <div className="flow-pills">
                    <span>{prettyLabel(task.mode)}</span>
                    <span>{(task.confidence * 100).toFixed(0)}%</span>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {workspace === "system-health" ? (
            <div className="health-grid">
              {services.map((service) => (
                <article key={service.name} className="health-card">
                  <div className="health-head">
                    <strong>{prettyLabel(service.name)}</strong>
                    <span className={`status-chip ${tone(service.state)}`}>{prettyLabel(service.state)}</span>
                  </div>
                  <p>{service.detail}</p>
                  {typeof service.latency_ms === "number" ? <small>{service.latency_ms} ms</small> : null}
                </article>
              ))}
            </div>
          ) : null}

          {workspace === "model-lab" ? (
            <div className="model-lab">
              <article className="glass-card deep">
                <span className="panel-tag">Configured model</span>
                <h4>{ollamaModels?.configured_model ?? "Loading..."}</h4>
                <p>Active Ollama model managed by the backend.</p>
              </article>

              <article className="glass-card deep">
                <span className="panel-tag">Available models</span>
                <div className="model-list">
                  {(ollamaModels?.models ?? []).map((model) => (
                    <span key={model}>{model}</span>
                  ))}
                </div>
              </article>
            </div>
          ) : null}

          {error ? <p className="error-line">{error}</p> : null}
        </article>

        <aside className="workspace-panel side-stack">
          <article className="glass-card deep">
            <span className="panel-tag">Recent backend changes</span>
            <div className="timeline">
              {history.slice(0, 6).map((item) => (
                <div key={`${item.service}-${item.changed_at}`} className="timeline-item">
                  <span className={`dot ${tone(item.state)}`} />
                  <div>
                    <strong>{prettyLabel(item.service)}</strong>
                    <p>{item.detail}</p>
                    <small>{new Date(item.changed_at).toLocaleTimeString()}</small>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="glass-card deep">
            <span className="panel-tag">Backend pulse</span>
            <div className="pulse-matrix">
              {services.map((service, index) => (
                <div key={service.name} className={`pulse-cell pulse-${index + 1}`}>
                  <strong>{prettyLabel(service.name)}</strong>
                  <span>{prettyLabel(service.state)}</span>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </section>

      <section className="bottom-rail" id="signal-grid">
        <article className="rail-card">
          <span className="panel-tag">Model status</span>
          <h3>{ollamaModels?.configured_model ?? "llama3.2:3b"}</h3>
          <p>Backend-selected model for workflow reasoning.</p>
        </article>
        <article className="rail-card">
          <span className="panel-tag">System health</span>
          <h3>{systemStatus ? prettyLabel(systemStatus.overall) : "Loading"}</h3>
          <p>Real-time backend state across all core services.</p>
        </article>
        <article className="rail-card">
          <span className="panel-tag">Navigation</span>
          <h3>Dropdown-driven</h3>
          <p>Switch between command center, flow, health, and model lab.</p>
        </article>
      </section>

      <section className="negotiation-console">
        <article className="workspace-panel negotiation-panel">
          <span className="panel-tag">WhatsApp Chrome input</span>
          <h3>Run a negotiation from chat</h3>
          <p>
            Send a message the same way the Chrome extension will send it later, and the backend will route it through the negotiation graph.
          </p>

          <form className="negotiation-form" onSubmit={handleNegotiationSubmit}>
            <textarea
              value={negotiationMessage}
              onChange={(event) => setNegotiationMessage(event.target.value)}
              rows={5}
              placeholder="Type a negotiation request for procurement, vendor sourcing, or price discussion..."
            />
            <button className="primary-action" type="submit" disabled={negotiationLoading}>
              {negotiationLoading ? "Negotiating..." : "Start negotiation"}
            </button>
          </form>

          {negotiationError ? <p className="error-line">{negotiationError}</p> : null}
        </article>

        <article className="workspace-panel negotiation-panel negotiation-output">
          <span className="panel-tag">Negotiation result</span>
          {negotiationResult ? (
            <>
              <h3>{negotiationResult.negotiation?.summary ?? "General AI response"}</h3>
              <p>{negotiationResult.assistant_reply}</p>
              <div className="negotiation-meta">
                <div>
                  <span>Route</span>
                  <strong>{negotiationResult.route}</strong>
                </div>
                <div>
                  <span>Task status</span>
                  <strong>{negotiationResult.task.status}</strong>
                </div>
                <div>
                  <span>Selected seller</span>
                  <strong>{negotiationResult.negotiation?.selected_seller?.name ?? "Not selected"}</strong>
                </div>
              </div>

              <div className="lead-clusters">
                <div>
                  <span className="mini-chip">Local sellers</span>
                  <div className="lead-list">
                    {(negotiationResult.negotiation?.local_sellers ?? []).map((seller) => (
                      <article key={`${seller.origin}-${seller.name}`} className="lead-card">
                        <strong>{seller.name}</strong>
                        <p>{seller.summary}</p>
                      </article>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="mini-chip">Online referrals</span>
                  <div className="lead-list">
                    {(negotiationResult.negotiation?.online_sellers ?? []).map((seller) => (
                      <article key={`${seller.origin}-${seller.name}`} className="lead-card">
                        <strong>{seller.name}</strong>
                        <p>{seller.summary}</p>
                      </article>
                    ))}
                  </div>
                </div>
              </div>

              <p className="negotiation-note">
                {negotiationResult.negotiation?.alternative_path ?? "Negotiation was not required for this request, so normal AI handling was used."}
              </p>
            </>
          ) : (
            <p className="negotiation-empty">Results from the backend will appear here after the first negotiation run.</p>
          )}
        </article>
      </section>
    </main>
  );
}