import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { toast } from "sonner"
import CustomFilter from "@/components/layout/CustomFilter";
import DataTable from "@/components/ui/data-table";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import { formatSearchQuery } from "../../services/utils"
import { useAuth } from "../../services/AuthProvider"
import {
  getInventoryItemList,
  bulkDeleteInventoryItems,
  deleteInventoryItem,
  getTotalInventoryValue,
  getTotalRestocksReq
} from "../../services/api";
import { Eye, ArrowLeft, Plus, Filter, Search, Edit, Trash2, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const cols = [
  { key: "id", label: "ID" },
  { key: "product", label: "Product" },
  { key: "quantity", label: "Quantity" },
  { key: "quantity_on_hand", label: "On Hand" },
  { key: "quantity_reserved", label: "Reserved" },
  { key: "unit_cost", label: "Unit Cost" },
  { key: "unit_price", label: "Unit Price" },
  { key: "reorder_level", label: "Reorder Level" },
  { key: "last_updated", label: "Last Updated" },
]

const filter_fields_template = {
  product__name: "",
  product__base__name: "",
  location__name: "",
  track_code: "",
};

const filter_fields_mapper = {
  product__base__name: {
    label: "Product Name",
    type: "text",
    placeholder: "Enter Product name",
  },
  product__name: {
    label: "Product Variant Name",
    type: "text",
    placeholder: "Enter Product Variant name",
  },
  location__name: {
    label: "Location Name",
    type: "text",
    placeholder: "Enter Location name",
  },
  track_code: {
    label: "Track Code",
    type: "text",
    placeholder: "Enter Track Code",
  },
};

const InventoryOverview = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [selectedRows, setSelectedRows] = useState([])
  const [inventoryData, setInventoryData] = useState(null)
  const [totalInventoryValue, setTotalInventoryValue] = useState(0)
  const [totalRestocksReq, setTotalRestocksReq] = useState(0)
  const [searchTerm, setSearchTerm] = useState(null);
  const { token } = useAuth() || null
  const { getPermissions } = useAuth()
  const permissions = getPermissions("inventory")
  const businessId = localStorage.getItem("mp-business-id") || null
  const [isDeleted, setIsDeleted] = useState(false)
  const [filterWindowOpen, setFilterWindowOpen] = useState(false);
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
    try {
      if (selectedRows.length > 1) {
        is_deleted = await bulkDeleteInventoryItems(token, businessId, selectedRows)

      } else {
        is_deleted = await deleteInventoryItem(token, businessId, selectedRows[0])
      }

      if (is_deleted) {
        toast.success("Inventory items deleted successfully.")
        setIsDeleted(!isDeleted)
        setSelectedRows([])
      } else {
        toast.error("Failed to delete Inventory items.")
      }
    } catch (error) {
      toast.error("Failed to delete Inventory items.")
      console.error(error)
    }
  }

  const handleUpdateClick = () => {
    if (selectedRows.length !== 1) return
    navigate("/inventory/update-item", { state: { item_id: selectedRows[0] } })
  }

  const handleFilterClick = (e) => {
    e.preventDefault();
    setFilterWindowOpen(!filterWindowOpen);
  };

  const fetchInventoryItems = async (searchQuery = null) => {
    if (!token) return

    try {
      const res = await getInventoryItemList(token, businessId, searchQuery)
      if (res) {
        setInventoryData(res)
      } else {
        toast.error("Failed to fetch Inventory items.")
      }
    } catch (error) {
      toast.error("Failed to fetch Inventory items.")
      console.error("Error fetching Inventory items:", error)
    }
  }

  useEffect(() => {

    const fetchTotalInventoryValue = async () => {
      if (!token) return

      try {
        const res = await getTotalInventoryValue(token)
        if (res !== null) {
          setTotalInventoryValue(res)
        } else {
          toast.error("Failed to fetch Total Inventory Value.")
        }
      } catch (error) {
        toast.error("Failed to fetch Total Inventory Value.")
        console.error("Error fetching Total Inventory Value:", error)
      }
    }

    const fetchTotalRestocksReq = async () => {
      if (!token) return

      try {
        const res = await getTotalRestocksReq(token)
        if (res !== null) {
          setTotalRestocksReq(res)
        } else {
          toast.error("Failed to fetch Total Inventory Value.")
        }
      } catch (error) {
        toast.error("Failed to fetch Total Inventory Value.")
        console.error("Error fetching Total Inventory Value:", error)
      }
    }

    fetchTotalRestocksReq()
    fetchTotalInventoryValue()
    fetchInventoryItems()
  }, [token, isDeleted])

  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchTerm && searchTerm.trim() !== "") {
        const query = formatSearchQuery(searchTerm)
        await fetchInventoryItems(query)
      } else {
        await fetchInventoryItems()
      }
    }, 400); // wait 400ms after user stops typing

    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  {
    console.log(selectedRows)
  }

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
                  <p className="text-sm text-muted-foreground">View and manage all inventory items</p>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-card rounded-lg p-6 border">
              <div className="text-sm text-muted-foreground mb-2">Total Inventory Value</div>
              <div className="text-3xl font-bold">PKR {totalInventoryValue}</div>
              {/* <div className="text-sm text-green-600 mt-1">+12% from last month</div> */}
            </div>
            <div className="bg-card rounded-lg p-6 border">
              <div className="text-sm text-muted-foreground mb-2">Total Restocks Required</div>
              <div className="text-3xl font-bold text-red-600">{totalRestocksReq} Item{totalRestocksReq > 1 ? 's' : ''}</div>
              <div className="text-sm text-muted-foreground mt-1">Running out of stock</div>
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
                    placeholder="Search inventory items"
                    className="pl-10 w-80"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button
                  variant="outline"
                  className="flex items-center space-x-2"
                  onClick={handleFilterClick}
                  type="button"
                >
                  <Filter className="w-4 h-4" />
                  <span>Filter</span>
                </Button>
              </div>

              {/* Action Icons */}
              <div className="flex items-center space-x-3">
                <Button variant="outline" size="sm" className="flex items-center space-x-2" disabled={!permissions["create"]} onClick={() => navigate("/inventory/create-item")}>
                  {permissions["create"] ? <Plus className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  <span>Create Item</span>
                </Button>
                <Button variant="outline" size="sm" className="flex items-center space-x-2" disabled={selectedRows.length !== 1 || !permissions["edit"]} onClick={handleUpdateClick}>
                  {permissions["edit"] ? <Edit className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  <span>View/Update</span>
                </Button>
                <Button variant="outline" size="sm" className="flex items-center space-x-2" onClick={handleDeletion} disabled={selectedRows.length === 0 || !permissions["delete"]}>
                  {permissions["delete"] ? <Trash2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  <span>Delete</span>
                </Button>
              </div>
            </div>

            {/* Inventory Data Table */}
            {inventoryData && inventoryData.length > 0 ? <DataTable columns={cols} data={permissions["view"] ? inventoryData : null} selectedRows={selectedRows} onRowClick={toggleRowSelection} colsConfig={"[48px_512px_1fr_1fr_1fr_1fr_1fr_1fr_1fr]"} /> : null}

            <CustomFilter
              template={filter_fields_template}
              templateMapper={filter_fields_mapper}
              dataFetcher={fetchInventoryItems}
              open={filterWindowOpen}
              setOpen={setFilterWindowOpen}
            />
          </div>
        </main>
      </div>
    </div>
  );
};

export default InventoryOverview;