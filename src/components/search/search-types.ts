import {
  Archive, Boxes, ClipboardList, FileText, FolderOpen, Image, Landmark, ListChecks,
  MapPin, Package, PackageOpen, Receipt, Search, ShoppingCart, Target, Truck, Undo2,
  UserCog, Users, Wallet2, Gauge,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * The only per-type knowledge the frontend has about global search: an icon.
 *
 * Everything else - the group's label, each result's link and its status
 * colour - comes from the backend (root/search), so a type a new module
 * registers works here at once, with the generic icon until one is added.
 */
export const SEARCH_TYPE_ICONS: Record<string, LucideIcon> = {
  sales_invoice: ShoppingCart,
  sales_invoice_item: ShoppingCart,
  purchase_invoice: Package,
  purchase_invoice_item: Package,
  purchase_quotation: FileText,
  purchase_quotation_item: FileText,
  returned_item: Undo2,
  invoice_image: Image,
  inventory_item: Archive,
  product: PackageOpen,
  product_variant: Boxes,
  location: MapPin,
  customer: Users,
  supplier: Truck,
  employee: UserCog,
  transaction: Receipt,
  money_account: Landmark,
  expense: Wallet2,
  project: FolderOpen,
  project_task: ListChecks,
  target: Target,
  manual_data_point: Gauge,
  backlog_entry: ClipboardList,
};

export const iconFor = (type: string): LucideIcon => SEARCH_TYPE_ICONS[type] || Search;

// The status pill colours used across the app (getStatusColor and friends),
// keyed by the tone the backend sends.
export const TONE_CLASSES: Record<string, string> = {
  success: "bg-green-100 text-green-700",
  warning: "bg-yellow-100 text-yellow-700",
  danger: "bg-red-100 text-red-700",
  neutral: "bg-gray-100 text-gray-700",
};
