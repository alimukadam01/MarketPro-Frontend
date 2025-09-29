import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { toast } from "sonner"
import DataTable from "@/components/ui/DataTable";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadcrumb";
import { getStatusColor, getPaymentStatusColor, SalesInvoiceStatusMap, PaymentStatusMap } from "../../services/utils"
import { 
  getInventoryItemList, 
  bulkDeleteInventoryItems, 
  deleteInventoryItem 
} from "../../services/api"
import { Eye, ArrowLeft, Plus, Filter, Search, Edit, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const cols = [
  { key: "id", label: "ID" },
  { key: "product.id", label: "Product" },
  { key: "quantity", label: "Quantity" },
  { key: "quantity_on_hand", label: "On Hand" },
  { key: "quantity_reserved", label: "Reserved" },
  { key: "unit_cost", label: "Unit Cost" },
  { key: "unit_price", label: "Unit Price" },
  { key: "reorder_level", label: "Reorder Level" },
  { key: "updated_at", label: "Last Updated" },
]

const InventoryOverview = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [selectedRows, setSelectedRows] = useState([])
  const [inventoryData, setInventoryData] = useState(null)
  const token = localStorage.getItem("market-pro-access-token") || null
  const businessId = localStorage.getItem("mp-business-id") || null
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
        is_deleted = await bulkDeleteInventoryItems(token, businessId, selectedRows)

      } else {
        is_deleted = await deleteInventoryItem(token, businessId, selectedRows[0])
      }

      if (is_deleted) {
        toast.success("Inventory items deleted successfully.")
        setIsDeleted(!isDeleted)
        setSelectedRows([])
      }else{
        toast.error("Failed to delete Inventory items.")
      }
    }catch(error){
      toast.error("Failed to delete Inventory items.")
      console.error(error)
    }
  }

  const handleUpdateClick = ()  => {
    if (selectedRows.length !== 1) return
    navigate("/inventory/update-inventory-item", { state: { item_id: selectedRows[0] } })
  }

  useEffect(()=>{
    const fetchInventoryItems = async ()=>{
      if (!token) return
      
      try {
        const res = await getInventoryItemList(token, businessId)
        if (res){
          setInventoryData(res)
          toast.success("Successfully fetched Inventory items.")
        }else{
          toast.error("Failed to fetch Inventory items.")
        }
      }catch(error){
        toast.error("Failed to fetch Inventory items.")
        console.error("Error fetching Inventory items:", error)
      }
    }

    fetchInventoryItems()
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
                  <h1 className="text-2xl font-semibold">Inventory Overview</h1>
                  <p className="text-sm text-muted-foreground">View and manage all inventory items.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-card rounded-lg p-6 border">
              <div className="text-sm text-muted-foreground mb-2">Inventory Overview</div>
              <div className="text-3xl font-bold">PKR 77,650</div>
              <div className="text-sm text-green-600 mt-1">+12% from last month</div>
            </div>
            <div className="bg-card rounded-lg p-6 border">
              <div className="text-sm text-muted-foreground mb-2">Completed</div>
              <div className="text-3xl font-bold text-green-600">3</div>
              <div className="text-sm text-muted-foreground mt-1">Total Items</div>
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

          {/* Inventory Items Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Inventory Items</h2>

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
                <Button variant="outline" size="sm" className="flex items-center space-x-2" disabled={selectedRows.length !== 1} onClick={() => navigate("/inventory/view-item")}>
                  <Eye className="h-4 w-4"/>
                  <span>View Invoice</span>
                </Button>
                <Button variant="outline" size="sm" className="flex items-center space-x-2" onClick={() => navigate("/inventory/create-item")}>
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

            {/* Sales Table */}
            <div className="space-y-[10px]">
              {/* Table Header */}
              <div className="bg-card rounded-lg border h-[35px] flex items-center px-4">
                <div className="grid grid-cols-11 gap-4 w-full text-sm font-medium text-muted-foreground">
                  <div className="min-w-0">ID</div>
                  <div className="min-w-0">Product</div>
                  <div className="min-w-0">Quantity</div>
                  <div className="min-w-0">On Hand</div>
                  <div className="min-w-0">Reserved</div>
                  <div className="min-w-0">Unit Cost</div>
                  <div className="min-w-0">Unit Price</div>
                  <div className="min-w-0">Reorder Level</div>
                  <div className="min-w-0">Last Updated</div>
                </div>
              </div>

              {/* Table Rows */}
              {inventoryData && inventoryData.map((sale) => (
                <div
                  key={sale.id}
                  onClick={() => toggleRowSelection(sale.id)}
                  className={`bg-card rounded-lg h-[35px] flex items-center px-4 cursor-pointer transition-colors hover:bg-muted/20 ${
                    selectedRows.includes(sale.id)
                    ? 'border-2 border-[#4285F4]'
                    : sale.quantity < sale.reorder_level
                    ? 'border-2 border-red-500'
                    : 'border border-border'
                    }`}
                >
                  <div className="grid grid-cols-11 gap-4 w-full text-sm">
                    <div className="font-semibold min-w-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">{sale.id}</div>
                    <div className="font-semibold min-w-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">{sale.product}</div>
                    <div className="font-semibold min-w-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">{sale.quantity}</div>
                    <div className="text-muted-foreground min-w-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">{sale.quantity_on_hand}</div>
                    <div className="text-muted-foreground min-w-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">{sale.quantity_reserved}</div>
                    <div className="text-muted-foreground min-w-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">{sale.unit_cost}</div>
                    <div className="text-muted-foreground min-w-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">{sale.unit_price}</div>
                    <div className="text-muted-foreground min-w-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">{sale.reorder_level}</div>
                    <div className="text-muted-foreground min-w-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">{sale.last_updated}</div>

                  </div>
                </div>
              ))}
            </div>
          </div> 

          {/* {inventoryData && inventoryData.length > 0 ? <DataTable columns={cols} data={inventoryData} selectedRows={selectedRows} onRowClick={toggleRowSelection} /> : null} */}
        </main>
      </div>
    </div>
  );
};

export default InventoryOverview;