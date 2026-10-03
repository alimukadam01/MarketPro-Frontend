import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { toast } from "sonner"
import DataTable from "@/components/ui/data-table";
import { MetricCard } from "@/components/dashboard/MetricCard";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import CustomFilter from "@/components/layout/CustomFilter";
import {
  getStatusColor,
  getPaymentStatusColor,
  PurchaseInvoiceStatusMap,
  PaymentStatusMap,
  listCountLabel,
} from "../../services/utils"
import { useAuth } from "../../services/AuthProvider"
import {
  getPurchaseInvoiceList,
  bulkDeletePurchaseInvoice,
  deletePurchaseInvoice,
  getTotalPurchasesMonthly,
  getTotalPurchaseInvoicesMonthly,
  getTotalPendingPurchaseInvoices,
  getTotalPendingPayment

} from "../../services/api"
import { Eye, ArrowLeft, Plus, Filter, Edit, Trash2, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";
import { SearchField } from "@/components/ui/search-field";
import { useDebouncedSearch } from "@/hooks/use-debounced-search";

const cols = [
  { key: "id", label: "ID" },
  { key: "invoice_no", label: "Invoice No." },
  { key: "supplier", label: "Supplier" },
  { key: "date_issued", label: "Invoice Date" },
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

const filter_fields_template = {
  supplier__name: "",
  status: "",
  payment_status: "",
  sub_total: "",
  total: "",
  is_restocked: false,
  is_partially_restocked: false
};

const filter_fields_mapper = {
  supplier__name: {
    label: "Supplier Name",
    type: "text",
    placeholder: "Enter Supplier name",
  },
  status: {
    label: "Order Status",
    type: "text",
    placeholder: "e.g. pending, completed, cancelled",
  },
  payment_status: {
    label: "Payment Status",
    type: "text",
    placeholder: "e.g. paid, unpaid, partial",
  },
  sub_total: {
    label: "Subtotal",
    type: "number",
    placeholder: "Enter subtotal",
  },
  total: {
    label: "Total",
    type: "number",
    placeholder: "Enter total",
  },
  is_restocked: {
    label: "Is Restocked",
    type: "checkbox",
  },
  is_partially_restocked: {
    label: "Is Partially Restocked",
    type: "checkbox",
  },
};

const Purchases = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [selectedRows, setSelectedRows] = useState([])
  const [purchasesData, setPurchasesData] = useState(null)
  // true until the first response lands, so the table never flashes
  // "no records" before it has asked. Cleared in a finally, never on
  // the success path alone, or a failed load shimmers for ever.
  const [loading, setLoading] = useState(true);
  const [totalPurchasesMonthly, setTotalPurchasesMonthly] = useState(null);
  const [totalPurchasesMonthlyLoading, setTotalPurchasesMonthlyLoading] = useState(true);
  const [totalPurchaseInvoicesMonthly, setTotalPurchaseInvoicesMonthly] = useState(null);
  const [totalPurchaseInvoicesMonthlyLoading, setTotalPurchaseInvoicesMonthlyLoading] = useState(true);
  const [totalPendingPurchaseInvoices, setTotalPendingPurchaseInvoices] = useState(null);
  const [totalPendingPurchaseInvoicesLoading, setTotalPendingPurchaseInvoicesLoading] = useState(true);
  const [totalPendingPayment, setTotalPendingPayment] = useState(null);
  const [totalPendingPaymentLoading, setTotalPendingPaymentLoading] = useState(true);
  const { token } = useAuth() || null
  const { getPermissions } = useAuth()
  const permissions = getPermissions("purchases")
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
          is_deleted = await bulkDeletePurchaseInvoice(token, selectedRows)

        } else {
          is_deleted = await deletePurchaseInvoice(token, selectedRows[0])
        }

        if (is_deleted) {
          toast.success("Purchase invoices deleted successfully.")
          setIsDeleted(!isDeleted)
          setSelectedRows([])
        } else {
          toast.error("Failed to delete Purchase invoices.")
        }
      } catch (error) {
        toast.error("Failed to delete Purchase invoices.")
        console.error(error)
      }
  
    } finally {
      setDeleting(false);
    }
  }

  const handleUpdateClick = () => {
    if (selectedRows.length !== 1) return
    navigate("/purchases/update-invoice", { state: { invoice_id: selectedRows[0] } })
  }

  const fetchPurchaseInvoices = async (searchQuery = null) => {
    if (!token) return

    try {
      const res = await getPurchaseInvoiceList(token, searchQuery)
      if (res) {
        setPurchasesData(res)
      } else {
        toast.error("Failed to fetch purchase invoices.")
      }
    } catch (error) {
      toast.error("Failed to fetch purchase invoices.")
      console.error("Error fetching purchase invoices:", error)
    } finally {
        setLoading(false);
    }
  }

  const handleFilterClick = (e) => {
    e.preventDefault();
    setFilterWindowOpen(!filterWindowOpen);
  };

  const { searchTerm, setSearchTerm, searching } = useDebouncedSearch(fetchPurchaseInvoices);

  useEffect(() => {

    const fetchTotalPurchases = async () => {
      if (!token) return

      try {
        const res = await getTotalPurchasesMonthly(token)
        if (res!== null) {
          setTotalPurchasesMonthly(res)
        } else {
          toast.error("Failed to fetch total purchase data.")
        }
      } catch (error) {
        toast.error("Failed to fetch purchase data.")
        console.error("Error fetching purchase data:", error)
      } finally {
        setTotalPurchasesMonthlyLoading(false);
      }
    }

    const fetchTotalPurchaseInvoicesMonthly = async () => {
      if (!token) return

      try {
        const res = await getTotalPurchaseInvoicesMonthly(token)
        if (res!== null) {
          setTotalPurchaseInvoicesMonthly(res)
        } else {
          toast.error("Failed to fetch total monthly purchase invoices.")
        }
      } catch (error) {
        toast.error("Failed to fetch monthly purchase invoices.")
        console.error("Error fetching monthly purchase invoices:", error)
      } finally {
        setTotalPurchaseInvoicesMonthlyLoading(false);
      }
    }

    const fetchTotalPendingPurchaseInvoices = async () => {
      if (!token) return

      try {
        const res = await getTotalPendingPurchaseInvoices(token)
        if (res!== null) {
          setTotalPendingPurchaseInvoices(res)
        } else {
          toast.error("Failed to fetch total pending purchase invoices.")
        }
      } catch (error) {
        toast.error("Failed to fetch pending purchase invoices.")
        console.error("Error fetching pending purchase invoices:", error)
      } finally {
        setTotalPendingPurchaseInvoicesLoading(false);
      }
    }

    const fetchTotalPendingPayment = async () => {
      if (!token) return

      try {
        const res = await getTotalPendingPayment(token)
        if (res!== null) {
          setTotalPendingPayment(res)
        } else {
          toast.error("Failed to fetch total pending payment.")
        }
      } catch (error) {
        toast.error("Failed to fetch pending payment.")
        console.error("Error fetching pending payment:", error)
      } finally {
        setTotalPendingPaymentLoading(false);
      }
    }

    fetchTotalPendingPayment()
    fetchTotalPendingPurchaseInvoices()
    fetchTotalPurchaseInvoicesMonthly()
    fetchTotalPurchases()
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
            <MetricCard
              title="Total Purchase Expense this month"
              value={`PKR ${totalPurchasesMonthly}`}
              loading={totalPurchasesMonthlyLoading}
            />
            <MetricCard
              title="Total Purchase Invoices this month"
              value={totalPurchaseInvoicesMonthly}
              valueClassName="text-black-600"
              loading={totalPurchaseInvoicesMonthlyLoading}
            />
            <MetricCard
              title="Total Pending Invoices"
              value={totalPendingPurchaseInvoices}
              hint="Awaiting payment"
              valueClassName="text-black-600"
              loading={totalPendingPurchaseInvoicesLoading}
            />
            <MetricCard
              title="Total Pending Payment"
              value={`PKR ${totalPendingPayment}`}
              valueClassName="text-red-600"
              loading={totalPendingPaymentLoading}
            />
          </div>

          {/* Purchases Records Section */}
          {/* Sticky from here down: once the heading reaches the top of the
              window it stays there, along with the action row and the column
              header, and only the rows carry on scrolling underneath. The three
              sit in one container so the column header needs no top offset of
              its own - a number that would differ per page and drift whenever a
              heading or a button changed. */}
          <div>
          <div className="sticky top-0 z-20 bg-background pt-4 pb-[10px] space-y-4">
            <h2 className="text-xl font-semibold">
              Purchase Records ({listCountLabel(purchasesData, selectedRows)})
            </h2>

            {/* Search and Filter */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <SearchField
                  placeholder="Search purchases by customer name or ID..."
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
                  <span>Filter</span>
                </Button>
              </div>

              {/* Action Icons */}
              <div className="flex items-center space-x-3">
                <Button variant="outline" size="sm" className="flex items-center space-x-2" disabled={!permissions["create"]} onClick={() => navigate("/purchases/create-invoice")}>
                  {permissions["create"] ? <Plus className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  <span>Create Invoice</span>
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

            {loading || (purchasesData && purchasesData.length > 0) ? (
              <DataTable columns={cols} headerOnly />
            ) : null}
          </div>

          {loading || (purchasesData && purchasesData.length > 0) ? (
            <DataTable
              columns={cols}
              data={permissions["view"] ? purchasesData : null}
              selectedRows={selectedRows}
              onRowClick={toggleRowSelection}
              rowsOnly
              loading={loading}
            />
          ) : null}
          </div>

          <CustomFilter
            title="Filter Purchase Invoices"
            template={filter_fields_template}
            templateMapper={filter_fields_mapper}
            dataFetcher={fetchPurchaseInvoices}
            open={filterWindowOpen}
            setOpen={setFilterWindowOpen}
          />
        </main>
      </div>
    </div>
  );
}

export default Purchases;