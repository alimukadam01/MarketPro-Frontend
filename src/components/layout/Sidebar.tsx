import { cn } from "@/lib/utils";
import {
  ShoppingCart,
  Package,
  PackageOpen,
  FolderOpen,
  Wallet2,
  Users,
  Archive,
  Menu,
  Truck,
  MapPin,
  Undo2,
  LogOut,
  FileText,
  UserCog,
  Lock,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "../../../services/AuthProvider";
import { useNavigate, useLocation } from "react-router-dom";

const sidebarItems = [
  { name: "Sales",               icon: ShoppingCart, href: "/sales",               module: "sales" },
  { name: "Purchases",           icon: Package,      href: "/purchases",            module: "purchases" },
  { name: "Inventory",           icon: Archive,      href: "/inventory",            module: "inventory" },
  { name: "Expenses",            icon: Wallet2,      href: "/expenses",             module: "expenses" },
  { name: "Projects",            icon: FolderOpen,   href: "/projects",             module: "projects" },
  { name: "Purchase Quotations", icon: FileText,     href: "/purchase-quotations",  module: "quotations" },
  { name: "Products",            icon: PackageOpen,  href: "/products",             module: "products" },
  { name: "Customers",           icon: Users,        href: "/customers",            module: "customers" },
  { name: "Suppliers",           icon: Truck,        href: "/suppliers",            module: "suppliers" },
  { name: "Locations",           icon: MapPin,       href: "/locations",            module: "locations" },
  { name: "Returned Items",      icon: Undo2,        href: "/returned-items",       module: "returned_items" },
  { name: "Backlog",             icon: ClipboardList, href: "/backlog",              module: "backlog" },
];

interface SidebarProps {
  onCollapseChange?: (collapsed: boolean) => void;
}

export function Sidebar({ onCollapseChange }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, config, user } = useAuth()

  const isLocked = (module: string) => {
    return config !== null && config[module] === false 
  }

  const isAdmin = user.role === 'admin'

  const handleToggle = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    onCollapseChange?.(newCollapsed);
  };

  const handleLogout = () => {
    localStorage.removeItem('mp-business-id')
    logout()
  }

  return (
    <div className={cn(
      "bg-primary text-primary-foreground transition-all duration-300 flex flex-col h-screen fixed left-0 top-0 z-50",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-primary-foreground/20">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-foreground/20 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg">MARKET Pro</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggle}
            className="text-primary-foreground hover:bg-primary-foreground/20"
          >
            <Menu className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          const locked = isLocked(item.module);

          return (
            <Button
              key={item.name}
              variant="ghost"
              disabled={locked}
              onClick={() => navigate(item.href)}
              className={cn(
                "w-full justify-start text-primary-foreground hover:bg-primary-foreground/20",
                isCollapsed ? "px-2" : "px-4",
                isActive && "bg-primary-foreground/20",
                locked && "opacity-60 cursor-not-allowed"
              )}
            >
              <Icon className={cn("w-5 h-5", !isCollapsed && "mr-3")} />
              {!isCollapsed && (
                <span className="flex flex-1 items-center justify-between gap-1">
                  {item.name}
                  {locked && <Lock className="w-3 h-3" />}
                </span>
              )}
            </Button>
          );
        })}

        {/* Employees link — admin only */}
        {isAdmin && (
          <Button
            variant="ghost"
            onClick={() => navigate("/employees")}
            className={cn(
              "w-full justify-start text-primary-foreground hover:bg-primary-foreground/20",
              isCollapsed ? "px-2" : "px-4",
              location.pathname === "/employees" && "bg-primary-foreground/20"
            )}
          >
            <UserCog className={cn("w-5 h-5", !isCollapsed && "mr-3")} />
            {!isCollapsed && <span>Employees</span>}
          </Button>
        )}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-primary-foreground/20">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className={cn(
            "w-full justify-start text-primary-foreground hover:bg-primary-foreground/20",
            isCollapsed ? "px-2" : "px-4"
          )}
        >
          <LogOut className={cn("w-5 h-5", !isCollapsed && "mr-3")} />
          {!isCollapsed && <span>Logout</span>}
        </Button>
      </div>
    </div>
  );
}