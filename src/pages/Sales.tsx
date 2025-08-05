import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Filter, Search, Edit, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const salesData = [
  { id: "S001", customer: "John Doe", date: "2024-01-15", amount: "PKR 15,500", status: "Completed" },
  { id: "S002", customer: "Jane Smith", date: "2024-01-14", amount: "PKR 8,200", status: "Pending" },
  { id: "S003", customer: "Mike Johnson", date: "2024-01-13", amount: "PKR 22,750", status: "Completed" },
  { id: "S004", customer: "Sarah Wilson", date: "2024-01-12", amount: "PKR 12,300", status: "Cancelled" },
  { id: "S005", customer: "David Brown", date: "2024-01-11", amount: "PKR 18,900", status: "Completed" },
];

const Sales = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed": return "text-green-600 bg-green-50";
      case "Pending": return "text-yellow-600 bg-yellow-50";
      case "Cancelled": return "text-red-600 bg-red-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar onCollapseChange={setSidebarCollapsed} />
      
      <div className={`${sidebarCollapsed ? 'ml-16' : 'ml-64'} transition-all duration-300 flex flex-col`}>
        <Header />
        
        <main className="flex-1 p-6 space-y-6">
          {/* Header with Back Icon */}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              <span className="text-primary cursor-pointer" onClick={() => navigate("/")}>home</span> / sales
            </p>
            <div className="flex items-center space-x-3">
              <ArrowLeft 
                className="w-5 h-5 text-muted-foreground cursor-pointer hover:text-primary" 
                onClick={() => navigate("/")}
              />
              <h1 className="text-2xl font-bold">Sales Management</h1>
            </div>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-card rounded-lg p-6 border">
              <div className="text-sm text-muted-foreground mb-2">Total Sales</div>
              <div className="text-3xl font-bold">PKR 77,650</div>
              <div className="text-sm text-green-600 mt-1">+12% from last month</div>
            </div>
            <div className="bg-card rounded-lg p-6 border">
              <div className="text-sm text-muted-foreground mb-2">Completed</div>
              <div className="text-3xl font-bold text-green-600">3</div>
              <div className="text-sm text-muted-foreground mt-1">Sales completed</div>
            </div>
            <div className="bg-card rounded-lg p-6 border">
              <div className="text-sm text-muted-foreground mb-2">Pending</div>
              <div className="text-3xl font-bold text-yellow-600">1</div>
              <div className="text-sm text-muted-foreground mt-1">Awaiting processing</div>
            </div>
            <div className="bg-card rounded-lg p-6 border">
              <div className="text-sm text-muted-foreground mb-2">Cancelled</div>
              <div className="text-3xl font-bold text-red-600">1</div>
              <div className="text-sm text-muted-foreground mt-1">Cancelled orders</div>
            </div>
          </div>

          {/* Sales Records Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Sales Records</h2>
            
            {/* Search and Filter */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input 
                    placeholder="Search sales by customer name or ID..." 
                    className="pl-10 w-80"
                  />
                </div>
                <Button variant="outline" className="flex items-center space-x-2">
                  <Filter className="w-4 h-4" />
                  <span>Filter</span>
                </Button>
              </div>
              
              {/* Action Icons */}
              <div className="flex items-center space-x-3">
                <Button variant="outline" size="sm" className="flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>New</span>
                </Button>
                <Button variant="outline" size="sm" className="flex items-center space-x-2">
                  <Edit className="w-4 h-4" />
                  <span>Update</span>
                </Button>
                <Button variant="outline" size="sm" className="flex items-center space-x-2">
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </Button>
              </div>
            </div>

            {/* Sales Table */}
            <div className="bg-card rounded-lg border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left py-4 px-6 font-medium text-sm">Sale ID</th>
                      <th className="text-left py-4 px-6 font-medium text-sm">Customer</th>
                      <th className="text-left py-4 px-6 font-medium text-sm">Date</th>
                      <th className="text-left py-4 px-6 font-medium text-sm">Amount</th>
                      <th className="text-left py-4 px-6 font-medium text-sm">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {salesData.map((sale) => (
                      <tr key={sale.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-4 px-6 font-mono text-sm font-medium">{sale.id}</td>
                        <td className="py-4 px-6">{sale.customer}</td>
                        <td className="py-4 px-6 text-muted-foreground">{sale.date}</td>
                        <td className="py-4 px-6 font-semibold">{sale.amount}</td>
                        <td className="py-4 px-6">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(sale.status)}`}>
                            {sale.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
};

export default Sales;