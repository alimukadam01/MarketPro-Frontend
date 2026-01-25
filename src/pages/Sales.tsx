import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import CustomFilter from "@/components/layout/CustomFilter";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import DataTable from "@/components/ui/data-table";
import { PDFDownloadLink } from "@react-pdf/renderer";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import {
  getStatusColor,
  getPaymentStatusColor,
  SalesInvoiceStatusMap,
  PaymentStatusMap,
  formatSearchQuery,
} from "../../services/utils";
import { useAuth } from "../../services/AuthProvider"
import {
  getSalesInvoiceList,
  getTotalSalesDaily,
  getTotalItemsSoldDaily,
  getTotalSalesInvoicesDaily,
  bulkDeleteSalesInvoice,
  deleteSalesInvoice,
} from "../../services/api";
import {
  Download,
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
import Invoice from '../pages/Invoice'

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
  const [totalSalesDaily, setTotalSalesDaily] = useState(null);
  const [totalItemsSoldDaily, setTotalItemsSoldDaily] = useState(null);
  const [totalInvoicesDaily, setTotalInvoicesDaily] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { token } = useAuth() || null;
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
      }
    }

    fetchTotalInvoicesDaily()
    fetchTotalItemsSoldDaily()
    fetchTotalSalesDaily()
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
                Total Sales Today
              </div>
              <div className="text-3xl font-bold">PKR {totalSalesDaily}</div>
              {/* <div className="text-sm text-green-600 mt-1">
                +12% from last yesterday
              </div> */}
            </div>
            
            <div className="bg-card rounded-lg p-6 border">
              <div className="text-sm text-muted-foreground mb-2">
                Total Invoices Today
              </div>
              <div className="text-3xl font-bold">{totalInvoicesDaily}</div>
              {/* <div className="text-sm text-green-600 mt-1">
                +12% from last month
              </div> */}
            </div>
            
            <div className="bg-card rounded-lg p-6 border">
              <div className="text-sm text-muted-foreground mb-2">
                Total Items Sold Today
              </div>
              <div className="text-3xl font-bold">{totalItemsSoldDaily}</div>
              {/* <div className="text-sm text-green-600 mt-1">
                +12% from last year
              </div> */}
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
                  <span>View/Update</span>
                </Button>
                <PDFDownloadLink
                  document={<Invoice token = {token} invoice_id = {selectedRows[0]}/>}
                  fileName={`invoice.pdf`}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-2"
                    disabled={selectedRows.length !== 1}
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </Button>
                </PDFDownloadLink>

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
