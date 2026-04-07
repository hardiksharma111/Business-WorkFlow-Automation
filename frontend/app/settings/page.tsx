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

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

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

const backendSurfaces = [
  { label: "Chat route", value: "/api/v1/chat", detail: "Negotiation and demo runs" },
  { label: "Task patching", value: "/api/v1/workflows/tasks/{id}", detail: "Approve or complete actions" },
  { label: "System status", value: "/api/v1/system/status", detail: "Service health and uptime" },
  { label: "Analytics", value: "/api/v1/analytics/overview", detail: "Workflow metrics and trends" },
  { label: "Model lab", value: "/api/v1/system/ollama/models", detail: "Configured and available models" }
];

export default function SettingsPage() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [analytics, setAnalytics] = useState<WorkflowAnalyticsResponse | null>(null);
  const [models, setModels] = useState<OllamaModelsResponse | null>(null);
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const [status, nextAnalytics, nextModels, nextTasks] = await Promise.all([
          fetchJson<SystemStatus>(`${API_BASE}/api/v1/system/status`),
          fetchJson<WorkflowAnalyticsResponse>(`${API_BASE}/api/v1/analytics/overview?limit=50`),
          fetchJson<OllamaModelsResponse>(`${API_BASE}/api/v1/system/ollama/models`),
          fetchJson<WorkflowTask[]>(`${API_BASE}/api/v1/workflows/tasks?limit=8`)
        ]);

        if (mounted) {
          setSystemStatus(status);
          setAnalytics(nextAnalytics);
          setModels(nextModels);
          setTasks(nextTasks);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Unable to load settings data.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();

    const timer = setInterval(load, 7000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const serviceCards = useMemo(() => systemStatus?.services ?? [], [systemStatus]);

  return (
    <main className="settings-shell">
      <header className="settings-header">
        <div>
          <span className="eyebrow">System settings</span>
          <h1>Backend and automation controls</h1>
          <p>
            All operational controls live here. The homepage stays focused on the chat demo.
          </p>
        </div>
        <div className="settings-actions">
          <Link className="secondary-action" href="/vendors">
            Vendors
          </Link>
          <Link className="secondary-action" href="/storage">
            Storage
          </Link>
          <Link className="secondary-action" href="/">
            Back to dashboard
          </Link>
        </div>
      </header>

      <section className="settings-grid">
        <article className="settings-card">
          <h2>System status</h2>
          <p>{systemStatus ? prettyLabel(systemStatus.overall) : loading ? "Loading..." : "Unavailable"}</p>
          <div className="settings-list">
            {serviceCards.map((service) => (
              <div key={service.name} className="settings-row">
                <strong>{prettyLabel(service.name)}</strong>
                <span>{prettyLabel(service.state)}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="settings-card">
          <h2>Model lab</h2>
          <p>Configured model: {models?.configured_model ?? "Loading..."}</p>
          <div className="pill-list">
            {(models?.models ?? []).map((model) => (
              <span key={model}>{model}</span>
            ))}
          </div>
        </article>

        <article className="settings-card">
          <h2>Backend surfaces</h2>
          <p>All key backend endpoints and their job in the demo flow.</p>
          <div className="settings-list">
            {backendSurfaces.map((surface) => (
              <div key={surface.label} className="settings-row">
                <div>
                  <strong>{surface.label}</strong>
                  <span>{surface.detail}</span>
                </div>
                <code>{surface.value}</code>
              </div>
            ))}
          </div>
        </article>

        <article className="settings-card">
          <h2>Workflow analytics</h2>
          <div className="settings-list compact-grid">
            <div className="settings-stat"><span>Total</span><strong>{analytics?.total_tasks ?? 0}</strong></div>
            <div className="settings-stat"><span>Complete</span><strong>{analytics?.completed_tasks ?? 0}</strong></div>
            <div className="settings-stat"><span>Pending</span><strong>{analytics?.pending_tasks ?? 0}</strong></div>
            <div className="settings-stat"><span>Failures</span><strong>{analytics?.failed_tasks ?? 0}</strong></div>
          </div>
        </article>

        <article className="settings-card">
          <h2>Recent tasks</h2>
          <div className="settings-list">
            {tasks.map((task) => (
              <details key={task.id} className="settings-details">
                <summary>
                  <strong>{prettyLabel(task.intent)}</strong>
                  <span>{task.status}</span>
                </summary>
                <p>{task.message}</p>
                <p>Recommended action: {task.recommended_action}</p>
              </details>
            ))}
          </div>
        </article>
      </section>

      {error ? <p className="error-line">{error}</p> : null}
    </main>
  );
}