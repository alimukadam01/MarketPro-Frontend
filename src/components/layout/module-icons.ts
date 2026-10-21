import {
  Archive, ClipboardList, FileText, FolderOpen, Home, Landmark, MapPin, Package,
  PackageOpen, ShoppingCart, Target, Truck, Undo2, UserCog, Users, Wallet2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * One icon per module, as the sidebar shows it. Anything that stands for a
 * module elsewhere (a global search result, say) takes its icon from here,
 * so a module looks the same wherever it appears.
 */
export const MODULE_ICONS: Record<string, LucideIcon> = {
  home: Home,
  sales: ShoppingCart,
  purchases: Package,
  inventory: Archive,
  expenses: Wallet2,
  projects: FolderOpen,
  quotations: FileText,
  products: PackageOpen,
  customers: Users,
  suppliers: Truck,
  locations: MapPin,
  returned_items: Undo2,
  backlog: ClipboardList,
  accounting: Landmark,
  targets: Target,
  employees: UserCog,
};
