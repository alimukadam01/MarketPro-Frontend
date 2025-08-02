import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Eye, 
  FolderPlus, 
  UserPlus, 
  PackagePlus 
} from "lucide-react";

const quickActions = [
  { label: "Create Purchase Invoice", icon: FileText },
  { label: "View All Purchase Invoices", icon: Eye },
  { label: "Create Sales Invoice", icon: FileText },
  { label: "View All Sales Invoice", icon: Eye },
  { label: "Create New Project", icon: FolderPlus },
  { label: "Create New Inventory Item", icon: PackagePlus },
  { label: "Create New Customer", icon: UserPlus },
  { label: "Create New Inventory Item", icon: PackagePlus },
];

export function QuickActions() {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Button
                key={index}
                variant="outline"
                className="h-auto p-4 flex items-center justify-start space-x-3 text-left"
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