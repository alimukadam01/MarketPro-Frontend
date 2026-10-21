import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { toast } from "sonner"
import DataTable from "@/components/ui/data-table";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { PeriodSwitch } from "@/components/ui/period-switch";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import CustomFilter from "@/components/layout/CustomFilter";
import {
  getPurchaseStatusColor,
  getPaymentStatusColor,
  PurchaseInvoiceStatusMap,
  PaymentStatusMap,
  listCountLabel,
  formatCurrency,
} from "../../services/utils"
import { PAGE_PERIODS, periodHint } from "../../services/periods";
import { useAuth } from "../../services/AuthProvider"
import {
  getPurchaseInvoiceList,
  bulkDeletePurchaseInvoice,
  deletePurchaseInvoice,
  getPurchasesSummary,
  getTotalPendingPurchaseInvoices,
  getTotalPendingPayment,

} from "../../services/api"
import { Eye, ArrowLeft, Plus, Filter, Edit, Trash2, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";
import { SearchField } from "@/components/ui/search-field";
import { useDebouncedSearch } from "@/hooks/use-debounced-search";
import { useListPeriod, useOnChange } from "@/hooks/use-period";
import { useFilterOptions } from "@/hooks/use-filter-options";

/**
 * The grid the table is laid out on.
 *
 * Interpolated into `grid-cols-${colsConfig}` by DataTable, so Tailwind cannot
 * see it in the source and it has to be safelisted in tailwind.config.ts.
 * Without that entry the class is purged silently - no build error, the table
 * just loses its grid.
 *
 * 14 tracks: S.no, which DataTable renders itself, then the 13 columns below.
 * Fixed widths wherever the content has a known size, so the four money
 * columns and the two status pills divide what is left:
 *
 *   48px   S.no            - as specified
 *   120px  Invoice No.     - as specified
 *   240px  Supplier        - as specified; every name here carries the
 *                            "(contact TBC)" placeholder, so they run long
 *   80px   Invoice Date    - DD/MM/YYYY never varies
 *   1fr    Status          - a pill, and "Partially Received" is long
 *   1fr    Payment Status  - a pill, "Partially Paid"
 *   80px   Delivery Date   - DD/MM/YYYY
 *   80px   Date Due        - DD/MM/YYYY
 *   56px   Tax             - "0%" or "none"
 *   56px   Total Items     - a small integer
 *   1fr    Subtotal        - money
 *   1fr    Total           - money
 *   1fr    Amount Paid     - money
 *   1fr    Pending Balance - money
 *
 * One column more than the sales table, so it is tighter: the largest figures
 * can still outgrow their cell, which is what MarqueeCell is there for.
 */
const COLS_CONFIG =
  "[48px_120px_240px_96px_1fr_1fr_96px_96px_56px_80px_1fr_1fr_1fr]";

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
        className={`px-2 py-0.25 rounded-full text-xs font-medium whitespace-nowrap ${getPurchaseStatusColor(
          value
        )}`}
      >
        {PurchaseInvoiceStatusMap[value] ?? value}
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
  { key: "total", label: "Total" },
  { key: "amount_paid", label: "Amount Paid" },
  { key: "pending_balance", label: "Pending Balance" },
]

const filter_fields_template = {
  supplier: "",
  status: "",
  payment_status: "",
  // No invoice-date range here: the page's period switch is that filter, and
  // two of them could disagree. Ranges, not single dates, for the others.
  delivery_from: "",
  delivery_to: "",
  date_due_from: "",
  date_due_to: "",
  total_min: "",
  total_max: "",
  created_by: "",
  project: "",
};

// Order status, as stored. The free-text box this replaces suggested
// "pending, completed, cancelled", none of which are values the column holds -
// it keeps single-letter codes, and DjangoFilterBackend matches them exactly,
// so the field could not match anything a user typed.
const status_options = Object.entries(PurchaseInvoiceStatusMap).map(
  ([value, label]) => ({ value, label })
);

// Only the three a purchase invoice can actually report. payment_status is
// derived from its receipts, and PurchaseInvoice.payment_status returns P, PP
// or PEN and nothing else - PaymentStatusMap also carries Cancelled and
// Refunded, which no invoice can ever be, so offering them would be a choice
// that always comes back empty.
const payment_status_options = ["P", "PP", "PEN"].map((value) => ({
  value,
  label: PaymentStatusMap[value],
}));

const Purchases = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [selectedRows, setSelectedRows] = useState([])
  const [purchasesData, setPurchasesData] = useState(null)
  // true until the first response lands, so the table never flashes
  // "no records" before it has asked. Cleared in a finally, never on
  // the success path alone, or a failed load shimmers for ever.
  const [loading, setLoading] = useState(true);
  const [totalPendingPurchaseInvoices, setTotalPendingPurchaseInvoices] = useState(null);
  const [totalPendingPurchaseInvoicesLoading, setTotalPendingPurchaseInvoicesLoading] = useState(true);
  const [totalPendingPayment, setTotalPendingPayment] = useState(null);
  const [totalPendingPaymentLoading, setTotalPendingPaymentLoading] = useState(true);
  const { token } = useAuth() || null
  const { getPermissions, user } = useAuth()
  const permissions = getPermissions("purchases")
  const [isDeleted, setIsDeleted] = useState(false)
  const [filterWindowOpen, setFilterWindowOpen] = useState(false);
  // Only the filter's supplier picker needs these. Loaded alongside the page
  // rather than when the dialog opens, so the picker is never empty on the
  // first open.
  // How many filters are on, for the Filter button.
  const [filterCount, setFilterCount] = useState(0);
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

  // The page switch, and the cards worked out from the rows the table shows.
  const list = useListPeriod(
    (query) => getPurchasesSummary(token, query),
    "Failed to fetch the purchase figures.",
  )
  const summary = list.summary

  // `query` is the search or the filter that produced it; left out, the
  // current one is kept (a refetch after a delete or a period change).
  const fetchPurchaseInvoices = async (query?: string | null) => {
    if (!token) return

    try {
      const res = await getPurchaseInvoiceList(token, list.track(query))
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

    fetchPurchaseInvoices()
  }, [token, isDeleted])

  // A new period refetches the rows, and with them the cards.
  useOnChange(list.period, () => fetchPurchaseInvoices())

  // The filter's dropdowns, loaded with the page. Suppliers and projects are
  // filtered by id, so two suppliers sharing a name stay apart.
  const options = useFilterOptions(token, user, ["suppliers", "projects", "staff"]);

  const filter_fields_mapper = {
    supplier: {
      label: "Supplier",
      type: "combobox",
      // Spans the row: it is the field most often used, and these names are
      // the longest text in the box - "name (business_name)".
      fullWidth: true,
      options: options.suppliers,
      loading: options.loading.suppliers,
      placeholder: "Any supplier",
      emptyText: "No suppliers yet.",
      notFoundText: "No supplier matches that.",
    },
    status: {
      label: "Order Status",
      type: "select",
      options: status_options,
      anyLabel: "Any status",
    },
    payment_status: {
      label: "Payment Status",
      type: "select",
      options: payment_status_options,
      anyLabel: "Any payment status",
    },
    delivery: { label: "Delivery date", type: "range", input: "date", keys: ["delivery_from", "delivery_to"], fullWidth: true },
    date_due: { label: "Due date", type: "range", input: "date", keys: ["date_due_from", "date_due_to"], fullWidth: true },
    total: { label: "Total (PKR)", type: "range", input: "number", keys: ["total_min", "total_max"] },
    created_by: {
      label: "Entered by",
      type: "select",
      options: options.staff,
      anyLabel: "Anyone",
    },
    project: {
      label: "Project",
      type: "combobox",
      fullWidth: true,
      options: options.projects,
      loading: options.loading.projects,
      placeholder: "Any project",
      emptyText: "No projects yet.",
      notFoundText: "No project matches that.",
    },
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

            <div className="flex flex-wrap items-center justify-between gap-4">
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

              {/* Narrows the cards and the table together. */}
              <PeriodSwitch
                label="Period for the cards and the table"
                options={PAGE_PERIODS}
                value={list.period}
                onChange={list.setPeriod}
                allowCustom
              />
            </div>
          </div>

          {/* Key Metrics Cards. The first three come from the rows the table
              shows; the two pending figures are balances, so they never
              follow the period. */}
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-6">
            <MetricCard
              title="Purchases Invoiced"
              value={formatCurrency(summary?.purchases_invoiced)}
              hint={periodHint(summary?.period, summary?.filtered)}
              loading={list.summaryLoading}
              valueLoading={list.summaryRefreshing}
            />
            <MetricCard
              title="Payments Made"
              value={formatCurrency(summary?.payments_made)}
              hint={periodHint(summary?.period, summary?.filtered)}
              loading={list.summaryLoading}
              valueLoading={list.summaryRefreshing}
            />
            <MetricCard
              title="Invoices Raised"
              value={summary?.invoices_raised}
              hint={periodHint(summary?.period, summary?.filtered)}
              loading={list.summaryLoading}
              valueLoading={list.summaryRefreshing}
            />
            <MetricCard
              title="Pending Invoices"
              value={totalPendingPurchaseInvoices}
              hint="As of today"
              loading={totalPendingPurchaseInvoicesLoading}
            />
            <MetricCard
              title="Pending Payment"
              value={formatCurrency(totalPendingPayment)}
              hint="As of today"
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
                  <span>{filterCount ? `Filter · ${filterCount}` : "Filter"}</span>
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
              <DataTable columns={cols} colsConfig={COLS_CONFIG} headerOnly />
            ) : null}
          </div>

          {loading || (purchasesData && purchasesData.length > 0) ? (
            <DataTable
              columns={cols}
              // Must match the header's, or the two grids drift apart and
              // every cell sits under the wrong label.
              colsConfig={COLS_CONFIG}
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
            onActiveChange={setFilterCount}
          />
        </main>
      </div>
    </div>
  );
}

export default Purchases;