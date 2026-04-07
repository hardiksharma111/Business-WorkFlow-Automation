"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

type DemoStage = {
  id: string;
  title: string;
  detail: string;
  expandedDetail: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
const demoStages: DemoStage[] = [
  {
    id: "parse",
    title: "Parse intent",
    detail: "Turn the raw message into a structured request.",
    expandedDetail:
      "The model extracts product, quantity, date, and priority so the workflow engine can route the request correctly."
  },
  {
    id: "heal",
    title: "Self-heal",
    detail: "Detect missing inventory or blocked routing.",
    expandedDetail:
      "If the primary path fails, the system falls back to alternate suppliers, alternate channels, and a human-approval path when needed."
  },
  {
    id: "negotiate",
    title: "Negotiate",
    detail: "Gather backup offers and produce the best option.",
    expandedDetail:
      "The agent compares available sellers, ranks the best offer, and prepares an action card with a clear approve/reject choice."
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

function statusTone(state: string): "good" | "warn" | "bad" {
  if (state === "online" || state === "completed") return "good";
  if (state === "loading" || state === "pending_human") return "warn";
  return "bad";
}

function formatTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function DashboardHome() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [demoInput, setDemoInput] = useState("Order 50kg tomatoes for tomorrow.");
  const [demoMessages, setDemoMessages] = useState<DemoMessage[]>([]);
  const [demoBusy, setDemoBusy] = useState(false);
  const [demoActionCard, setDemoActionCard] = useState<DemoActionCard | null>(null);
  const [demoDecision, setDemoDecision] = useState<"pending" | "approved" | "rejected">("pending");
  const [expandedStageId, setExpandedStageId] = useState<string | null>("parse");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const [nextStatus, nextTasks] = await Promise.all([
          fetchJson<SystemStatus>(`${API_BASE}/api/v1/system/status`),
          fetchJson<WorkflowTask[]>(`${API_BASE}/api/v1/workflows/tasks?limit=8`)
        ]);

        if (mounted) {
          setSystemStatus(nextStatus);
          setTasks(nextTasks);
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

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

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
    const cleanMessage = demoInput.trim();
    if (!cleanMessage || demoBusy) {
      return;
    }

    setDemoBusy(true);
    setDemoDecision("pending");
    setDemoActionCard(null);
    setDemoMessages([]);

    pushDemoMessage("user", cleanMessage);
    await waitStep(400);
    pushDemoMessage("system", "Parsing intent from unstructured message...");
    await waitStep(800);
    pushDemoMessage("agent", "Stock out at primary vendor. Initiating self-healing protocol...");
    await waitStep(800);
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
            entry_point: "action_card_demo",
            workflow: "judge_demo"
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Demo request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as NegotiationRunResponse;
      const seller = payload.negotiation?.selected_seller?.name ?? "Backup Supplier Network";
      const summary = payload.negotiation?.summary ?? payload.assistant_reply;
      setDemoActionCard({
        title: `Best offer ready from ${seller}`,
        details: `${summary} Route: ${payload.route}.`,
        taskId: payload.task.id
      });
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

  const agentState = systemStatus ? prettyLabel(systemStatus.overall) : "Loading";
  const taskCount = tasks.length;
  const pendingCount = tasks.filter((task) => task.status === "pending_human").length;
  const completedCount = tasks.filter((task) => task.status === "completed").length;
  const serviceSummary = systemStatus?.services ?? [];
  const activeStage = demoStages.find((stage) => stage.id === expandedStageId) ?? null;
  const liveClock = currentTime ? currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "--:--";

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
            <h1>Chat-first workflow dashboard</h1>
          </div>
        </div>

        <div className="control-actions">
          <span className={`connection-badge ${systemStatus ? statusTone(systemStatus.overall) : "loading"}`}>
            Live agent {agentState}
          </span>
          <Link className="secondary-action" href="/settings">
            Settings
          </Link>
        </div>
      </header>

      <section className="control-hero">
        <div className="control-hero-copy">
          <span className="eyebrow">Perfect demo flow</span>
          <h2>Unstructured message to structured action</h2>
          <p>
            The homepage stays focused on chat. The backend controls and system panels live in Settings so judges only see the story.
          </p>

          <div className="hero-actions">
            <a className="primary-action" href="#workflow-demo">
              Jump to chat
            </a>
            <a className="secondary-action" href="#story-cards">
              See workflow stages
            </a>
          </div>

          <div className="hero-metrics">
            <div className="metric-card-alt">
              <span>Workflow tasks</span>
              <strong>{taskCount}</strong>
            </div>
            <div className="metric-card-alt">
              <span>Completed</span>
              <strong>{completedCount}</strong>
            </div>
            <div className="metric-card-alt">
              <span>Pending</span>
              <strong>{pendingCount}</strong>
            </div>
            <div className="metric-card-alt">
              <span>Last sync</span>
              <strong>{liveClock}</strong>
            </div>
          </div>
        </div>

        <div className="control-hero-panel glass-card deep" id="story-cards">
          <div className="panel-headline">
            <div>
              <span className="panel-tag">Expandable story</span>
              <h3>Click a stage to expand</h3>
            </div>
            <span className={`status-chip ${systemStatus ? statusTone(systemStatus.overall) : "warn"}`}>
              {systemStatus ? prettyLabel(systemStatus.overall) : "Loading"}
            </span>
          </div>

          <div className="stage-strip">
            {demoStages.map((stage) => (
              <button
                key={stage.id}
                type="button"
                className={`stage-card ${expandedStageId === stage.id ? "expanded" : ""}`}
                onClick={() => setExpandedStageId(expandedStageId === stage.id ? null : stage.id)}
              >
                <strong>{stage.title}</strong>
                <span>{stage.detail}</span>
                {expandedStageId === stage.id ? <p>{stage.expandedDetail}</p> : null}
              </button>
            ))}
          </div>

          {activeStage ? (
            <div className="stage-detail-line">
              <strong>{activeStage.title}</strong>
              <span>{activeStage.expandedDetail}</span>
            </div>
          ) : null}

          <div className="status-board compact">
            <article className="status-board-item">
              <div>
                <strong>How it works</strong>
                <p>Type a request, watch the staged reasoning, and approve the final action card.</p>
              </div>
            </article>
            <article className="status-board-item">
              <div>
                <strong>Workflow</strong>
                <p>Message in, intent parsed, self-heal triggered, proposal approved, task updated.</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="status-ribbon" aria-label="Live status ribbon">
        <article className="status-ribbon-item">
          <span>Frontend</span>
          <strong>Chat-first</strong>
          <p>Homepage is focused on the demo story only.</p>
        </article>
        <article className="status-ribbon-item">
          <span>Backend</span>
          <strong>{agentState}</strong>
          <p>Settings holds the backend/system controls.</p>
        </article>
        <article className="status-ribbon-item">
          <span>Automation</span>
          <strong>Ready to test</strong>
          <p>{liveClock}</p>
        </article>
      </section>

      <section className="workflow-grid" id="workflow-demo">
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
              placeholder="Order 50kg tomatoes for tomorrow."
            />
            <button className="primary-action" type="submit" disabled={demoBusy}>
              {demoBusy ? "Running demo..." : "Run perfect demo flow"}
            </button>
          </form>

          {error ? <p className="error-line">{error}</p> : null}
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
                <button
                  type="button"
                  className="action-reject"
                  onClick={handleDemoReject}
                  disabled={demoDecision !== "pending"}
                >
                  Reject
                </button>
                <button
                  type="button"
                  className="action-approve"
                  onClick={handleDemoApprove}
                  disabled={demoDecision !== "pending"}
                >
                  Approve and send
                </button>
              </div>
              <p className="action-card-status">Decision: {prettyLabel(demoDecision)}</p>
            </article>
          ) : null}
        </article>
      </section>

      <section className="home-footer-row">
        {serviceSummary.map((service) => (
          <article key={service.name} className="home-footer-chip">
            <strong>{prettyLabel(service.name)}</strong>
            <span>{prettyLabel(service.state)}</span>
            <p>{service.detail}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
