import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { toast } from "sonner"
import CustomFilter from "@/components/layout/CustomFilter";
import DataTable from "@/components/ui/data-table";
import { MetricCard } from "@/components/dashboard/MetricCard";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import { listCountLabel } from "../../services/utils"
import { useAuth } from "../../services/AuthProvider"
import {
  getInventoryItemList,
  bulkDeleteInventoryItems,
  deleteInventoryItem,
  getTotalInventoryValue,
  getTotalInventoryValueWithProfit,
  getTotalItemsNotInInventory,
  getTotalRestocksReq
} from "../../services/api";
import { Eye, ArrowLeft, Plus, Filter, Edit, Trash2, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";
import { SearchField } from "@/components/ui/search-field";
import { useDebouncedSearch } from "@/hooks/use-debounced-search";
import { useListQuery } from "@/hooks/use-period";
import { useFilterOptions } from "@/hooks/use-filter-options";

// A failed fetch leaves these null, and the card still renders because its
// loading flag has cleared. "PKR 0" and "null Items" both state a figure the
// server never sent; an em dash says it is missing, which is the truth.
const missing = (v) => v === null || v === undefined;

// Separators, because these run to eight digits - "PKR 46405500" is not a
// number anyone reads at a glance. Same shape as Accounting.tsx's helper.
const formatPKR = (amount) =>
  missing(amount) ? "—" : `PKR ${Number(amount).toLocaleString()}`;

const formatItems = (count) =>
  missing(count) ? "—" : `${count} Item${count === 1 ? "" : "s"}`;

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
  { key: "counted_at", label: "Counted" },
]

// Track code is left to the search box.
const filter_fields_template = {
  product: "",
  location: "",
  stock_level: "",
  price_min: "",
  price_max: "",
};

const stock_level_options = [
  { value: "in_stock", label: "In stock" },
  { value: "low", label: "Low (at or below reorder level)" },
  { value: "out", label: "Out of stock" },
];

const InventoryOverview = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [selectedRows, setSelectedRows] = useState([])
  const [inventoryData, setInventoryData] = useState(null)
  // true until the first response lands, so the table never flashes
  // "no records" before it has asked. Cleared in a finally, never on
  // the success path alone, or a failed load shimmers for ever.
  const [loading, setLoading] = useState(true);
  const [totalInventoryValue, setTotalInventoryValue] = useState(null);
  const [totalInventoryValueLoading, setTotalInventoryValueLoading] = useState(true);
  // Seeded null, not 0, so the card shows a skeleton rather than claiming the
  // stock is worth nothing while the figure is still in flight.
  const [valueWithProfit, setValueWithProfit] = useState(null);
  const [valueWithProfitLoading, setValueWithProfitLoading] = useState(true);
  const [itemsNotInInventory, setItemsNotInInventory] = useState(null);
  const [itemsNotInInventoryLoading, setItemsNotInInventoryLoading] = useState(true);
  const [totalRestocksReq, setTotalRestocksReq] = useState(null);
  const [totalRestocksReqLoading, setTotalRestocksReqLoading] = useState(true);
  const { token } = useAuth() || null
  const { getPermissions, user } = useAuth()
  const permissions = getPermissions("inventory")
  // The search and the filters, kept together so one never drops the other.
  const listQuery = useListQuery()
  // How many filters are on, for the Filter button.
  const [filterCount, setFilterCount] = useState(0)
  const options = useFilterOptions(token, user, ["products", "locations"])

  const filter_fields_mapper = {
    // A product covers all its variants.
    product: {
      label: "Product",
      type: "combobox",
      fullWidth: true,
      options: options.products,
      loading: options.loading.products,
      placeholder: "Any product",
      emptyText: "No products yet.",
      notFoundText: "No product matches that.",
    },
    location: {
      label: "Location",
      type: "select",
      options: options.locations,
      anyLabel: "Any location",
    },
    stock_level: {
      label: "Stock level",
      type: "select",
      options: stock_level_options,
      anyLabel: "Any level",
    },
    price: { label: "Unit price (PKR)", type: "range", input: "number", keys: ["price_min", "price_max"], fullWidth: true },
  }
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

  // Guards the delete the same way usePending guards a submit:

  // the button stayed live through the request, so a bulk delete

  // could be fired twice.

  const [deleting, setDeleting] = useState(false);

  const handleDeletion = async () => {
    setDeleting(true);
    try {
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
  
    } finally {
      setDeleting(false);
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

  // `query` is the search or the filter that produced it; left out, the
  // current one is kept (a refetch after a delete).
  const fetchInventoryItems = async (query?: string | null) => {
    if (!token) return

    try {
      const res = await getInventoryItemList(token, businessId, listQuery.track(query))
      if (res) {
        setInventoryData(res)
      } else {
        toast.error("Failed to fetch Inventory items.")
      }
    } catch (error) {
      toast.error("Failed to fetch Inventory items.")
      console.error("Error fetching Inventory items:", error)
    } finally {
        setLoading(false);
    }
  }

  const { searchTerm, setSearchTerm, searching } = useDebouncedSearch(fetchInventoryItems);

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
      } finally {
        setTotalInventoryValueLoading(false);
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
      } finally {
        setTotalRestocksReqLoading(false);
      }
    }

    const fetchValueWithProfit = async () => {
      if (!token) return

      try {
        const res = await getTotalInventoryValueWithProfit(token)
        if (res !== null) {
          setValueWithProfit(res)
        } else {
          toast.error("Failed to fetch Inventory Value With Profit.")
        }
      } catch (error) {
        toast.error("Failed to fetch Inventory Value With Profit.")
        console.error("Error fetching Inventory Value With Profit:", error)
      } finally {
        setValueWithProfitLoading(false);
      }
    }

    const fetchItemsNotInInventory = async () => {
      if (!token) return

      try {
        const res = await getTotalItemsNotInInventory(token)
        if (res !== null) {
          setItemsNotInInventory(res)
        } else {
          toast.error("Failed to fetch Items Not In Inventory.")
        }
      } catch (error) {
        toast.error("Failed to fetch Items Not In Inventory.")
        console.error("Error fetching Items Not In Inventory:", error)
      } finally {
        setItemsNotInInventoryLoading(false);
      }
    }

    fetchTotalRestocksReq()
    fetchTotalInventoryValue()
    fetchValueWithProfit()
    fetchItemsNotInInventory()
    fetchInventoryItems()
  }, [token, isDeleted])


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
            <MetricCard
              title="Total Inventory Value"
              value={formatPKR(totalInventoryValue)}
              hint="At what the stock cost"
              loading={totalInventoryValueLoading}
              error={!totalInventoryValueLoading && totalInventoryValue == null}
            />
            <MetricCard
              title="Total Inventory Value (With Profit)"
              value={formatPKR(valueWithProfit)}
              hint="At what the stock sells for"
              loading={valueWithProfitLoading}
              error={!valueWithProfitLoading && valueWithProfit == null}
            />
            <MetricCard
              title="Items Not In Inventory"
              value={formatItems(itemsNotInInventory)}
              hint="No stock record yet"
              loading={itemsNotInInventoryLoading}
              error={!itemsNotInInventoryLoading && itemsNotInInventory == null}
            />
            <MetricCard
              title="Total Restocks Required"
              value={formatItems(totalRestocksReq)}
              valueClassName="text-red-600"
              hint="Running out of stock"
              loading={totalRestocksReqLoading}
              error={!totalRestocksReqLoading && totalRestocksReq == null}
            />
          </div>

          {/* Inventory Items Section */}
          {/* Sticky from here down: once the heading reaches the top of the
              window it stays there, along with the action row and the column
              header, and only the rows carry on scrolling underneath. The three
              sit in one container so the column header needs no top offset of
              its own - a number that would differ per page and drift whenever a
              heading or a button changed. */}
          <div>
          <div className="sticky top-0 z-20 bg-background pt-4 pb-[10px] space-y-4">
            <h2 className="text-xl font-semibold">
              Inventory Items ({listCountLabel(inventoryData, selectedRows)})
            </h2>

            {/* Search and Filter */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <SearchField
                  placeholder="Search inventory items"
                  value={searchTerm}
                  onChange={setSearchTerm}
                  pending={searching}
                />
                <Button
                  variant="outline"
                  className="flex items-center space-x-2"
                  onClick={handleFilterClick}
                  type="button"
                >
                  <Filter className="w-4 h-4" />
                  <span>{filterCount ? `Filter · ${filterCount}` : "Filter"}</span>
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
                <Button variant="outline" size="sm" className="flex items-center space-x-2" onClick={handleDeletion} disabled={deleting || selectedRows.length === 0 || !permissions["delete"]}>
                  {deleting ? <Spinner size={16} /> : permissions["delete"] ? <Trash2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  <span>Delete</span>
                </Button>
              </div>
            </div>

            {/* Same colsConfig as the rows below, or the pinned header's tracks
                would not line up with them. */}
            {loading || (inventoryData && inventoryData.length > 0) ? (
              <DataTable
                columns={cols}
                colsConfig={"[48px_512px_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr]"}
                headerOnly
              />
            ) : null}
          </div>

          {/* Inventory Data Table */}
          {loading || (inventoryData && inventoryData.length > 0) ? (
            <DataTable
              columns={cols}
              data={permissions["view"] ? inventoryData : null}
              selectedRows={selectedRows}
              onRowClick={toggleRowSelection}
              colsConfig={"[48px_512px_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr]"}
              rowsOnly
              loading={loading}
            />
          ) : null}
          </div>

          <CustomFilter
            title="Filter Inventory Items"
            template={filter_fields_template}
            templateMapper={filter_fields_mapper}
            dataFetcher={fetchInventoryItems}
            open={filterWindowOpen}
            setOpen={setFilterWindowOpen}
            onActiveChange={setFilterCount}
          />
        </main>
      </div>
    </div>
  );
};

export default InventoryOverview;