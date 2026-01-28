import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import CustomFilter from "@/components/layout/CustomFilter";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import DataTable from "@/components/ui/data-table";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import {
  formatSearchQuery,
  transformReturnedItem
} from "../../services/utils";
import { useAuth } from "../../services/AuthProvider"
import {
  returnedItemsAPIPackage,
  getTotalReturnedItems
} from "../../services/api";
import {
  Eye,
  ArrowLeft,
  Plus,
  Search,
  Edit,
  Trash2,
  Filter
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

//v2 idea: create an endpoint that serves these 2 arrays individually for each client.

const cols = [
  { key: "id", label: "ID" },
  { key: "sales_invoice", label: "Sales Invoice ID" },
  { key: "product", label: "Product" },
  { key: "invoice_date", label: "Invoice Dated At" },
  { key: "returned_at", label: "Returned At" },
];

const filter_fields_template = {
  invoice_item__sales_invoice__id: "",
  invoice_item__product__name: ""
};

const filter_fields_mapper = {
  invoice_item__sales_invoice__id: {
    label: "Sales Invoice ID",
    type: "number",
    placeholder: "Enter invoice id",
  },
  invoice_item__product__name: {
    label: "Product",
    type: "text",
    placeholder: "Enter product name",
  },
};

const ReturnedItems = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [returnedItemsData, setReturnedItemsData] = useState(null);
  const [totalReturnedItems, setTotalReturnedItems] = useState(0);
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
        is_deleted = await returnedItemsAPIPackage.bulkDelete(token, selectedRows, "returned_items");
      } else {
        console.log("Deleting single invoice with ID:", selectedRows[0]);
        is_deleted = await returnedItemsAPIPackage.delete(token, selectedRows[0]);
      }

      if (is_deleted) {
        toast.success("Returned Items deleted successfully.");
        setIsDeleted(!isDeleted);
        setSelectedRows([]);
      } else {
        toast.error("Failed to delete returned items.");
      }
    } catch (error) {
      toast.error("Failed to delete returned items.");
      console.error(error);
    }
  };

  const handleUpdateClick = () => {
    if (selectedRows.length !== 1) return
    navigate("/returned-items/update-returned-item", {
      state: { returned_item_id: selectedRows[0] },
    });
  };

  const fetchReturnedItems = async (searchQuery = null) => {
    if (!token) return;

    try {
      const res = await returnedItemsAPIPackage.list(token, searchQuery);
      if (searchQuery){
        console.log(res)
      }
      if (res) {
        setReturnedItemsData(res.map(transformReturnedItem));
      } else {
        toast.error("Failed to fetch returned items.");
      }
    } catch (error) {
      toast.error("Failed to fetch returned items.");
      console.error("Error fetching returned items:", error);
    }
  };

  const handleFilterClick = (e) => {
    e.preventDefault();
    setFilterWindowOpen(!filterWindowOpen);
  };

  useEffect(() => {

    const fetchTotalReturnedItems = async () => {
      if (!token) return;

      try {
        const res = await getTotalReturnedItems(token);
        if (res!==null) {
          setTotalReturnedItems(res);
        } else {
          toast.error("Failed to fetch total returned items.");
        }
      } catch (error) {
        toast.error("Failed to fetch total returned items.");
        console.error("Error fetching total returned items:", error);
      }
    }

    fetchTotalReturnedItems()
    fetchReturnedItems();
  }, [token, isDeleted])

  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchTerm.trim() !== "") {
        const query = formatSearchQuery(searchTerm);
        await fetchReturnedItems(query);
      } else {
        await fetchReturnedItems();
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
                  <h1 className="text-2xl font-semibold">Returned Items Overview</h1>
                  <p className="text-sm text-muted-foreground">
                    View and manage returned items.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-card rounded-lg p-6 border">
              <div className="text-sm text-muted-foreground mb-2">
                Total Returned Items
              </div>
              <div className="text-3xl font-bold">{totalReturnedItems}</div>
            </div>
          </div>

          {/* Sales Records Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Returned Item Listing</h2>

            {/* Search and Filter */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search returned item by name, ID or Unit."
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
                  onClick={handleUpdateClick}
                >
                  <Edit className="w-4 h-4" />
                  <span>View/Update Item</span>
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
          </div>

          {returnedItemsData && returnedItemsData.length > 0 ? (
            <DataTable
              columns={cols}
              data={returnedItemsData}
              selectedRows={selectedRows}
              onRowClick={toggleRowSelection}
            />
          ) : null}

          <CustomFilter
            template={filter_fields_template}
            templateMapper={filter_fields_mapper}
            dataFetcher={fetchReturnedItems}
            open={filterWindowOpen}
            setOpen={setFilterWindowOpen}
          />
        </main>
      </div>
    </div>
  );
};

export default ReturnedItems;
