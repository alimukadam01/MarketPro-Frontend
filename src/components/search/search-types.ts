import { Search } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MODULE_ICONS } from "@/components/layout/module-icons";

/**
 * The only per-type knowledge the frontend has about global search: which
 * module a result belongs to, for its icon - the module's own, as the sidebar
 * shows it, never one of the search's own.
 *
 * Everything else - the group's label, each result's link and its status
 * colour - comes from the backend (root/search), so a type a new module
 * registers works here at once, with the generic icon until one is added.
 */
export const SEARCH_TYPE_MODULES: Record<string, string> = {
  sales_invoice: "sales",
  sales_invoice_item: "sales",
  purchase_invoice: "purchases",
  purchase_invoice_item: "purchases",
  purchase_quotation: "quotations",
  purchase_quotation_item: "quotations",
  returned_item: "returned_items",
  inventory_item: "inventory",
  product: "products",
  product_variant: "products",
  location: "locations",
  customer: "customers",
  supplier: "suppliers",
  employee: "employees",
  transaction: "accounting",
  money_account: "accounting",
  expense: "expenses",
  project: "projects",
  project_task: "projects",
  target: "targets",
  manual_data_point: "targets",
  backlog_entry: "backlog",
};

type HitLink = { path: string } | null | undefined;

/**
 * A result's icon. An invoice image belongs to whichever invoice it hangs
 * off, so it takes that invoice's module from where it opens.
 */
export const iconFor = (type: string, link?: HitLink): LucideIcon => {
  const module = type === "invoice_image"
    ? (link?.path?.startsWith("/purchases") ? "purchases" : "sales")
    : SEARCH_TYPE_MODULES[type];
  return MODULE_ICONS[module] || Search;
};

// The status pill colours used across the app (getStatusColor and friends),
// keyed by the tone the backend sends.
export const TONE_CLASSES: Record<string, string> = {
  success: "bg-green-100 text-green-700",
  warning: "bg-yellow-100 text-yellow-700",
  danger: "bg-red-100 text-red-700",
  neutral: "bg-gray-100 text-gray-700",
};
