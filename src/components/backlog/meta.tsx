import type { ReactNode } from "react";

// Labels and colours shared by every backlog screen, so a page type or a
// priority reads the same on the queue, the owner's list and the entry screen.

export const BACKLOG_TYPES: Record<string, { label: string; tone: string }> = {
  sales_invoice: { label: "Sales invoice", tone: "bg-violet-100 text-violet-700" },
  purchase_invoice: { label: "Purchase invoice", tone: "bg-blue-100 text-blue-700" },
  product_list: { label: "Product list", tone: "bg-gray-100 text-gray-700" },
  stock_list: { label: "Stock list", tone: "bg-gray-100 text-gray-700" },
  price_list: { label: "Price list", tone: "bg-gray-100 text-gray-700" },
};

export const BACKLOG_STATUSES: Record<string, { label: string; tone: string }> = {
  pending: { label: "Waiting", tone: "bg-gray-100 text-gray-700" },
  in_progress: { label: "In progress", tone: "bg-blue-100 text-blue-700" },
  entered: { label: "Waiting for review", tone: "bg-yellow-100 text-yellow-700" },
  verified: { label: "Verified", tone: "bg-green-100 text-green-700" },
  cant_read: { label: "Can't read", tone: "bg-red-100 text-red-700" },
};

export const BACKLOG_PRIORITIES: Record<string, { label: string; tone: string }> = {
  daily: { label: "Today", tone: "bg-yellow-100 text-yellow-700" },
  high: { label: "High", tone: "bg-orange-100 text-orange-700" },
  normal: { label: "Normal", tone: "bg-gray-100 text-gray-700" },
};

export const INVOICE_TYPES = ["sales_invoice", "purchase_invoice"];

/** A daily page is "Today" whatever its priority: it is due first. */
export const priorityOf = (entry: { is_daily?: boolean; priority?: string }) =>
  entry.is_daily ? "daily" : entry.priority === "high" ? "high" : "normal";

export function Pill({ tone, children }: { tone: string; children: ReactNode }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${tone}`}>
      {children}
    </span>
  );
}

/** 372 -> "6:12"; an hour or more -> "1:02:05". */
export const formatSeconds = (total: number) => {
  const seconds = Math.max(0, Math.floor(total || 0));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
};

/** "Today 9:12", or the date for anything older. */
export const formatWhen = (iso: string | null) => {
  if (!iso) return "-";
  const date = new Date(iso);
  const today = new Date();
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (date.toDateString() === today.toDateString()) return `Today ${time}`;
  return date.toLocaleDateString("en-GB");
};

export const personName = (person: { name?: string } | null) => person?.name || "-";

// -- What the backlog endpoints answer with ----------------------------------

export type Person = { id: number; name: string } | null;

/** One record a page produced (backlog/outputs.py describe). */
export interface BacklogOutput {
  id: number;
  kind: "sales_invoice" | "purchase_invoice" | "product" | "inventory_item";
  record_id: number | null;
  created: boolean;
  entered: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  label: string;
  detail: string;
  total?: number;
  variant_count?: number;
}

/** A row of the entry queue. */
export interface QueueItem {
  id: number;
  type: string;
  type_label: string;
  status: string;
  book_label: string;
  priority: string;
  is_daily: boolean;
  notes: string;
  review_note: string;
  rejection_count: number;
  mine: boolean;
  created_at: string;
}

/** A page open on an entry screen (/backlog-work/{id}/). */
export interface WorkEntry extends QueueItem {
  image: string | null;
  outputs: BacklogOutput[];
  claimed_at: string | null;
  completed_list: boolean;
  cant_read_note: string;
}

/** A customer, supplier or product created from a page (BUGS.md #006). */
export interface NewRecord {
  id: number;
  kind: "customer" | "supplier" | "product";
  record_id: number;
  label: string;
  detail: string;
  /** Positive: the customer owes the shop, or the shop owes the supplier. */
  opening_balance: number | null;
}

/** The owner's view of a page (/backlog-entries/{id}/). */
export interface OwnerEntry extends WorkEntry {
  new_records: NewRecord[];
  status_label: string;
  claimed_by: Person;
  entered_by: Person;
  entered_at: string | null;
  verified_by: Person;
  seconds_spent: number;
}

export interface GlossaryRow {
  id: number;
  term: string;
  meaning: string;
  kind: string;
  links_to: { kind: string; id: number; name: string } | null;
  valid_from?: number;
  created_at?: string;
}
