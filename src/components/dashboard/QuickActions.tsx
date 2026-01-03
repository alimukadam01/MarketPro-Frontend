import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Eye,
  Package,
  PackageOpen,
  Archive,
  UserPlus,
  PackagePlus,
  ShoppingCart
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const quickActions = [
  { label: "Create Sales Invoice", icon: ShoppingCart, actionLink: '/sales/create-invoice' },
  { label: "Create Purchase Invoice", icon: Package, actionLink: '/purchases/create-invoice' },
  { label: "View All Sales Invoice", icon: ShoppingCart, actionLink: '/sales' },
  { label: "View All Purchase Invoices", icon: Package, actionLink: '/purchases' },
  { label: "Create New Product", icon: PackageOpen, actionLink: '/products/create-product' },
  { label: "Create New Inventory Item", icon: Archive, actionLink: '/inventory/create-item' },
  { label: "Create New Customer", icon: UserPlus, actionLink: '/customers/create-customer' },
];

export function QuickActions() {

  const navigate = useNavigate()

  return (
    <Card className="shadow-sm">  
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols gap-3">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Button
                key={index}
                variant="outline"
                className="h-auto p-4 flex items-center justify-start space-x-3 text-left"
                onClick={()=>navigate(action.actionLink)}
              >
                <Icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{action.label}</span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}