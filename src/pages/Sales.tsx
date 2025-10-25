import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Filter, Search, Edit, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const salesData = [
  { id: "1", customer_name: "John Doe", productName: "Wireless Headphones", category: "Electronics", price: "PKR 12,500", quantity: 2, sub_total: 25000, total: 25000, status: "Completed", payment_status: "Paid", is_deducted: true, is_partially_deducted: false },
  { id: "2", customer_name: "Jane Smith", productName: "Gaming Mouse", category: "Electronics", price: "PKR 3,500", quantity: 1, sub_total: 3500, total: 3500, status: "Pending", payment_status: "Unpaid", is_deducted: false, is_partially_deducted: false },
  { id: "3", customer_name: "Bob Johnson", productName: "Office Chair", category: "Furniture", price: "PKR 18,000", quantity: 1, sub_total: 18000, total: 18000, status: "Completed", payment_status: "Paid", is_deducted: true, is_partially_deducted: false },
  { id: "4", customer_name: "Alice Williams", productName: "Laptop Stand", category: "Accessories", price: "PKR 4,200", quantity: 3, sub_total: 12600, total: 12600, status: "Shipped", payment_status: "Partial", is_deducted: false, is_partially_deducted: true },
  { id: "5", customer_name: "Charlie Brown", productName: "Bluetooth Speaker", category: "Electronics", price: "PKR 8,900", quantity: 1, sub_total: 8900, total: 8900, status: "Cancelled", payment_status: "Refunded", is_deducted: false, is_partially_deducted: false },
  { id: "6", customer_name: "Diana Prince", productName: "Desk Lamp", category: "Accessories", price: "PKR 2,800", quantity: 2, sub_total: 5600, total: 5600, status: "Completed", payment_status: "Paid", is_deducted: true, is_partially_deducted: false },
  { id: "7", customer_name: "Eve Adams", productName: "Keyboard", category: "Electronics", price: "PKR 5,500", quantity: 1, sub_total: 5500, total: 5500, status: "Pending", payment_status: "Unpaid", is_deducted: false, is_partially_deducted: false },
];

const Sales = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    customer_name: "",
    status: "all",
    payment_status: "all",
    min_sub_total: "",
    max_sub_total: "",
    min_total: "",
    max_total: "",
    is_deducted: false,
    is_partially_deducted: false,
  });
  const [filteredData, setFilteredData] = useState(salesData);
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

  const applyFilters = () => {
    let filtered = salesData.filter(sale => {
      if (filters.customer_name && !sale.customer_name.toLowerCase().includes(filters.customer_name.toLowerCase())) {
        return false;
      }
      if (filters.status !== "all" && sale.status !== filters.status) {
        return false;
      }
      if (filters.payment_status !== "all" && sale.payment_status !== filters.payment_status) {
        return false;
      }
      if (filters.min_sub_total && sale.sub_total < parseFloat(filters.min_sub_total)) {
        return false;
      }
      if (filters.max_sub_total && sale.sub_total > parseFloat(filters.max_sub_total)) {
        return false;
      }
      if (filters.min_total && sale.total < parseFloat(filters.min_total)) {
        return false;
      }
      if (filters.max_total && sale.total > parseFloat(filters.max_total)) {
        return false;
      }
      if (filters.is_deducted && !sale.is_deducted) {
        return false;
      }
      if (filters.is_partially_deducted && !sale.is_partially_deducted) {
        return false;
      }
      return true;
    });
    setFilteredData(filtered);
    setFilterOpen(false);
  };

  const resetFilters = () => {
    setFilters({
      customer_name: "",
      status: "all",
      payment_status: "all",
      min_sub_total: "",
      max_sub_total: "",
      min_total: "",
      max_total: "",
      is_deducted: false,
      is_partially_deducted: false,
    });
    setFilteredData(salesData);
    setFilterOpen(false);
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
                <Button variant="outline" className="flex items-center space-x-2" onClick={() => setFilterOpen(true)}>
                  <Filter className="w-4 h-4" />
                  <span>Filter</span>
                </Button>
              </div>
              
              {/* Action Icons */}
              <div className="flex items-center space-x-3">
                <Button variant="outline" size="sm" className="flex items-center space-x-2" onClick={() => navigate("/sales/create-invoice")}>
                  <Plus className="w-4 h-4" />
                  <span>Create Invoice</span>
                </Button>
                <Button variant="outline" size="sm" className="flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>New Sale</span>
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
              {filteredData.map((sale) => (
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

      {/* Filter Dialog */}
      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Filter Sales Records</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="customer_name">Customer Name</Label>
              <Input
                id="customer_name"
                placeholder="Enter customer name"
                value={filters.customer_name}
                onChange={(e) => setFilters({ ...filters, customer_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Shipped">Shipped</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_status">Payment Status</Label>
              <Select value={filters.payment_status} onValueChange={(value) => setFilters({ ...filters, payment_status: value })}>
                <SelectTrigger id="payment_status">
                  <SelectValue placeholder="Select payment status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payment Statuses</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Unpaid">Unpaid</SelectItem>
                  <SelectItem value="Partial">Partial</SelectItem>
                  <SelectItem value="Refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Sub Total Range</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.min_sub_total}
                  onChange={(e) => setFilters({ ...filters, min_sub_total: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.max_sub_total}
                  onChange={(e) => setFilters({ ...filters, max_sub_total: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Total Range</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.min_total}
                  onChange={(e) => setFilters({ ...filters, min_total: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.max_total}
                  onChange={(e) => setFilters({ ...filters, max_total: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_deducted"
                  checked={filters.is_deducted}
                  onCheckedChange={(checked) => setFilters({ ...filters, is_deducted: checked as boolean })}
                />
                <Label htmlFor="is_deducted" className="cursor-pointer">Is Deducted</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_partially_deducted"
                  checked={filters.is_partially_deducted}
                  onCheckedChange={(checked) => setFilters({ ...filters, is_partially_deducted: checked as boolean })}
                />
                <Label htmlFor="is_partially_deducted" className="cursor-pointer">Is Partially Deducted</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetFilters}>Reset</Button>
            <Button onClick={applyFilters}>Apply Filters</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Sales;