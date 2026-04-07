"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

type StorageItem = {
  id: string;
  sku: string;
  itemName: string;
  bin: string;
  section: string;
  onHand: number;
  reserved: number;
  reorderPoint: number;
  expiry: string;
  condition: string;
};

const initialStorage: StorageItem[] = [
  {
    id: "storage-1",
    sku: "FR-001",
    itemName: "Tomatoes",
    bin: "A-12",
    section: "Cold storage",
    onHand: 128,
    reserved: 22,
    reorderPoint: 40,
    expiry: "2026-04-12",
    condition: "Fresh"
  },
  {
    id: "storage-2",
    sku: "GR-114",
    itemName: "Green beans",
    bin: "B-03",
    section: "Dry goods",
    onHand: 84,
    reserved: 18,
    reorderPoint: 30,
    expiry: "2026-04-16",
    condition: "Stable"
  },
  {
    id: "storage-3",
    sku: "SP-221",
    itemName: "Packaging sleeves",
    bin: "C-07",
    section: "Packing",
    onHand: 260,
    reserved: 64,
    reorderPoint: 80,
    expiry: "2026-07-01",
    condition: "Healthy"
  }
];

function lowStock(items: StorageItem[]): StorageItem[] {
  return items.filter((item) => item.onHand <= item.reorderPoint);
}

export default function StoragePage() {
  const [items, setItems] = useState<StorageItem[]>(initialStorage);
  const [itemName, setItemName] = useState("Bell peppers");
  const [sku, setSku] = useState("FR-009");
  const [bin, setBin] = useState("A-08");
  const [section, setSection] = useState("Cold storage");
  const [onHand, setOnHand] = useState(48);
  const [reserved, setReserved] = useState(6);
  const [reorderPoint, setReorderPoint] = useState(24);
  const [expiry, setExpiry] = useState("2026-04-20");
  const [condition, setCondition] = useState("Fresh");

  const totals = useMemo(() => {
    const totalUnits = items.reduce((sum, item) => sum + item.onHand, 0);
    const reservedUnits = items.reduce((sum, item) => sum + item.reserved, 0);
    const openBays = items.filter((item) => item.onHand > item.reorderPoint).length;
    const lowStockCount = lowStock(items).length;

    return { totalUnits, reservedUnits, openBays, lowStockCount };
  }, [items]);

  const binCards = useMemo(() => {
    return items.map((item) => ({
      title: `${item.bin} · ${item.section}`,
      subtitle: item.itemName,
      fill: Math.min(100, Math.round((item.onHand / Math.max(item.reorderPoint, item.onHand)) * 100)),
      detail: `${item.onHand} on hand · ${item.reserved} reserved`
    }));
  }, [items]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!itemName.trim()) {
      return;
    }

    setItems((previous) => [
      {
        id: `storage-${Date.now()}`,
        itemName: itemName.trim(),
        sku: sku.trim(),
        bin: bin.trim(),
        section: section.trim(),
        onHand,
        reserved,
        reorderPoint,
        expiry,
        condition
      },
      ...previous
    ]);
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

      <section className="operator-grid split-grid">
        <article className="operator-panel">
          <span className="panel-tag">Receive stock</span>
          <h2>Manual warehouse entry</h2>
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
            <button className="primary-action" type="submit">Store item</button>
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
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
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
          {lowStock(items).length ? (
            lowStock(items).map((item) => (
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
