import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import DataTable from "@/components/ui/DataTable";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadcrumb";
import { getStatusColor } from "../../services/utils"
import { ArrowLeft, Plus, Filter, Search, Edit, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const cols = [
  { key: "id", label: "ID" },
  { key: "invoice_no", label: "Invoice No." },
  {
    key: "status",
    label: "Status",
    render: (value) => (
      <span
        className={`px-2 py-0.25 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(
          value
        )}`}
      >
        {value}
      </span>
    ),
  },
  { key: "date_issued", label: "Date Issued" },
  { key: "date_due", label: "Date Due" },
  { key: "payment_status", label: "Payment Status" },
  { key: "tax", label: "Tax" },
  { key: "discount", label: "Discount" },
  { key: "total_items", label: "Total Items" },
  { key: "subtotal", label: "Subtotal" },
  { key: "total", label: "Total" },
]

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
  const [selectedRows, setSelectedRows] = useState([]);
  const navigate = useNavigate();

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

            <DynamicBreadCrumb />

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

            <DataTable columns = {cols} data = {salesData} selectedRows = {selectedRows} onRowClick = {toggleRowSelection}/>
          </div>

        </main>
      </div>
    </div>
  );
};

export default Sales;