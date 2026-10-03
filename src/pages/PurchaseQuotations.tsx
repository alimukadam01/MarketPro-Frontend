import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import CustomFilter from "@/components/layout/CustomFilter";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import DataTable from "@/components/ui/data-table";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import {
  transformPurchaseQuotation,
  createIdMap,
  listCountLabel,
} from "../../services/utils";
import { useAuth } from "../../services/AuthProvider"
import {
  purchaseQuotationsAPIPackage
} from "../../services/api";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Filter,
  Undo2,
  Plus,
  Lock,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";
import { SearchField } from "@/components/ui/search-field";
import { useDebouncedSearch } from "@/hooks/use-debounced-search";

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
  // true until the first response lands, so the table never flashes
  // "no records" before it has asked. Cleared in a finally, never on
  // the success path alone, or a failed load shimmers for ever.
  const [loading, setLoading] = useState(true);
  const [purchaseQuotationsIdMap, setPurchaseQuotationsIdMap] = useState([])
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
  
    } finally {
      setDeleting(false);
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
    } finally {
        setLoading(false);
    }
  };

  const handleFilterClick = (e) => {
    e.preventDefault();
    setFilterWindowOpen(!filterWindowOpen);
  }

  const { searchTerm, setSearchTerm, searching } = useDebouncedSearch(fetchPurchaseQuotations);

  useEffect(() => {

    fetchPurchaseQuotations();
  }, [token, isDeleted])


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

          {/* Sales Records Section */}
          {/* Sticky from here down: once the heading reaches the top of the
              window it stays there, along with the action row and the column
              header, and only the rows carry on scrolling underneath. The three
              sit in one container so the column header needs no top offset of
              its own - a number that would differ per page and drift whenever a
              heading or a button changed. */}
          <div>
          <div className="sticky top-0 z-20 bg-background pt-4 pb-[10px] space-y-4">
            <h2 className="text-xl font-semibold">
              Purchase Quotation Listing ({listCountLabel(purchaseQuotationsData, selectedRows)})
            </h2>

            {/* Search and Filter */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <SearchField
                  placeholder="Search Purchase Quotations"
                  value={searchTerm}
                  onChange={setSearchTerm}
                  pending={searching}
                />
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
                  disabled={deleting || selectedRows.length === 0 || !permissions["delete"]}
                >
                  {deleting ? <Spinner size={16} /> : permissions["delete"] ? <Trash2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  <span>Delete</span>
                </Button>
              </div>
            </div>

            {loading || (purchaseQuotationsData && purchaseQuotationsData.length > 0) ? (
              <DataTable columns={cols} colsConfig={"[48px_1fr_1fr_1fr_1fr_512px]"} headerOnly />
            ) : null}
          </div>

          {loading || (purchaseQuotationsData && purchaseQuotationsData.length > 0) ? (
            <DataTable
              columns={cols}
              data={permissions["view"] ? purchaseQuotationsData : null}
              selectedRows={selectedRows}
              onRowClick={toggleRowSelection}
              colsConfig={"[48px_1fr_1fr_1fr_1fr_512px]"}
              rowsOnly
              loading={loading}
            />
          ) : null}
          </div>

          {/* <CustomFilter
            title="Filter Purchase Quotations"
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
