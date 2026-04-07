"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { VendorRecord, createClientId, loadVendors, saveVendors } from "../../lib/ops-data";

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
  const [vendors, setVendors] = useState<VendorRecord[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [vendorName, setVendorName] = useState("");
  const [projectName, setProjectName] = useState("Fresh stock replenishment");
  const [category, setCategory] = useState("Trusted local vendor");
  const [status, setStatus] = useState<VendorRecord["status"]>("Manual entry");
  const [leadTime, setLeadTime] = useState("Same day");
  const [trustLevel, setTrustLevel] = useState(85);
  const [contact, setContact] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVendors(loadVendors());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    saveVendors(vendors);
  }, [vendors, hydrated]);

  const resetForm = () => {
    setEditingVendorId(null);
    setVendorName("");
    setProjectName("Fresh stock replenishment");
    setCategory("Trusted local vendor");
    setStatus("Manual entry");
    setLeadTime("Same day");
    setTrustLevel(85);
    setContact("");
    setNotes("");
  };

  const filteredVendors = useMemo(() => {
    return vendors.filter((vendor) => {
      const matchesQuery =
        !searchQuery ||
        `${vendor.vendorName} ${vendor.projectName} ${vendor.category} ${vendor.notes}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || vendor.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [vendors, searchQuery, statusFilter]);

  const projectRows = useMemo(() => {
    return initialProjects.map((project) => {
      const assignedVendor = filteredVendors.find((vendor) => vendor.projectName === project.name);
      return {
        ...project,
        vendorName: assignedVendor?.vendorName ?? "Unassigned",
        status: assignedVendor?.status ?? "Needs vendor",
        trustLevel: assignedVendor?.trustLevel ?? 0,
        leadTime: assignedVendor?.leadTime ?? "-",
        contact: assignedVendor?.contact ?? "-"
      };
    });
  }, [filteredVendors]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!vendorName.trim()) {
      return;
    }

    const payload: VendorRecord = {
      id: editingVendorId ?? createClientId("vendor"),
      vendorName: vendorName.trim(),
      projectName: projectName.trim(),
      category: category.trim(),
      status,
      leadTime: leadTime.trim(),
      trustLevel,
      contact: contact.trim(),
      notes: notes.trim(),
      createdAt: new Date().toISOString()
    };

    setVendors((previous) => {
      if (!editingVendorId) {
        return [payload, ...previous];
      }
      return previous.map((vendor) => (vendor.id === editingVendorId ? payload : vendor));
    });

    resetForm();
  };

  const handleEdit = (vendor: VendorRecord) => {
    setEditingVendorId(vendor.id);
    setVendorName(vendor.vendorName);
    setProjectName(vendor.projectName);
    setCategory(vendor.category);
    setStatus(vendor.status);
    setLeadTime(vendor.leadTime);
    setTrustLevel(vendor.trustLevel);
    setContact(vendor.contact);
    setNotes(vendor.notes);
  };

  const handleDelete = (id: string) => {
    setVendors((previous) => previous.filter((vendor) => vendor.id !== id));
    if (editingVendorId === id) {
      resetForm();
    }
  };

  const handleApproveToggle = (id: string) => {
    setVendors((previous) =>
      previous.map((vendor) =>
        vendor.id === id
          ? { ...vendor, status: vendor.status === "Approved" ? "Pending review" : "Approved" }
          : vendor
      )
    );
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

      <nav className="operator-tabs" aria-label="Operator navigation">
        <Link href="/vendors" className="tab-link active">Vendors</Link>
        <Link href="/storage" className="tab-link">Storage</Link>
        <Link href="/settings" className="tab-link">Settings</Link>
      </nav>

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

      <section className="operator-panel operator-controls">
        <label>
          Search
          <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search vendor, project, notes" />
        </label>
        <label>
          Status
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="Approved">Approved</option>
            <option value="Pending review">Pending review</option>
            <option value="Manual entry">Manual entry</option>
            <option value="Blocked">Blocked</option>
          </select>
        </label>
      </section>

      <section className="operator-grid split-grid">
        <article className="operator-panel">
          <span className="panel-tag">Manual vendor entry</span>
          <h2>{editingVendorId ? "Edit trusted vendor" : "Add your trusted vendor"}</h2>
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
                Status
                <select value={status} onChange={(event) => setStatus(event.target.value as VendorRecord["status"])}>
                  <option value="Approved">Approved</option>
                  <option value="Pending review">Pending review</option>
                  <option value="Manual entry">Manual entry</option>
                  <option value="Blocked">Blocked</option>
                </select>
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
            <div className="row-actions">
              <button className="primary-action" type="submit">{editingVendorId ? "Update vendor" : "Save vendor"}</button>
              {editingVendorId ? (
                <button className="secondary-action" type="button" onClick={resetForm}>Cancel edit</button>
              ) : null}
            </div>
          </form>
        </article>

        <article className="operator-panel">
          <span className="panel-tag">Approved board</span>
          <h2>Trusted vendor list</h2>
          <div className="vendor-stack">
            {filteredVendors.map((vendor) => (
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
                <div className="row-actions">
                  <button className="secondary-action" type="button" onClick={() => handleEdit(vendor)}>Edit</button>
                  <button className="secondary-action" type="button" onClick={() => handleApproveToggle(vendor.id)}>
                    {vendor.status === "Approved" ? "Mark review" : "Approve"}
                  </button>
                  <button className="secondary-action" type="button" onClick={() => handleDelete(vendor.id)}>Delete</button>
                </div>
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
                <th>Actions</th>
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
                  <td>
                    {project.vendorName !== "Unassigned" ? (
                      <button
                        className="secondary-action"
                        type="button"
                        onClick={() => {
                          const vendor = vendors.find((item) => item.vendorName === project.vendorName);
                          if (vendor) {
                            handleEdit(vendor);
                          }
                        }}
                      >
                        Edit row
                      </button>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
