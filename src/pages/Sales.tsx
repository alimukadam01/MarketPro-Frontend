import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import CustomFilter from "@/components/layout/CustomFilter";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import DataTable from "@/components/ui/data-table";
import { MetricCard } from "@/components/dashboard/MetricCard";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import {
  getStatusColor,
  getPaymentStatusColor,
  SalesInvoiceStatusMap,
  PaymentStatusMap,
  listCountLabel,
  createIdMap,
} from "../../services/utils";
import { useAuth } from "../../services/AuthProvider"
import {
  getSalesInvoiceList,
  getTotalSalesDaily,
  getTotalItemsSoldDaily,
  getTotalSalesInvoicesDaily,
  bulkDeleteSalesInvoice,
  deleteSalesInvoice,
  getCustomersList,
} from "../../services/api";
import {
  Download,
  ArrowLeft,
  Plus,
  Filter,
  Edit,
  Trash2,
  Lock,
  Send,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import WalkInCustomer from "@/components/ui/walk-in-customer";
import { useInvoiceActions } from "@/hooks/use-invoice-actions";
import { Spinner } from "@/components/ui/spinner";
import { SearchField } from "@/components/ui/search-field";
import { useDebouncedSearch } from "@/hooks/use-debounced-search";

//v2 idea: create an endpoint that serves these 2 arrays individually for each customer.

/**
 * The grid the table is laid out on.
 *
 * Interpolated into `grid-cols-${colsConfig}` by DataTable, so Tailwind cannot
 * see it in the source and it has to be safelisted in tailwind.config.ts.
 * Without that entry the class is purged silently - no build error, the table
 * just loses its grid.
 *
 * 13 tracks: S.no, which DataTable renders itself, then the 12 columns below.
 * Fixed widths wherever the content has a known size, so the five money
 * columns get what is left and "PKR 1,234,567" does not start scrolling
 * inside its cell:
 *
 *   48px   S.no            - as specified
 *   120px  Invoice No.     - as specified
 *   240px  Customer        - as specified; names here run long, e.g.
 *                            "Mr Mohd C/O Hasnain Kanpur"
 *   1fr    Status          - a pill, and "Partially Completed" is long
 *   1fr    Payment Status  - a pill, "Partially Paid"
 *   88px   Date Issued     - DD/MM/YYYY never varies
 *   88px   Date Due        - same
 *   72px   Tax             - "0%" or "none"
 *   88px   Discount        - "PKR 6,000" or "none"
 *   72px   Total Items     - a small integer
 *   1fr    Total           - money
 *   1fr    Amount Paid     - money
 *   1fr    Pending Balance - money
 */
const COLS_CONFIG =
  "[48px_120px_240px_1fr_1fr_88px_88px_72px_88px_84px_1fr_1fr_1fr]";

const cols = [
  { key: "id", label: "ID" },
  { key: "invoice_no", label: "Invoice No." },
  { key: "customer", label: "Customer" },
  {
    key: "status",
    label: "Status",
    render: (value) => (
      <span
        className={`px-2 py-0.25 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(
          value
        )}`}
      >
        {SalesInvoiceStatusMap[value]}
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
  { key: "date_issued", label: "Date Issued" },
  { key: "date_due", label: "Date Due" },
  { key: "tax", label: "Tax" },
  { key: "discount", label: "Discount" },
  { key: "total_items", label: "Total Items" },
  { key: "total", label: "Total" },
  { key: "amount_paid", label: "Amount Paid" },
  { key: "pending_balance", label: "Pending Balance" },
];

/** Only what the filter's customer picker reads off a customer. */
type FilterCustomer = {
  name?: string
  phone_number?: string
  city?: { name?: string }
}

const filter_fields_template = {
  customer__name: "",
  status: "",
  payment_status: "",
  // Ranges, not single dates. date_issued is a DateTimeField, so an exact
  // match would have to be the precise instant rather than the day.
  date_issued_from: "",
  date_issued_to: "",
  date_due_from: "",
  date_due_to: "",
  sub_total: "",
  total: "",
};

// Order status, as stored. The free-text box this replaces suggested
// "pending, completed, cancelled", none of which are values the column holds -
// it keeps single-letter codes, and DjangoFilterBackend matches them exactly,
// so the field could not match anything a user typed.
const status_options = Object.entries(SalesInvoiceStatusMap).map(
  ([value, label]) => ({ value, label })
);

// Only the three a sales invoice can actually report. payment_status is
// derived from its receipts, and SalesInvoice.payment_status returns P, PP or
// PEN and nothing else - PaymentStatusMap also carries Cancelled and
// Refunded, which no invoice can ever be, so offering them would be a choice
// that always comes back empty.
const payment_status_options = ["P", "PP", "PEN"].map((value) => ({
  value,
  label: PaymentStatusMap[value],
}));

const Sales = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [selectedRows, setSelectedRows] = useState([]);
  const [salesData, setSalesData] = useState(null);
  // true until the first response lands, so the table never flashes
  // "no records" before it has asked. Cleared in a finally, never on
  // the success path alone, or a failed load shimmers for ever.
  const [loading, setLoading] = useState(true);
  const [totalSalesDaily, setTotalSalesDaily] = useState(null);
  const [totalSalesDailyLoading, setTotalSalesDailyLoading] = useState(true);
  const [totalItemsSoldDaily, setTotalItemsSoldDaily] = useState(null);
  const [totalItemsSoldDailyLoading, setTotalItemsSoldDailyLoading] = useState(true);
  const [totalInvoicesDaily, setTotalInvoicesDaily] = useState(null);
  const [totalInvoicesDailyLoading, setTotalInvoicesDailyLoading] = useState(true);
  const { token } = useAuth() || null;
  const { getPermissions } = useAuth()
  const permissions = getPermissions("sales")
  const [isDeleted, setIsDeleted] = useState(false);
  const [filterWindowOpen, setFilterWindowOpen] = useState(false);
  // Only the filter's customer picker needs these. Loaded alongside the page
  // rather than when the dialog opens, so the picker is never empty on the
  // first open.
  const [customers, setCustomers] = useState<Record<string, FilterCustomer>>({});
  const [customersLoading, setCustomersLoading] = useState(true);
  const navigate = useNavigate();
  // Download never prompts. Sending prompts only for a counter sale, which has
  // no number to send to until the buyer is named.
  const {
    downloadInvoice, sendOnWhatsApp, isDownloading, isSending, isBusy,
    walkInDialogProps,
  } = useInvoiceActions();

  const toggleRowSelection = (id: string) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  };

  // Guards the delete the same way usePending guards a submit:

  // the button stayed live through the request, so a bulk delete

  // could be fired twice.

  const [deleting, setDeleting] = useState(false);

  const handleDeletion = async () => {
    setDeleting(true);
    try {
      if (selectedRows.length <= 0) return;

      let is_deleted = false;
      try {
        if (selectedRows.length > 1) {
          is_deleted = await bulkDeleteSalesInvoice(token, selectedRows);
        } else {
          console.log("Deleting single invoice with ID:", selectedRows[0]);
          is_deleted = await deleteSalesInvoice(token, selectedRows[0]);
        }

        if (is_deleted) {
          toast.success("Sales invoices deleted successfully.");
          setIsDeleted(!isDeleted);
          setSelectedRows([]);
        } else {
          toast.error("Failed to delete sales invoices.");
        }
      } catch (error) {
        toast.error("Failed to delete sales invoices.");
        console.error(error);
      }
  
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdateClick = () => {
    if (selectedRows.length !== 1) return;
    navigate("/sales/update-invoice", {
      state: { invoice_id: selectedRows[0] },
    });
  };

  const fetchSalesInvoices = async (searchQuery = null) => {
    if (!token) return;

    try {
      const res = await getSalesInvoiceList(token, searchQuery);
      if (res) {
        setSalesData(res);
      } else {
        toast.error("Failed to fetch sales invoices.");
      }
    } catch (error) {
      toast.error("Failed to fetch sales invoices.");
      console.error("Error fetching sales invoices:", error);
    } finally {
        setLoading(false);
    }
  };

  const handleFilterClick = (e) => {
    e.preventDefault();
    setFilterWindowOpen(!filterWindowOpen);
  };

  const { searchTerm, setSearchTerm, searching } = useDebouncedSearch(fetchSalesInvoices);

  useEffect(() => {

    const fetchTotalSalesDaily = async ()=>{
      if (!token) return;

      try {
        const res = await getTotalSalesDaily(token);
        if (res != null) {
          setTotalSalesDaily(res);
        } else {
          toast.error("Failed to fetch total sales data.");
        }
      } catch (error) {
        toast.error("Failed to fetch total sales data.");
        console.error("Error fetching total sales data:", error);
      } finally {
        setTotalSalesDailyLoading(false);
      }
    }

    const fetchTotalItemsSoldDaily = async ()=>{
      if (!token) return;

      try {
        const res = await getTotalItemsSoldDaily(token);
        if (res !== null) {
          setTotalItemsSoldDaily(res);
        } else {
          toast.error("Failed to fetch total items sold data.");
        }
      } catch (error) {
        toast.error("Failed to fetch total items sold data.");
        console.error("Error fetching total items sold data:", error);
      } finally {
        setTotalItemsSoldDailyLoading(false);
      }
    }

    const fetchTotalInvoicesDaily = async ()=>{
      if (!token) return;

      try {
        const res = await getTotalSalesInvoicesDaily(token);
        if (res !== null) {
          setTotalInvoicesDaily(res);
        } else {
          toast.error("Failed to fetch total invoices data.");
        }
      } catch (error) {
        toast.error("Failed to fetch total invoices data.");
        console.error("Error fetching total invoices data:", error);
      } finally {
        setTotalInvoicesDailyLoading(false);
      }
    }

    const fetchCustomers = async () => {
      if (!token) return;

      try {
        const res = await getCustomersList(token);
        if (res) {
          setCustomers(createIdMap(res));
        } else {
          toast.error("Failed to fetch customers.");
        }
      } catch (error) {
        toast.error("Failed to fetch customers.");
        console.error("Error fetching customers:", error);
      } finally {
        setCustomersLoading(false);
      }
    }

    fetchTotalInvoicesDaily()
    fetchTotalItemsSoldDaily()
    fetchTotalSalesDaily()
    fetchCustomers()
    fetchSalesInvoices();
  }, [token, isDeleted])

  // The filter sends customer__name, so the option value is the name rather
  // than the id - that is the field the API exposes, and picking from a list
  // means it always matches exactly, which the free-text box it replaces
  // could not guarantee.
  //
  // Keyed by name so two customers sharing one cannot produce duplicate
  // options; they would be indistinguishable in the list anyway, and the
  // filter would return both either way.
  const customerOptions = useMemo(() => {
    const byName = new Map();
    Object.values(customers).forEach((customer) => {
      if (!customer?.name || byName.has(customer.name)) return;
      byName.set(customer.name, {
        value: customer.name,
        label: customer.name,
        keywords: [customer.phone_number, customer.city?.name].filter(Boolean),
      });
    });
    return [...byName.values()];
  }, [customers]);

  // Built here, not at module scope, because the customer options arrive from
  // a fetch.
  const filter_fields_mapper = useMemo(() => ({
    customer__name: {
      label: "Customer",
      type: "combobox",
      // Spans the row: it is the field most often used, and a customer name
      // is far longer than a status or a date.
      fullWidth: true,
      options: customerOptions,
      loading: customersLoading,
      placeholder: "Any customer",
      emptyText: "No customers yet.",
      notFoundText: "No customer matches that.",
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
    date_issued_from: { label: "Issued From", type: "date" },
    date_issued_to: { label: "Issued To", type: "date" },
    date_due_from: { label: "Due From", type: "date" },
    date_due_to: { label: "Due To", type: "date" },
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
  }), [customerOptions, customersLoading]);


  return (
    <div className="min-h-screen bg-background">
      <Sidebar onCollapseChange={setSidebarCollapsed} />

      <div
        className={`${
          sidebarCollapsed ? "ml-16" : "ml-64"
        } transition-all duration-300 flex flex-col`}
      >
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
                  <p className="text-sm text-muted-foreground">
                    View and manage all sales transactions
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <MetricCard
              title="Total Sales Today"
              value={`PKR ${totalSalesDaily}`}
              loading={totalSalesDailyLoading}
            />
            
            <MetricCard
              title="Total Invoices Today"
              value={totalInvoicesDaily}
              loading={totalInvoicesDailyLoading}
            />
            
            <MetricCard
              title="Total Items Sold Today"
              value={totalItemsSoldDaily}
              loading={totalItemsSoldDailyLoading}
            />
            
          </div>

          {/* Sales Records Section.

              Sticky from here down: once the heading reaches the top of the
              window it stays there, along with the action row and the column
              header, and only the rows carry on scrolling underneath. The three
              sit in one container so the column header needs no top offset of
              its own - a number that would differ per page and drift whenever a
              heading or a button changed. */}
          <div>
          <div className="sticky top-0 z-20 bg-background pt-4 pb-[10px] space-y-4">
            <h2 className="text-xl font-semibold">
              Sales Records ({listCountLabel(salesData, selectedRows)})
            </h2>

            {/* Search and Filter */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <SearchField
                  placeholder="Search sales by customer name or ID..."
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
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                  disabled={!permissions["create"]}
                  onClick={() => navigate("/sales/create-invoice")}
                >
                  {permissions["create"] ? <Plus className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  <span>Create Invoice</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                  disabled={selectedRows.length !== 1 || !permissions["edit"]}
                  onClick={handleUpdateClick}
                >
                  {permissions["edit"] ? <Edit className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  <span>View/Update</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                  onClick={() => downloadInvoice(selectedRows[0])}
                  disabled={selectedRows.length !== 1 || !permissions["view"] || isBusy}
                >
                  <Download className="w-4 h-4" />
                  <span>{isDownloading ? "Preparing…" : "Download"}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                  onClick={() => sendOnWhatsApp(selectedRows[0])}
                  disabled={selectedRows.length !== 1 || !permissions["view"] || isBusy}
                >
                  <Send className="w-4 h-4" />
                  <span>{isSending ? "Preparing…" : "Send on WhatsApp"}</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                  onClick={handleDeletion}
                  disabled={deleting || selectedRows.length === 0 || !permissions["delete"]}
                >
                  {deleting ? <Spinner size={16} /> : permissions["delete"] ? <Trash2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  <span>Delete</span>
                </Button>
              </div>
            </div>

            {loading || (salesData && salesData.length > 0) ? (
              <DataTable columns={cols} colsConfig={COLS_CONFIG} headerOnly />
            ) : null}
          </div>

          {loading || (salesData && salesData.length > 0) ? (
            <DataTable
              columns={cols}
              // Must match the header's, or the two grids drift apart and
              // every cell sits under the wrong label.
              colsConfig={COLS_CONFIG}
              data={permissions["view"] ? salesData : null}
              selectedRows={selectedRows}
              onRowClick={toggleRowSelection}
              rowsOnly
              loading={loading}
            />
          ) : null}
          </div>

          <WalkInCustomer {...walkInDialogProps} />

          <CustomFilter
            title="Filter Sales Invoices"
            template={filter_fields_template}
            templateMapper={filter_fields_mapper}
            dataFetcher={fetchSalesInvoices}
            open={filterWindowOpen}
            setOpen={setFilterWindowOpen}
          />
        </main>
      </div>
    </div>
  );
};

export default Sales;
