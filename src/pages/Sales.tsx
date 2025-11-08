import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import CustomFilter from "@/components/layout/CustomFilter";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import DataTable from "@/components/ui/data-table";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadcrumb";
import {
  getStatusColor,
  getPaymentStatusColor,
  SalesInvoiceStatusMap,
  PaymentStatusMap,
  formatSearchQuery,
} from "../../services/utils";
import {
  getSalesInvoiceList,
  bulkDeleteSalesInvoice,
  deleteSalesInvoice,
} from "../../services/api";
import {
  Eye,
  ArrowLeft,
  Plus,
  Filter,
  Search,
  Edit,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

//v2 idea: create an endpoint that serves these 2 arrays individually for each customer.

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
  { key: "sub_total", label: "Subtotal" },
  { key: "total", label: "Total" },
];

const filter_fields_template = {
  customer__name: "",
  status: "",
  payment_status: "",
  sub_total: "",
  total: "",
  is_deducted: false,
  is_partially_deducted: false,
};

const filter_fields_mapper = {
  customer__name: {
    label: "Customer Name",
    type: "text",
    placeholder: "Enter customer name",
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
  discount: {
    label: "Discount",
    type: "number",
    placeholder: "Enter Discount (PKR)",
  },
  tax: {
    label: "Tax",
    type: "number",
    placeholder: "Enter Tax (%)",
  },
  is_deducted: {
    label: "Is Deducted",
    type: "checkbox",
  },
  is_partially_deducted: {
    label: "Is Partially Deducted",
    type: "checkbox",
  },
};

const Sales = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [salesData, setSalesData] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const token = localStorage.getItem("market-pro-access-token") || null;
  const [isDeleted, setIsDeleted] = useState(false);
  const [filterWindowOpen, setFilterWindowOpen] = useState(false);
  const navigate = useNavigate();

  const toggleRowSelection = (id: string) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  };

  const handleDeletion = async () => {
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
    }
  };

  const handleFilterClick = (e) => {
    e.preventDefault();
    setFilterWindowOpen(!filterWindowOpen);
  };

  useEffect(() => {
    fetchSalesInvoices();
  }, [token, isDeleted])

  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchTerm.trim() !== "") {
        const query = formatSearchQuery(searchTerm);
        await fetchSalesInvoices(query);
      } else {
        await fetchSalesInvoices();
      }
    }, 400); // wait 400ms after user stops typing

    return () => clearTimeout(delayDebounce);
  }, [searchTerm])

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
            <div className="bg-card rounded-lg p-6 border">
              <div className="text-sm text-muted-foreground mb-2">
                Total Sales
              </div>
              <div className="text-3xl font-bold">PKR 77,650</div>
              <div className="text-sm text-green-600 mt-1">
                +12% from last month
              </div>
            </div>
            <div className="bg-card rounded-lg p-6 border">
              <div className="text-sm text-muted-foreground mb-2">
                Completed
              </div>
              <div className="text-3xl font-bold text-green-600">3</div>
              <div className="text-sm text-muted-foreground mt-1">
                Sales completed
              </div>
            </div>
            <div className="bg-card rounded-lg p-6 border">
              <div className="text-sm text-muted-foreground mb-2">Pending</div>
              <div className="text-3xl font-bold text-yellow-600">1</div>
              <div className="text-sm text-muted-foreground mt-1">
                Awaiting processing
              </div>
            </div>
            <div className="bg-card rounded-lg p-6 border">
              <div className="text-sm text-muted-foreground mb-2">
                Cancelled
              </div>
              <div className="text-3xl font-bold text-red-600">1</div>
              <div className="text-sm text-muted-foreground mt-1">
                Cancelled orders
              </div>
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
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                  disabled={selectedRows.length !== 1}
                  onClick={() => navigate("/sales/view-invoice")}
                >
                  <Eye className="h-4 w-4" />
                  <span>View Invoice</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                  onClick={() => navigate("/sales/create-invoice")}
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Invoice</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                  disabled={selectedRows.length !== 1}
                  onClick={handleUpdateClick}
                >
                  <Edit className="w-4 h-4" />
                  <span>Update</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                  onClick={handleDeletion}
                  disabled={selectedRows.length === 0}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </Button>
              </div>
            </div>

            {/* Sales Table */}
            {/* <div className="space-y-[10px]"> */}
            {/* Table Header */}
            {/* <div className="bg-card rounded-lg border h-[35px] flex items-center px-4">
                <div className="grid grid-cols-11 gap-4 w-full text-sm font-medium text-muted-foreground">
                  <div className="min-w-0">ID</div>
                  <div className="min-w-0">Invoice No</div>
                  <div className="min-w-0">Status</div>
                  <div className="min-w-0">Date Issued</div>
                  <div className="min-w-0">Date Due</div>
                  <div className="min-w-0">Payment Status</div>
                  <div className="min-w-0">Tax</div>
                  <div className="min-w-0">Discount</div>
                  <div className="min-w-0">Total Items</div>
                  <div className="min-w-0">Subtotal</div>
                  <div className="min-w-0">Total</div>
                </div>
              </div> */}

            {/* Table Rows */}
            {/* {salesData.map((sale) => (
                <div
                  key={sale.id}
                  onClick={() => toggleRowSelection(sale.id)}
                  className={`bg-card rounded-lg h-[35px] flex items-center px-4 cursor-pointer transition-colors hover:bg-muted/20 ${selectedRows.includes(sale.id)
                    ? 'border-2 border-[#4285F4]'
                    : 'border border-border'
                    }`}
                >
                  <div className="grid grid-cols-11 gap-4 w-full text-sm">
                    <div className="font-medium min-w-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">{sale.id}</div>
                    <div className="text-muted-foreground min-w-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">{sale.invoice_no}</div>
                    <div className="min-w-0">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(sale.status)}`}>
                        {sale.status}
                      </span>
                    </div>
                    <div className="text-muted-foreground min-w-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">{sale.date_issued}</div>
                    <div className="font-semibold min-w-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">{sale.date_due}</div>
                    <div className="min-w-0">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(sale.payment_status)}`}>
                        {sale.payment_status}
                      </span>
                    </div>
                    <div className="font-semibold min-w-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">{sale.tax}</div>
                    <div className="font-semibold min-w-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">{sale.discount}</div>
                    <div className="font-semibold min-w-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">{sale.total_items}</div>
                    <div className="font-semibold min-w-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">{sale.subtotal}</div>
                    <div className="font-semibold min-w-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">{sale.total}</div>

                  </div>
                </div>
              ))}
            </div>*/}
          </div>

          {salesData && salesData.length > 0 ? (
            <DataTable
              columns={cols}
              data={salesData}
              selectedRows={selectedRows}
              onRowClick={toggleRowSelection}
            />
          ) : null}

          <CustomFilter
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
