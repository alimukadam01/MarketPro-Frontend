import { MODULE_ICONS } from "./module-icons";

// The sidebar's sections, in its order. Also names a page on a phone's
// "needs a computer" screen (PhoneBlocked).
export const sidebarItems = [
  // The dashboard. No module: everyone signed in has one, so it never locks.
  { name: "Home",                icon: MODULE_ICONS.home,            href: "/",                    module: null },
  { name: "Sales",               icon: MODULE_ICONS.sales,           href: "/sales",               module: "sales" },
  { name: "Purchases",           icon: MODULE_ICONS.purchases,       href: "/purchases",           module: "purchases" },
  { name: "Inventory",           icon: MODULE_ICONS.inventory,       href: "/inventory",           module: "inventory" },
  { name: "Expenses",            icon: MODULE_ICONS.expenses,        href: "/expenses",            module: "expenses" },
  { name: "Projects",            icon: MODULE_ICONS.projects,        href: "/projects",            module: "projects" },
  { name: "Purchase Quotations", icon: MODULE_ICONS.quotations,      href: "/purchase-quotations", module: "quotations" },
  { name: "Products",            icon: MODULE_ICONS.products,        href: "/products",            module: "products" },
  { name: "Customers",           icon: MODULE_ICONS.customers,       href: "/customers",           module: "customers" },
  { name: "Suppliers",           icon: MODULE_ICONS.suppliers,       href: "/suppliers",           module: "suppliers" },
  { name: "Locations",           icon: MODULE_ICONS.locations,       href: "/locations",           module: "locations" },
  { name: "Returned Items",      icon: MODULE_ICONS.returned_items,  href: "/returned-items",      module: "returned_items" },
  { name: "Backlog",             icon: MODULE_ICONS.backlog,         href: "/backlog",             module: "backlog" },
  { name: "Accounting",          icon: MODULE_ICONS.accounting,      href: "/accounting",          module: "accounting" },
  { name: "Targets",             icon: MODULE_ICONS.targets,         href: "/targets",             module: "targets" },
];
