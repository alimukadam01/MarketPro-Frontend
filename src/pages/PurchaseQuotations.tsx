import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import CustomFilter from "@/components/layout/CustomFilter";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import DataTable from "@/components/ui/data-table";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import {
  formatSearchQuery,
  transformPurchaseQuotation,
  createIdMap
} from "../../services/utils";
import { useAuth } from "../../services/AuthProvider"
import {
  purchaseQuotationsAPIPackage,
  getTotalPurchaseQuotations
} from "../../services/api";
import {
  ArrowLeft,
  Search,
  Edit,
  Trash2,
  Filter,
  Undo2,
  Plus,
  Lock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

//v2 idea: create an endpoint that serves these 2 arrays individually for each client.

const cols = [
  { key: "id", label: "ID" },
  { key: "quotation_no", label: "Quotation No." },
  { key: "status", label: "Status" },
  { key: "items", label: "Total Items" },
  { key: "created_at", label: "Created At" },
  { key: "notes", label: "Notes" }
];

// const filter_fields_template = {
//   customer: ""
// };

// const filter_fields_mapper = {
//   customer: {
//     label: "Customer",
//     type: "text",
//     placeholder: "Enter customer name",
//   },
// };

const PurchaseQuotations = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [selectedRows, setSelectedRows] = useState([])
  const [purchaseQuotationsData, setPurchaseQuotationsData] = useState(null)
  const [purchaseQuotationsIdMap, setPurchaseQuotationsIdMap] = useState([])
  const [totalPurchaseQuotations, setTotalPurchaseQuotations] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")
  const { token } = useAuth() || null
  const { getPermissions } = useAuth()
  const permissions = getPermissions("quotations")
  const [isDeleted, setIsDeleted] = useState(false)
  const [filterWindowOpen, setFilterWindowOpen] = useState(false)
  const navigate = useNavigate()

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
        is_deleted = await purchaseQuotationsAPIPackage.bulkDelete(token, selectedRows, "purchase_quotation");
      } else {
        console.log("Deleting purchase quotation with ID:", selectedRows[0]);
        is_deleted = await purchaseQuotationsAPIPackage.delete(token, selectedRows[0]);
      }

      if (is_deleted) {
        toast.success("Purchase Quotations deleted successfully.");
        setIsDeleted(!isDeleted);
        setSelectedRows([]);
      } else {
        toast.error("Failed to delete purchase quotations.");
      }
    } catch (error) {
      toast.error("Failed to delete purchase quotations.");
      console.error(error);
    }
  }

  const handleUpdateClick = () => {
    if (selectedRows.length !== 1) return
    navigate("/purchase-quotations/update-purchase-quotation", {
      state: { purchase_quotation_id: selectedRows[0] },
    });
  };

  const fetchPurchaseQuotations = async (searchQuery = null) => {
    if (!token) return;

    try {
      const res = await purchaseQuotationsAPIPackage.list(token, searchQuery);
      if (res) {
        setPurchaseQuotationsData(res.map(transformPurchaseQuotation))
        setPurchaseQuotationsIdMap(createIdMap(res))
      } else {
        toast.error("Failed to fetch purchase quotations.");
      }
    } catch (error) {
      toast.error("Failed to fetch purchase quotations.");
      console.error("Error fetching purchase quotations:", error);
    }
  };

  const handleFilterClick = (e) => {
    e.preventDefault();
    setFilterWindowOpen(!filterWindowOpen);
  }

  useEffect(() => {

    const fetchTotalPurchaseQuotations = async () => {
      if (!token) return;
        
      return 0
    //   try {
    //     const res = await getTotalPurchaseQuotations(token);
    //     if (res!==null) {
    //       setTotalPurchaseQuotations(res);
    //     } else {
    //       toast.error("Failed to fetch total purchase quotations.");
    //     }
    //   } catch (error) {
    //     toast.error("Failed to fetch total purchase quotations.");
    //     console.error("Error fetching total purchase quotations:", error);
    //   }
    }

    fetchTotalPurchaseQuotations()
    fetchPurchaseQuotations();
  }, [token, isDeleted])

  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchTerm.trim() !== "") {
        const query = formatSearchQuery(searchTerm);
        await fetchPurchaseQuotations(query);
      } else {
        await fetchPurchaseQuotations();
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
                  <h1 className="text-2xl font-semibold">Purchase Quotations Overview</h1>
                  <p className="text-sm text-muted-foreground">
                    View and manage purchase quotations.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-card rounded-lg p-6 border">
              <div className="text-sm text-muted-foreground mb-2">
                Total Purchase Quotations
              </div>
              <div className="text-3xl font-bold">{totalPurchaseQuotations}</div>
            </div>
          </div>

          {/* Sales Records Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Purchase Quotation Listing</h2>

            {/* Search and Filter */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search Purchase Quotations"
                    className="pl-10 w-80"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                {/* <Button
                  variant="outline"
                  className="flex items-center space-x-2"
                  onClick={handleFilterClick}
                  type="button"
                >
                  <Filter className="w-4 h-4" />
                  <span>Filter</span>
                </Button> */}
              </div>

              {/* Action Icons */}
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                  disabled={!permissions["create"]}
                  onClick={() => navigate("/purchase-quotations/create-purchase-quotation")}
                >
                  {permissions["create"] ? <Plus className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  <span>Create Purchase Quotation</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                  disabled={selectedRows.length !== 1 || !permissions["edit"]}
                  onClick={handleUpdateClick}
                >
                  {permissions["edit"] ? <Edit className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  <span>View/Update Item</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                  onClick={handleDeletion}
                  disabled={selectedRows.length === 0 || !permissions["delete"]}
                >
                  {permissions["delete"] ? <Trash2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  <span>Delete</span>
                </Button>
              </div>
            </div>
          </div>

          {purchaseQuotationsData && purchaseQuotationsData.length > 0 ? (
            <DataTable
              columns={cols}
              data={permissions["view"] ? purchaseQuotationsData : null}
              selectedRows={selectedRows}
              onRowClick={toggleRowSelection}
              colsConfig={"[48px_1fr_1fr_1fr_1fr_512px]"}
            />
          ) : null}

          {/* <CustomFilter
            template={filter_fields_template}
            templateMapper={filter_fields_mapper}
            dataFetcher={fetchPurchaseQuotations}
            open={filterWindowOpen}
            setOpen={setFilterWindowOpen}
          /> */}
        </main>
      </div>
    </div>
  );
};

export default PurchaseQuotations;
