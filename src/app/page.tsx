const metrics = [
  { value: "94%", label: "faster approval cycles" },
  { value: "18 hrs", label: "saved per team each week" },
  { value: "240+", label: "workflow actions automated" }
];

const features = [
  {
    title: "Approval routing",
    description:
      "Send requests to the right people automatically based on department, amount, urgency, or customer tier."
  },
  {
    title: "Smart handoffs",
    description:
      "Move work between sales, finance, operations, and support without losing context or status."
  },
  {
    title: "Live visibility",
    description:
      "See every request, bottleneck, and SLA in one command center with calm, readable reporting."
  },
  {
    title: "Trigger-based automations",
    description:
      "Launch tasks from form submissions, Slack messages, CRM updates, or custom business rules."
  },
  {
    title: "Audit-ready history",
    description:
      "Keep a clean trail of changes, owners, timestamps, and decisions for compliance and review."
  },
  {
    title: "Cross-team templates",
    description:
      "Reuse proven workflows for onboarding, procurement, service requests, and internal approvals."
  }
];

const steps = [
  {
    title: "Capture",
    description:
      "Collect requests from forms, emails, chat, or integrations into one intake layer."
  },
  {
    title: "Orchestrate",
    description:
      "Route each task with rules, approvals, and automations that adapt to the business context."
  },
  {
    title: "Resolve",
    description:
      "Keep stakeholders informed, close the loop, and surface performance metrics automatically."
  }
];

const activity = [
  { name: "Finance approval", status: "Waiting on manager", time: "2 min ago" },
  { name: "Onboarding flow", status: "Triggered from CRM", time: "7 min ago" },
  { name: "Support escalation", status: "Resolved automatically", time: "11 min ago" }
];

export default function Home() {
  return (
    <main className="page-shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />

      <section className="hero-section">
        <header className="topbar">
          <div className="brand-mark">
            <span className="brand-dot" />
            FlowPilot
          </div>
          <nav className="topnav" aria-label="Primary">
            <a href="#features">Features</a>
            <a href="#process">Process</a>
            <a href="/operations">Operations</a>
            <a href="#contact">Contact</a>
          </nav>
        </header>

        <div className="hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">Business workflow automation</span>
            <h1>
              Design a cleaner operating system for how work moves through your business.
            </h1>
            <p className="hero-text">
              A premium website template for teams that need faster approvals, transparent handoffs,
              and a single place to manage repeatable business operations.
            </p>

            <div className="hero-actions">
              <a className="primary-action" href="#contact">
                Book a demo
              </a>
              <a className="secondary-action" href="#features">
                Explore features
              </a>
            </div>

            <div className="stats-row" aria-label="Key metrics">
              {metrics.map((metric) => (
                <article key={metric.label} className="metric-card">
                  <strong>{metric.value}</strong>
                  <span>{metric.label}</span>
                </article>
              ))}
            </div>
          </div>

          <div className="hero-panel" aria-label="Workflow dashboard preview">
            <div className="panel-header">
              <div>
                <p className="panel-kicker">Operations dashboard</p>
                <h2>Live workflow control</h2>
              </div>
              <span className="status-pill">Online</span>
            </div>

            <div className="panel-visual">
              <div className="visual-card visual-card-large">
                <span className="visual-label">Approval chain</span>
                <div className="flow-chain">
                  <span>Request</span>
                  <span>Rules</span>
                  <span>Owner</span>
                  <span>Done</span>
                </div>
                <div className="progress-bar">
                  <span />
                </div>
              </div>

              <div className="visual-card visual-card-small">
                <span className="visual-label">Automation health</span>
                <strong>99.4%</strong>
                <p>Successful task completion this week.</p>
              </div>

              <div className="visual-card visual-card-small accent-card">
                <span className="visual-label">Active queue</span>
                <strong>12 requests</strong>
                <p>Across operations, finance, and support.</p>
              </div>
            </div>

            <div className="activity-list">
              {activity.map((item) => (
                <article key={item.name} className="activity-item">
                  <div>
                    <strong>{item.name}</strong>
                    <p>{item.status}</p>
                  </div>
                  <time>{item.time}</time>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="content-section" id="features">
        <div className="section-heading">
          <span className="eyebrow">Core capabilities</span>
          <h2>Everything you need to automate business processes without losing control.</h2>
          <p>
            Built for teams that want speed, consistency, and clarity across every recurring workflow.
          </p>
        </div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <article key={feature.title} className="feature-card">
              <span className="feature-index">0{index + 1}</span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="content-section process-section" id="process">
        <div className="section-heading compact">
          <span className="eyebrow">How it works</span>
          <h2>Move from request to resolution in three simple stages.</h2>
        </div>

        <div className="steps-grid">
          {steps.map((step, index) => (
            <article key={step.title} className="step-card">
              <span className="step-number">{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="cta-section" id="contact">
        <div className="cta-card">
          <div>
            <span className="eyebrow">Ready to launch</span>
            <h2>Use this template as the front door for your automation product or service.</h2>
            <p>
              Clean structure, modern styling, and a business-first layout that can be adapted to your
              exact workflow platform.
            </p>
          </div>
          <a className="primary-action dark" href="mailto:hello@flowpilot.app">
            Start the conversation
          </a>
        </div>
      </section>
    </main>
  );
}
