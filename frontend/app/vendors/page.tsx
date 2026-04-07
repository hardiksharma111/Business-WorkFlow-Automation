"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

type VendorRecord = {
  id: string;
  vendorName: string;
  projectName: string;
  category: string;
  status: string;
  leadTime: string;
  trustLevel: number;
  contact: string;
  notes: string;
};

const initialVendors: VendorRecord[] = [
  {
    id: "vendor-1",
    vendorName: "Greenline Produce",
    projectName: "Fresh stock replenishment",
    category: "Local supplier",
    status: "Approved",
    leadTime: "Same day",
    trustLevel: 92,
    contact: "orders@greenline.example",
    notes: "Primary local pickup lane for produce orders."
  },
  {
    id: "vendor-2",
    vendorName: "Harbor Market Co-op",
    projectName: "Weekend rescue orders",
    category: "Co-op backup",
    status: "Pending review",
    leadTime: "4 hours",
    trustLevel: 84,
    contact: "dispatch@harbor.example",
    notes: "Best for short-notice replenishment with limited quantities."
  },
  {
    id: "vendor-3",
    vendorName: "Regional Bulk Supply",
    projectName: "Overflow procurement",
    category: "Online vendor",
    status: "Approved",
    leadTime: "Overnight",
    trustLevel: 79,
    contact: "sales@regionalbulk.example",
    notes: "Used when local inventory is too thin or the request is large."
  }
];

const initialProjects = [
  { name: "Fresh stock replenishment", owner: "Operations", ownerContact: "ops@demo.example", risk: "Low" },
  { name: "Weekend rescue orders", owner: "Procurement", ownerContact: "buying@demo.example", risk: "Medium" },
  { name: "Overflow procurement", owner: "Fulfillment", ownerContact: "fulfillment@demo.example", risk: "Medium" },
  { name: "New vendor onboarding", owner: "Vendor desk", ownerContact: "vendors@demo.example", risk: "Open" }
];

function prettyLabel(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<VendorRecord[]>(initialVendors);
  const [vendorName, setVendorName] = useState("");
  const [projectName, setProjectName] = useState("Fresh stock replenishment");
  const [category, setCategory] = useState("Trusted local vendor");
  const [leadTime, setLeadTime] = useState("Same day");
  const [trustLevel, setTrustLevel] = useState(85);
  const [contact, setContact] = useState("");
  const [notes, setNotes] = useState("");

  const projectRows = useMemo(() => {
    return initialProjects.map((project) => {
      const assignedVendor = vendors.find((vendor) => vendor.projectName === project.name);
      return {
        ...project,
        vendorName: assignedVendor?.vendorName ?? "Unassigned",
        status: assignedVendor?.status ?? "Needs vendor",
        trustLevel: assignedVendor?.trustLevel ?? 0,
        leadTime: assignedVendor?.leadTime ?? "-",
        contact: assignedVendor?.contact ?? "-"
      };
    });
  }, [vendors]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!vendorName.trim()) {
      return;
    }

    setVendors((previous) => [
      {
        id: `vendor-${Date.now()}`,
        vendorName: vendorName.trim(),
        projectName: projectName.trim(),
        category: category.trim(),
        status: "Manual entry",
        leadTime: leadTime.trim(),
        trustLevel,
        contact: contact.trim(),
        notes: notes.trim()
      },
      ...previous
    ]);

    setVendorName("");
    setContact("");
    setNotes("");
    setTrustLevel(85);
  };

  return (
    <main className="operator-shell">
      <header className="operator-header">
        <div>
          <span className="eyebrow">Vendor desk</span>
          <h1>Trusted vendor board</h1>
          <p>
            Track who is approved, which project they support, and what backup path is ready if the first offer falls through.
          </p>
        </div>
        <div className="operator-actions">
          <Link className="secondary-action" href="/">
            Dashboard
          </Link>
          <Link className="secondary-action" href="/storage">
            Storage
          </Link>
          <Link className="secondary-action" href="/settings">
            Settings
          </Link>
        </div>
      </header>

      <section className="operator-stats">
        <article className="operator-stat-card">
          <span>Trusted vendors</span>
          <strong>{vendors.filter((vendor) => vendor.status === "Approved").length}</strong>
          <p>Approved for active sourcing.</p>
        </article>
        <article className="operator-stat-card">
          <span>Project lanes</span>
          <strong>{initialProjects.length}</strong>
          <p>Workstreams that need vendor coverage.</p>
        </article>
        <article className="operator-stat-card">
          <span>Manual entries</span>
          <strong>{vendors.length}</strong>
          <p>Includes the seeded vendors and any user-added records.</p>
        </article>
      </section>

      <section className="operator-grid split-grid">
        <article className="operator-panel">
          <span className="panel-tag">Manual vendor entry</span>
          <h2>Add your trusted vendor</h2>
          <form className="vendor-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <label>
                Vendor name
                <input value={vendorName} onChange={(event) => setVendorName(event.target.value)} placeholder="Northline Foods" />
              </label>
              <label>
                Project
                <input value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Fresh stock replenishment" />
              </label>
              <label>
                Category
                <input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Trusted local vendor" />
              </label>
              <label>
                Lead time
                <input value={leadTime} onChange={(event) => setLeadTime(event.target.value)} placeholder="Same day" />
              </label>
              <label>
                Trust score
                <input type="range" min="50" max="100" value={trustLevel} onChange={(event) => setTrustLevel(Number(event.target.value))} />
                <span className="range-label">{trustLevel}%</span>
              </label>
              <label>
                Contact
                <input value={contact} onChange={(event) => setContact(event.target.value)} placeholder="orders@northline.example" />
              </label>
            </div>
            <label>
              Notes
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} placeholder="Coverage notes, ordering windows, fallback rules." />
            </label>
            <button className="primary-action" type="submit">Save vendor</button>
          </form>
        </article>

        <article className="operator-panel">
          <span className="panel-tag">Approved board</span>
          <h2>Trusted vendor list</h2>
          <div className="vendor-stack">
            {vendors.map((vendor) => (
              <article key={vendor.id} className="vendor-stack-card">
                <div className="vendor-stack-head">
                  <div>
                    <strong>{vendor.vendorName}</strong>
                    <p>{vendor.projectName}</p>
                  </div>
                  <span>{vendor.trustLevel}% trusted</span>
                </div>
                <div className="vendor-stack-meta">
                  <span>{prettyLabel(vendor.category)}</span>
                  <span>{vendor.leadTime}</span>
                  <span>{prettyLabel(vendor.status)}</span>
                </div>
                <p>{vendor.notes}</p>
                <small>{vendor.contact}</small>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="operator-panel table-panel">
        <div className="panel-heading-row">
          <div>
            <span className="panel-tag">Project table</span>
            <h2>Vendor coverage by project</h2>
          </div>
          <span className="helper-pill">Manual assignment view</span>
        </div>
        <div className="table-scroll">
          <table className="operator-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Vendor</th>
                <th>Status</th>
                <th>Lead time</th>
                <th>Trust</th>
                <th>Contact</th>
                <th>Risk</th>
              </tr>
            </thead>
            <tbody>
              {projectRows.map((project) => (
                <tr key={project.name}>
                  <td>
                    <strong>{project.name}</strong>
                  </td>
                  <td>{project.vendorName}</td>
                  <td>{project.status}</td>
                  <td>{project.leadTime}</td>
                  <td>{project.trustLevel ? `${project.trustLevel}%` : "-"}</td>
                  <td>{project.contact}</td>
                  <td>{project.risk}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
