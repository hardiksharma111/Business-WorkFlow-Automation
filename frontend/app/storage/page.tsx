"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { StorageItem, createClientId, loadStorageItems, saveStorageItems } from "../../lib/ops-data";

function lowStock(items: StorageItem[]): StorageItem[] {
  return items.filter((item) => item.onHand <= item.reorderPoint);
}

export default function StoragePage() {
  const [items, setItems] = useState<StorageItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [itemName, setItemName] = useState("Bell peppers");
  const [sku, setSku] = useState("FR-009");
  const [bin, setBin] = useState("A-08");
  const [section, setSection] = useState("Cold storage");
  const [onHand, setOnHand] = useState(48);
  const [reserved, setReserved] = useState(6);
  const [reorderPoint, setReorderPoint] = useState(24);
  const [expiry, setExpiry] = useState("2026-04-20");
  const [condition, setCondition] = useState("Fresh");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(loadStorageItems());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    saveStorageItems(items);
  }, [items, hydrated]);

  const resetForm = () => {
    setEditingItemId(null);
    setItemName("Bell peppers");
    setSku("FR-009");
    setBin("A-08");
    setSection("Cold storage");
    setOnHand(48);
    setReserved(6);
    setReorderPoint(24);
    setExpiry("2026-04-20");
    setCondition("Fresh");
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesQuery =
        !searchQuery ||
        `${item.itemName} ${item.sku} ${item.bin} ${item.section}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      const matchesSection = sectionFilter === "all" || item.section === sectionFilter;
      const isLowStock = item.onHand <= item.reorderPoint;
      const matchesStock = stockFilter === "all" || (stockFilter === "low" ? isLowStock : !isLowStock);
      return matchesQuery && matchesSection && matchesStock;
    });
  }, [items, searchQuery, sectionFilter, stockFilter]);

  const uniqueSections = useMemo(() => {
    return ["all", ...new Set(items.map((item) => item.section))];
  }, [items]);

  const totals = useMemo(() => {
    const totalUnits = items.reduce((sum, item) => sum + item.onHand, 0);
    const reservedUnits = items.reduce((sum, item) => sum + item.reserved, 0);
    const openBays = items.filter((item) => item.onHand > item.reorderPoint).length;
    const lowStockCount = lowStock(items).length;

    return { totalUnits, reservedUnits, openBays, lowStockCount };
  }, [items]);

  const binCards = useMemo(() => {
    return filteredItems.map((item) => ({
      title: `${item.bin} · ${item.section}`,
      subtitle: item.itemName,
      fill: Math.min(100, Math.round((item.onHand / Math.max(item.reorderPoint, item.onHand)) * 100)),
      detail: `${item.onHand} on hand · ${item.reserved} reserved`
    }));
  }, [filteredItems]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!itemName.trim()) {
      return;
    }

    const payload: StorageItem = {
      id: editingItemId ?? createClientId("storage"),
      itemName: itemName.trim(),
      sku: sku.trim(),
      bin: bin.trim(),
      section: section.trim(),
      onHand,
      reserved,
      reorderPoint,
      expiry,
      condition,
      createdAt: new Date().toISOString()
    };

    setItems((previous) => {
      if (!editingItemId) {
        return [payload, ...previous];
      }
      return previous.map((item) => (item.id === editingItemId ? payload : item));
    });

    resetForm();
  };

  const handleEdit = (item: StorageItem) => {
    setEditingItemId(item.id);
    setItemName(item.itemName);
    setSku(item.sku);
    setBin(item.bin);
    setSection(item.section);
    setOnHand(item.onHand);
    setReserved(item.reserved);
    setReorderPoint(item.reorderPoint);
    setExpiry(item.expiry);
    setCondition(item.condition);
  };

  const handleDelete = (id: string) => {
    setItems((previous) => previous.filter((item) => item.id !== id));
    if (editingItemId === id) {
      resetForm();
    }
  };

  const adjustStock = (id: string, change: number) => {
    setItems((previous) =>
      previous.map((item) =>
        item.id === id
          ? { ...item, onHand: Math.max(0, item.onHand + change) }
          : item
      )
    );
  };

  return (
    <main className="operator-shell">
      <header className="operator-header">
        <div>
          <span className="eyebrow">Storage tab</span>
          <h1>Warehouse stock view</h1>
          <p>
            Track what is currently in the warehouse, where each item sits, and which bins are close to reorder.
          </p>
        </div>
        <div className="operator-actions">
          <Link className="secondary-action" href="/">
            Dashboard
          </Link>
          <Link className="secondary-action" href="/vendors">
            Vendors
          </Link>
          <Link className="secondary-action" href="/settings">
            Settings
          </Link>
        </div>
      </header>

      <nav className="operator-tabs" aria-label="Operator navigation">
        <Link href="/vendors" className="tab-link">Vendors</Link>
        <Link href="/storage" className="tab-link active">Storage</Link>
        <Link href="/settings" className="tab-link">Settings</Link>
      </nav>

      <section className="operator-stats">
        <article className="operator-stat-card">
          <span>Current storage</span>
          <strong>{totals.totalUnits}</strong>
          <p>Total units on hand across the warehouse.</p>
        </article>
        <article className="operator-stat-card">
          <span>Reserved stock</span>
          <strong>{totals.reservedUnits}</strong>
          <p>Inventory already earmarked for pending jobs.</p>
        </article>
        <article className="operator-stat-card">
          <span>Low stock bins</span>
          <strong>{totals.lowStockCount}</strong>
          <p>Items that should trigger replenishment soon.</p>
        </article>
      </section>

      <section className="operator-panel operator-controls">
        <label>
          Search
          <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search item, SKU, bin" />
        </label>
        <label>
          Section
          <select value={sectionFilter} onChange={(event) => setSectionFilter(event.target.value)}>
            {uniqueSections.map((entry) => (
              <option key={entry} value={entry}>{entry === "all" ? "All sections" : entry}</option>
            ))}
          </select>
        </label>
        <label>
          Stock state
          <select value={stockFilter} onChange={(event) => setStockFilter(event.target.value)}>
            <option value="all">All items</option>
            <option value="low">Low stock only</option>
            <option value="healthy">Healthy stock only</option>
          </select>
        </label>
      </section>

      <section className="operator-grid split-grid">
        <article className="operator-panel">
          <span className="panel-tag">Receive stock</span>
          <h2>{editingItemId ? "Edit warehouse item" : "Manual warehouse entry"}</h2>
          <form className="vendor-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <label>
                Item name
                <input value={itemName} onChange={(event) => setItemName(event.target.value)} placeholder="Bell peppers" />
              </label>
              <label>
                SKU
                <input value={sku} onChange={(event) => setSku(event.target.value)} placeholder="FR-009" />
              </label>
              <label>
                Bin
                <input value={bin} onChange={(event) => setBin(event.target.value)} placeholder="A-08" />
              </label>
              <label>
                Section
                <input value={section} onChange={(event) => setSection(event.target.value)} placeholder="Cold storage" />
              </label>
              <label>
                On hand
                <input type="number" value={onHand} onChange={(event) => setOnHand(Number(event.target.value))} />
              </label>
              <label>
                Reserved
                <input type="number" value={reserved} onChange={(event) => setReserved(Number(event.target.value))} />
              </label>
              <label>
                Reorder point
                <input type="number" value={reorderPoint} onChange={(event) => setReorderPoint(Number(event.target.value))} />
              </label>
              <label>
                Expiry
                <input type="date" value={expiry} onChange={(event) => setExpiry(event.target.value)} />
              </label>
            </div>
            <label>
              Condition
              <input value={condition} onChange={(event) => setCondition(event.target.value)} placeholder="Fresh" />
            </label>
            <div className="row-actions">
              <button className="primary-action" type="submit">{editingItemId ? "Update item" : "Store item"}</button>
              {editingItemId ? (
                <button className="secondary-action" type="button" onClick={resetForm}>Cancel edit</button>
              ) : null}
            </div>
          </form>
        </article>

        <article className="operator-panel">
          <span className="panel-tag">Bin map</span>
          <h2>Warehouse snapshot</h2>
          <div className="storage-map">
            {binCards.map((card) => (
              <article key={card.title} className="storage-bin-card">
                <div className="storage-bin-head">
                  <strong>{card.title}</strong>
                  <span>{card.fill}% full</span>
                </div>
                <p>{card.subtitle}</p>
                <div className="storage-bar"><span style={{ width: `${card.fill}%` }} /></div>
                <small>{card.detail}</small>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="operator-panel table-panel">
        <div className="panel-heading-row">
          <div>
            <span className="panel-tag">Inventory table</span>
            <h2>Live warehouse stock</h2>
          </div>
          <span className="helper-pill">Operational storage view</span>
        </div>
        <div className="table-scroll">
          <table className="operator-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Item</th>
                <th>Bin</th>
                <th>Section</th>
                <th>On hand</th>
                <th>Reserved</th>
                <th>Reorder</th>
                <th>Expiry</th>
                <th>Condition</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.sku}</td>
                  <td>
                    <strong>{item.itemName}</strong>
                  </td>
                  <td>{item.bin}</td>
                  <td>{item.section}</td>
                  <td>{item.onHand}</td>
                  <td>{item.reserved}</td>
                  <td>{item.reorderPoint}</td>
                  <td>{item.expiry}</td>
                  <td>{item.condition}</td>
                  <td>
                    <div className="row-actions compact">
                      <button className="secondary-action" type="button" onClick={() => adjustStock(item.id, 10)}>+10</button>
                      <button className="secondary-action" type="button" onClick={() => adjustStock(item.id, -10)}>-10</button>
                      <button className="secondary-action" type="button" onClick={() => handleEdit(item)}>Edit</button>
                      <button className="secondary-action" type="button" onClick={() => handleDelete(item.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="operator-panel alert-panel">
        <span className="panel-tag">Alerts</span>
        <h2>Stock to review</h2>
        <div className="alert-list">
          {lowStock(filteredItems).length ? (
            lowStock(filteredItems).map((item) => (
              <article key={item.id} className="alert-card">
                <strong>{item.itemName}</strong>
                <p>{item.onHand} units remain in {item.bin}. Reorder point is {item.reorderPoint}.</p>
              </article>
            ))
          ) : (
            <p className="operator-note">No low stock alerts right now.</p>
          )}
        </div>
      </section>
    </main>
  );
}
