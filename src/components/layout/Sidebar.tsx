import { cn } from "@/lib/utils";
import {
  ShoppingCart,
  Package,
  PackageOpen,
  FolderOpen,
  Users,
  Archive,
  Menu,
  Truck,
  MapPin,
  Undo2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const sidebarItems = [
  { name: "Sales", icon: ShoppingCart, href: "/sales" },
  { name: "Purchases", icon: Package, href: "/purchases" },
  { name: "Inventory", icon: Archive, href: "/inventory" },
  { name: "Projects", icon: FolderOpen, href: "/projects" },
  { name: "Products", icon: PackageOpen, href: "/products" },
  { name: "Customers", icon: Users, href: "/customers" },
  { name: "Suppliers", icon: Truck, href: "/suppliers" },
  { name: "Locations", icon: MapPin, href: "/locations" },
  { name: "Returned Items", icon: Undo2, href: "/returned-items" },
];

interface SidebarProps {
  onCollapseChange?: (collapsed: boolean) => void;
}

export function Sidebar({ onCollapseChange }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleToggle = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    onCollapseChange?.(newCollapsed);
  };

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
      <nav className="flex-1 p-4 space-y-2">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          return (
            <Button
              key={item.name}
              variant="ghost"
              onClick={() => navigate(item.href)}
              className={cn(
                "w-full justify-start text-primary-foreground hover:bg-primary-foreground/20",
                isCollapsed ? "px-2" : "px-4",
                isActive && "bg-primary-foreground/20"
              )}
            >
              <Icon className={cn("w-5 h-5", !isCollapsed && "mr-3")} />
              {!isCollapsed && <span>{item.name}</span>}
            </Button>
          );
        })}
      </nav>
    </div>
  );
}