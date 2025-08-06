import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Filter, Search, Edit, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const salesData = [
  { id: "1", productName: "Wireless Headphones", category: "Electronics", price: "PKR 12,500", quantity: 2, total: "PKR 25,000", status: "Completed" },
  { id: "2", productName: "Gaming Mouse", category: "Electronics", price: "PKR 3,500", quantity: 1, total: "PKR 3,500", status: "Pending" },
  { id: "3", productName: "Office Chair", category: "Furniture", price: "PKR 18,000", quantity: 1, total: "PKR 18,000", status: "Completed" },
  { id: "4", productName: "Laptop Stand", category: "Accessories", price: "PKR 4,200", quantity: 3, total: "PKR 12,600", status: "Shipped" },
  { id: "5", productName: "Bluetooth Speaker", category: "Electronics", price: "PKR 8,900", quantity: 1, total: "PKR 8,900", status: "Cancelled" },
  { id: "6", productName: "Desk Lamp", category: "Accessories", price: "PKR 2,800", quantity: 2, total: "PKR 5,600", status: "Completed" },
  { id: "7", productName: "Keyboard", category: "Electronics", price: "PKR 5,500", quantity: 1, total: "PKR 5,500", status: "Pending" },
];

const Sales = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed": return "text-green-600 bg-green-50";
      case "Pending": return "text-yellow-600 bg-yellow-50";
      case "Cancelled": return "text-red-600 bg-red-50";
      case "Shipped": return "text-blue-600 bg-blue-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  const toggleRowSelection = (id: string) => {
    setSelectedRows(prev => 
      prev.includes(id) 
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id]
    );
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
            <div className="space-y-[10px]">
              {/* Table Header */}
              <div className="bg-card rounded-lg border h-[35px] flex items-center px-4">
                <div className="grid grid-cols-6 gap-4 w-full text-sm font-medium text-muted-foreground">
                  <div className="min-w-0">Product Name</div>
                  <div className="min-w-0">Category</div>
                  <div className="min-w-0">Price</div>
                  <div className="min-w-0">Quantity</div>
                  <div className="min-w-0">Total</div>
                  <div className="min-w-0">Status</div>
                </div>
              </div>

              {/* Table Rows */}
              {salesData.map((sale) => (
                <div
                  key={sale.id}
                  onClick={() => toggleRowSelection(sale.id)}
                  className={`bg-card rounded-lg h-[35px] flex items-center px-4 cursor-pointer transition-colors hover:bg-muted/20 ${
                    selectedRows.includes(sale.id) 
                      ? 'border-2 border-[#4285F4]' 
                      : 'border border-border'
                  }`}
                >
                  <div className="grid grid-cols-6 gap-4 w-full text-sm">
                    <div className="font-medium min-w-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">{sale.productName}</div>
                    <div className="text-muted-foreground min-w-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">{sale.category}</div>
                    <div className="font-semibold min-w-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">{sale.price}</div>
                    <div className="text-muted-foreground min-w-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">{sale.quantity}</div>
                    <div className="font-semibold min-w-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">{sale.total}</div>
                    <div className="min-w-0">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(sale.status)}`}>
                        {sale.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </main>
      </div>
    </div>
  );
};

export default Sales;