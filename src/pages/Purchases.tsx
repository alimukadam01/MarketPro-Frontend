import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { toast } from "sonner"
import DataTable from "@/components/ui/DataTable";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadcrumb";
import { getStatusColor, getPaymentStatusColor, PurchaseInvoiceStatusMap, PaymentStatusMap } from "../../services/utils"
import { 
  getPurchaseInvoiceList, 
  bulkDeletePurchaseInvoice, 
  deletePurchaseInvoice 
} from "../../services/api"
import { Eye, ArrowLeft, Plus, Filter, Search, Edit, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const cols = [
  { key: "id", label: "ID" },
  { key: "invoice_no", label: "Invoice No." },
  { key: "supplier", label: "Supplier" },
  {
    key: "status",
    label: "Status",
    render: (value) => (
      <span
        className={`px-2 py-0.25 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(
          value
        )}`}
      >
        {PurchaseInvoiceStatusMap[value]}
      </span>
    ),
  },
  {
    key: "payment_status",
    label: "Payment Status",
    render: (value) => (
      <span
        className={`px-2 py-0.25 rounded-full text-xs font-medium whitespace-nowrap ${getPaymentStatusColor(
          value
        )}`}
      >
        {PaymentStatusMap[value]}
      </span>
    ),
  },
  { key: "delivery", label: "Delivery Date" },
  { key: "date_due", label: "Date Due" },
  { key: "tax", label: "Tax" },
  { key: "total_items", label: "Total Items" },
  { key: "sub_total", label: "Subtotal" },
  { key: "total", label: "Total" },
]

const Purchases = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [selectedRows, setSelectedRows] = useState([])
  const [purchasesData, setPurchasesData] = useState(null)
  const token = localStorage.getItem("market-pro-access-token") || null
  const [isDeleted, setIsDeleted] = useState(false)
  const navigate = useNavigate()

  const toggleRowSelection = (id: string) => {
    setSelectedRows(prev =>
      prev.includes(id)
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id]
    );
  }

  const handleDeletion = async () => {
    if (selectedRows.length <= 0) return
    
    let is_deleted = false
    try{
      if (selectedRows.length > 1) {
        is_deleted = await bulkDeletePurchaseInvoice(token, selectedRows)

      } else {
        is_deleted = await deletePurchaseInvoice(token, selectedRows[0])
      }

      if (is_deleted) {
        toast.success("Purchase invoices deleted successfully.") 
        setIsDeleted(!isDeleted)    
        setSelectedRows([]) 
      }else{
        toast.error("Failed to delete Purchase invoices.")
      }
    }catch(error){
      toast.error("Failed to delete Purchase invoices.")
      console.error(error)
    }
  }

  const handleUpdateClick = ()  => {
    if (selectedRows.length !== 1) return
    navigate("/purchases/update-invoice", { state: { invoice_id: selectedRows[0] } })
  }

  useEffect(()=>{
    const fetchPurchaseInvoices = async ()=>{
      if (!token) return
      
      try {
        const res = await getPurchaseInvoiceList(token)
        if (res){
          setPurchasesData(res)
        }else{
          toast.error("Failed to fetch purchase invoices.")
        }
      }catch(error){
        toast.error("Failed to fetch purchase invoices.")
        console.error("Error fetching purchase invoices:", error)
      }
    }

    fetchPurchaseInvoices()
  }, [token, isDeleted])

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
                  <h1 className="text-2xl font-semibold">Purchases Overview</h1>
                  <p className="text-sm text-muted-foreground">View and manage all purchase transactions</p>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-card rounded-lg p-6 border">
              <div className="text-sm text-muted-foreground mb-2">Total Purchases</div>
              <div className="text-3xl font-bold">PKR 77,650</div>
              <div className="text-sm text-green-600 mt-1">+12% from last month</div>
            </div>
            <div className="bg-card rounded-lg p-6 border">
              <div className="text-sm text-muted-foreground mb-2">Completed</div>
              <div className="text-3xl font-bold text-green-600">3</div>
              <div className="text-sm text-muted-foreground mt-1">Purchases completed</div>
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

          {/* Purchases Records Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Purchase Records</h2>

            {/* Search and Filter */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search purchases by customer name or ID..."
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
                <Button variant="outline" size="sm" className="flex items-center space-x-2" disabled={selectedRows.length !== 1} onClick={() => navigate("/purchases/view-invoice")}>
                  <Eye className="h-4 w-4"/>
                  <span>View Invoice</span>
                </Button>
                <Button variant="outline" size="sm" className="flex items-center space-x-2" onClick={() => navigate("/purchases/create-invoice")}>
                  <Plus className="w-4 h-4" />
                  <span>Create Invoice</span>
                </Button>
                <Button variant="outline" size="sm" className="flex items-center space-x-2" disabled={selectedRows.length !== 1} onClick={handleUpdateClick}>
                  <Edit className="w-4 h-4" />
                  <span>Update</span>
                </Button>
                <Button variant="outline" size="sm" className="flex items-center space-x-2" onClick={handleDeletion} disabled={selectedRows.length === 0}>
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </Button>
              </div>
            </div>

          </div> 

          {purchasesData && purchasesData.length > 0 ? <DataTable columns={cols} data={purchasesData} selectedRows={selectedRows} onRowClick={toggleRowSelection} /> : null}
        </main>
      </div>
    </div>
  );
}

export default Purchases;