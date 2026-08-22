import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { toast } from "sonner"
import DataTable from "@/components/ui/data-table";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import CustomFilter from "@/components/layout/CustomFilter";
import {
  getStatusColor,
  getPaymentStatusColor,
  PurchaseInvoiceStatusMap,
  PaymentStatusMap,
  formatSearchQuery
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
import { Eye, ArrowLeft, Plus, Filter, Search, Edit, Trash2, Lock } from "lucide-react";
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
  const [totalPurchasesMonthly, setTotalPurchasesMonthly] = useState(0)
  const [totalPurchaseInvoicesMonthly, setTotalPurchaseInvoicesMonthly] = useState(0)
  const [totalPendingPurchaseInvoices, setTotalPendingPurchaseInvoices] = useState(0)
  const [totalPendingPayment, setTotalPendingPayment] = useState(0)
  const [searchTerm, setSearchTerm] = useState(null)
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

  const handleDeletion = async () => {
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
    }
  }

  const handleFilterClick = (e) => {
    e.preventDefault();
    setFilterWindowOpen(!filterWindowOpen);
  };

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
      }
    }

    fetchTotalPendingPayment()
    fetchTotalPendingPurchaseInvoices()
    fetchTotalPurchaseInvoicesMonthly()
    fetchTotalPurchases()
    fetchPurchaseInvoices()
  }, [token, isDeleted])

  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchTerm && searchTerm.trim() !== "") {
        const query = formatSearchQuery(searchTerm)
        await fetchPurchaseInvoices(query)
      } else {
        await fetchPurchaseInvoices()
      }
    }, 400) // wait 400ms after user stops typing

    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

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
              <div className="text-sm text-muted-foreground mb-2">Total Purchase Expense this month</div>
              <div className="text-3xl font-bold">PKR {totalPurchasesMonthly}</div>
              {/* <div className="text-sm text-green-600 mt-1">+12% from last month</div> */}
            </div>
            <div className="bg-card rounded-lg p-6 border">
              <div className="text-sm text-muted-foreground mb-2">Total Purchase Invoices this month</div>
              <div className="text-3xl font-bold text-black-600">{totalPurchaseInvoicesMonthly}</div>
            </div>
            <div className="bg-card rounded-lg p-6 border">
              <div className="text-sm text-muted-foreground mb-2">Total Pending Invoices</div>
              <div className="text-3xl font-bold text-black-600">{totalPendingPurchaseInvoices}</div>
              <div className="text-sm text-muted-foreground mt-1">Awaiting payment</div>
            </div>
            <div className="bg-card rounded-lg p-6 border">
              <div className="text-sm text-muted-foreground mb-2">Total Pending Payment</div>
              <div className="text-3xl font-bold text-red-600">PKR {totalPendingPayment}</div>
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
                <Button variant="outline" size="sm" className="flex items-center space-x-2" disabled={!permissions["create"]} onClick={() => navigate("/purchases/create-invoice")}>
                  {permissions["create"] ? <Plus className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  <span>Create Invoice</span>
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

          </div>

          {purchasesData && purchasesData.length > 0 ? <DataTable columns={cols} data={permissions["view"] ? purchasesData : null} selectedRows={selectedRows} onRowClick={toggleRowSelection} /> : null}

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