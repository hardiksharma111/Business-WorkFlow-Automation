export type VendorRecord = {
  id: string;
  vendorName: string;
  projectName: string;
  category: string;
  status: "Approved" | "Pending review" | "Manual entry" | "Blocked";
  leadTime: string;
  trustLevel: number;
  contact: string;
  notes: string;
  createdAt: string;
};

export type StorageItem = {
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
  createdAt: string;
};

const VENDORS_KEY = "ops_vendors_v1";
const STORAGE_KEY = "ops_storage_v1";

export const defaultVendors: VendorRecord[] = [
  {
    id: "vendor-1",
    vendorName: "Greenline Produce",
    projectName: "Fresh stock replenishment",
    category: "Local supplier",
    status: "Approved",
    leadTime: "Same day",
    trustLevel: 92,
    contact: "orders@greenline.example",
    notes: "Primary local pickup lane for produce orders.",
    createdAt: "2026-04-01T09:00:00.000Z"
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
    notes: "Best for short-notice replenishment with limited quantities.",
    createdAt: "2026-04-02T09:00:00.000Z"
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
    notes: "Used when local inventory is too thin or the request is large.",
    createdAt: "2026-04-03T09:00:00.000Z"
  }
];

export const defaultStorage: StorageItem[] = [
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
    condition: "Fresh",
    createdAt: "2026-04-01T09:00:00.000Z"
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
    condition: "Stable",
    createdAt: "2026-04-02T09:00:00.000Z"
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
    condition: "Healthy",
    createdAt: "2026-04-03T09:00:00.000Z"
  }
];

function canUseStorage(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

function parseOrDefault<T>(raw: string | null, fallback: T): T {
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadVendors(): VendorRecord[] {
  if (!canUseStorage()) {
    return defaultVendors;
  }

  const stored = parseOrDefault<VendorRecord[]>(window.localStorage.getItem(VENDORS_KEY), []);
  if (!stored.length) {
    window.localStorage.setItem(VENDORS_KEY, JSON.stringify(defaultVendors));
    return defaultVendors;
  }

  return stored;
}

export function saveVendors(vendors: VendorRecord[]): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(VENDORS_KEY, JSON.stringify(vendors));
}

export function loadStorageItems(): StorageItem[] {
  if (!canUseStorage()) {
    return defaultStorage;
  }

  const stored = parseOrDefault<StorageItem[]>(window.localStorage.getItem(STORAGE_KEY), []);
  if (!stored.length) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultStorage));
    return defaultStorage;
  }

  return stored;
}

export function saveStorageItems(items: StorageItem[]): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function createClientId(prefix: string): string {
  return `${prefix}-${Date.now()}`;
}
