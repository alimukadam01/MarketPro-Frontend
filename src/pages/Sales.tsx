import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Filter, Search, Edit, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const salesData = [
  { id: "1", invoice_no: "inv-00123", status: "Completed", date_issued: "06/08/2025", date_due: "15/08/2025", payment_status: "Paid", tax: "10%", discount: "none", total_items: "3", subtotal: "PKR 23,750", total: "PKR 25,000" },
  { id: "2", invoice_no: "inv-00124", status: "Pending", date_issued: "07/08/2025", date_due: "16/08/2025", payment_status: "Unpaid", tax: "5%", discount: "none", total_items: "1", subtotal: "PKR 3,500", total: "PKR 3,500" },
  { id: "3", invoice_no: "inv-00125", status: "Completed", date_issued: "08/08/2025", date_due: "17/08/2025", payment_status: "Paid", tax: "10%", discount: "5%", total_items: "1", subtotal: "PKR 18,000", total: "PKR 18,000" },
  { id: "4", invoice_no: "inv-00126", status: "Shipped", date_issued: "09/08/2025", date_due: "18/08/2025", payment_status: "Paid", tax: "10%", discount: "none", total_items: "3", subtotal: "PKR 12,600", total: "PKR 12,600" },
  { id: "5", invoice_no: "inv-00127", status: "Cancelled", date_issued: "10/08/2025", date_due: "19/08/2025", payment_status: "Refunded", tax: "10%", discount: "none", total_items: "1", subtotal: "PKR 8,900", total: "PKR 8,900" },
  { id: "6", invoice_no: "inv-00128", status: "Completed", date_issued: "11/08/2025", date_due: "20/08/2025", payment_status: "Paid", tax: "5%", discount: "none", total_items: "2", subtotal: "PKR 5,600", total: "PKR 5,600" },
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

            <div className="flex-1  justify-between">
              <div className="flex items-center space-x-3">
                <ArrowLeft 
                  className="w-5 h-5 text-muted-foreground cursor-pointer hover:text-primary" 
                  onClick={() => navigate("/")}
                />
                <div className="flex-1 items-center justify-between">
                  <h1 className="text-2xl font-semibold">Sales Overview</h1>
                  <p className="text-sm text-muted-foreground">View and manage all sales transactions</p>
                </div>
              </div>
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
                <div className="grid grid-cols-11 gap-4 w-full text-sm font-medium text-muted-foreground">
                  <div className="min-w-0">ID</div>
                  <div className="min-w-0">Invoice No.</div>
                  <div className="min-w-0">Status</div>
                  <div className="min-w-0">Date Issued</div>
                  <div className="min-w-0">Date Due</div>
                  <div className="min-w-0">Payment Status</div>
                  <div className="min-w-0">Tax</div>
                  <div className="min-w-0">Discount</div>
                  <div className="min-w-0">Total Items</div>
                  <div className="min-w-0">Subtotal</div>
                  <div className="min-w-0">Total</div>
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
                  <div className="grid grid-cols-11 gap-4 w-full text-sm">
                    <div className="font-medium min-w-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">{sale.id}</div>
                    <div className="text-muted-foreground min-w-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">{sale.invoice_no}</div>
                    <div className="font-semibold min-w-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(sale.status)}`}>
                        {sale.status}
                      </span>
                    </div>
                    <div className="text-muted-foreground min-w-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">{sale.date_issued}</div>
                    <div className="font-semibold min-w-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">{sale.date_due}</div>
                    <div className="font-semibold min-w-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">{sale.payment_status}</div>
                    <div className="font-semibold min-w-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">{sale.tax}</div>
                    <div className="font-semibold min-w-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">{sale.discount}</div>
                    <div className="font-semibold min-w-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">{sale.total_items}</div>
                    <div className="font-semibold min-w-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">{sale.subtotal}</div>
                    <div className="font-semibold min-w-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">{sale.total}</div>
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