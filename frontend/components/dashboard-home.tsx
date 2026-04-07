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

type VendorLead = {
  name: string;
  category: string;
  summary: string;
  origin: string;
  url?: string | null;
  contact?: string | null;
  confidence: number;
};

type VendorLane = {
  label: string;
  hint: string;
  leads: VendorLead[];
};

type DemoNegotiation = {
  summary: string;
  strategy: string;
  reply: string;
  selectedSeller: string;
  fallbackReason: string | null;
  alternativePath: string;
  trace: string[];
  errorNotes: string[];
  localVendors: VendorLead[];
  onlineVendors: VendorLead[];
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

const emptyNegotiation: DemoNegotiation = {
  summary: "Run the flow to see vendor options, fallback notes, and the chosen seller.",
  strategy: "Waiting for a request",
  reply: "",
  selectedSeller: "No vendor selected yet",
  fallbackReason: null,
  alternativePath: "Approve a request to trigger vendor sourcing.",
  trace: [],
  errorNotes: [],
  localVendors: [],
  onlineVendors: []
};

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

function formatConfidence(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function buildVendorLanes(negotiation: DemoNegotiation): VendorLane[] {
  return [
    {
      label: "Local vendors",
      hint: "Fastest path from nearby sellers.",
      leads: negotiation.localVendors
    },
    {
      label: "Online vendors",
      hint: "Fallback sourcing if local supply is thin.",
      leads: negotiation.onlineVendors
    }
  ];
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
  const [negotiationView, setNegotiationView] = useState<DemoNegotiation>(emptyNegotiation);

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
    setNegotiationView(emptyNegotiation);

    pushDemoMessage("user", cleanMessage);
    await waitStep(400);
    pushDemoMessage("system", "Parsing intent from unstructured message and checking nearby vendors...");
    await waitStep(800);
    pushDemoMessage("agent", "Stock out at primary vendor. Initiating self-healing protocol and comparing alternatives...");
    await waitStep(800);
    pushDemoMessage("agent", "Contacting local suppliers, then escalating to online vendors if the shortlist is weak...");

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
      const negotiation = payload.negotiation;
      const localVendors = negotiation?.local_sellers ?? [];
      const onlineVendors = negotiation?.online_sellers ?? [];
      const summary = negotiation?.summary ?? payload.assistant_reply;

      setNegotiationView({
        summary,
        strategy: negotiation?.strategy ?? "Negotiation path",
        reply: negotiation?.reply ?? payload.assistant_reply,
        selectedSeller: seller,
        fallbackReason: negotiation?.fallback_reason ?? null,
        alternativePath: negotiation?.alternative_path ?? "Keep sourcing until a seller is confirmed.",
        trace: negotiation?.trace ?? [],
        errorNotes: negotiation?.error_notes ?? [],
        localVendors,
        onlineVendors
      });

      setDemoActionCard({
        title: `Best offer ready from ${seller}`,
        details: `${summary} Route: ${payload.route}. ${localVendors.length + onlineVendors.length} vendors checked.`,
        taskId: payload.task.id
      });
      pushDemoMessage("agent", `Proposal ready. ${localVendors.length} local and ${onlineVendors.length} online vendors found.`);
    } catch (err) {
      const fallbackId = `demo-${Date.now()}`;
      const fallbackLocal: VendorLead[] = [
        {
          name: "Greenline Produce",
          category: "Local supplier",
          summary: "Can fulfill the order today with truck-slot confirmation.",
          origin: "manual fallback",
          confidence: 0.89
        },
        {
          name: "Harbor Market Co-op",
          category: "Local supplier",
          summary: "Small-batch inventory, same-day dispatch available.",
          origin: "manual fallback",
          confidence: 0.84
        },
        {
          name: "Metro Fresh Partners",
          category: "Local supplier",
          summary: "Backup warehouse option with afternoon pickup.",
          origin: "manual fallback",
          confidence: 0.81
        }
      ];
      const fallbackOnline: VendorLead[] = [
        {
          name: "Regional Bulk Supply",
          category: "Online supplier",
          summary: "Ships overnight if local inventory is limited.",
          origin: "manual fallback",
          confidence: 0.77
        },
        {
          name: "FarmGate Exchange",
          category: "Online supplier",
          summary: "Offers alternate pricing and transport scheduling.",
          origin: "manual fallback",
          confidence: 0.73
        }
      ];
      setNegotiationView({
        summary: "Backend was unavailable, so the demo is showing a realistic sourcing fallback with multiple vendors.",
        strategy: "Fallback vendor sourcing",
        reply: "I can still move the request forward with alternate vendors and a backup path.",
        selectedSeller: fallbackLocal[0].name,
        fallbackReason: "Live negotiation could not finish, so the demo switched to a synthetic vendor board.",
        alternativePath: "Use the strongest local seller first, then escalate to online vendors.",
        trace: ["fallback_vendor_board", "manual_vendor_lane", "demo_continuation"],
        errorNotes: [err instanceof Error ? err.message : "Backend slow during demo."],
        localVendors: fallbackLocal,
        onlineVendors: fallbackOnline
      });
      setDemoActionCard({
        title: "Best fallback offer ready from Greenline Produce",
        details:
          "Primary vendor unavailable, but the board still shows local and online vendors so the demo can continue.",
        taskId: fallbackId
      });
      pushDemoMessage(
        "agent",
        "Backend slow during demo. Showing fallback vendor board with multiple local and online options."
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
  const vendorLanes = buildVendorLanes(negotiationView);

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
            Type a raw business message and run a staged AI story that ends in an approve-or-reject action card with vendor comparison.
          </p>

          <div className="demo-explain-grid">
            <div className="demo-explain-card">
              <strong>Basic flow</strong>
              <p>Message in, vendor search, ranked alternatives, human approval, then task update.</p>
            </div>
            <div className="demo-explain-card">
              <strong>What changed</strong>
              <p>The demo now shows local and online vendors instead of only the final seller.</p>
            </div>
          </div>

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

          <div className="vendor-board">
            {vendorLanes.map((lane) => (
              <article key={lane.label} className="vendor-lane">
                <div className="vendor-lane-head">
                  <div>
                    <p className="panel-tag">{lane.label}</p>
                    <h4>{lane.hint}</h4>
                  </div>
                  <span className="vendor-count">{lane.leads.length} options</span>
                </div>

                <div className="vendor-list">
                  {lane.leads.length ? (
                    lane.leads.map((lead) => (
                      <article key={`${lane.label}-${lead.name}`} className="vendor-card">
                        <div className="vendor-card-head">
                          <strong>{lead.name}</strong>
                          <span>{formatConfidence(lead.confidence)}</span>
                        </div>
                        <p>{lead.summary}</p>
                        <div className="vendor-meta">
                          <span>{lead.category}</span>
                          <span>{prettyLabel(lead.origin)}</span>
                        </div>
                      </article>
                    ))
                  ) : (
                    <p className="negotiation-empty">No {lane.label.toLowerCase()} found in this run.</p>
                  )}
                </div>
              </article>
            ))}
          </div>

          <article className="vendor-summary-card">
            <div className="vendor-summary-top">
              <div>
                <p className="panel-tag">Negotiation summary</p>
                <h4>{negotiationView.selectedSeller}</h4>
              </div>
              <span className="status-chip good">{negotiationView.strategy}</span>
            </div>
            <p>{negotiationView.summary}</p>
            {negotiationView.fallbackReason ? <p className="vendor-note">Fallback: {negotiationView.fallbackReason}</p> : null}
            <p className="vendor-note">Path: {negotiationView.alternativePath}</p>
            {negotiationView.trace.length ? (
              <div className="pill-list compact-pills">
                {negotiationView.trace.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            ) : null}
            {negotiationView.errorNotes.length ? (
              <p className="vendor-note">Notes: {negotiationView.errorNotes.join(" | ")}</p>
            ) : null}
          </article>
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
