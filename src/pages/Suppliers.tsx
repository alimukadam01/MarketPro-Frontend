
// Create a mapper fucntion that maps Supplier.city to string value to parse into a string.

import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import CustomFilter from "@/components/layout/CustomFilter";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import DataTable from "@/components/ui/data-table";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadcrumb";
import {
  formatSearchQuery,
} from "../../services/utils";
import {
  getSuppliersList,
  bulkDeleteSuppliers,
  deleteSupplier,
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

//v2 idea: create an endpoint that serves these 2 arrays individually for each client.

const cols = [
  { key: "id", label: "ID" },
  { key: "name", label: "Name" },
  { key: "business_name", label: "Business" },
  { key: "phone", label: "Contact No." },
  { key: "email", label: "Email" },
];

// const filter_fields_template = {
//   unit__name: ""
// };

// const filter_fields_mapper = {
//   unit__name: {
//     label: "Unit",
//     type: "text",
//     placeholder: "Enter unit",
//   },
// };

const Suppliers = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [suppliersData, setSuppliersData] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const token = localStorage.getItem("market-pro-access-token") || null;
  const [isDeleted, setIsDeleted] = useState(false);
//   const [filterWindowOpen, setFilterWindowOpen] = useState(false);
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
        is_deleted = await bulkDeleteSuppliers(token, selectedRows);
      } else {
        console.log("Deleting single invoice with ID:", selectedRows[0]);
        is_deleted = await deleteSupplier(token, selectedRows[0]);
      }

      if (is_deleted) {
        toast.success("Suppliers deleted successfully.");
        setIsDeleted(!isDeleted);
        setSelectedRows([]);
      } else {
        toast.error("Failed to delete suppliers.");
      }
    } catch (error) {
      toast.error("Failed to delete suppliers.");
      console.error(error);
    }
  };

  const handleUpdateClick = () => {
    if (selectedRows.length !== 1) return
    navigate("/suppliers/update-supplier", {
      state: { supplier_id: selectedRows[0] },
    });
  };

  const fetchSuppliers = async (searchQuery = null) => {
    if (!token) return;

    try {
      const res = await getSuppliersList(token, searchQuery);
      if (res) {
        setSuppliersData(res);
      } else {
        toast.error("Failed to fetch suppliers.");
      }
    } catch (error) {
      toast.error("Failed to fetch suppliers.");
      console.error("Error fetching suppliers:", error);
    }
  };

//   const handleFilterClick = (e) => {
//     e.preventDefault();
//     setFilterWindowOpen(!filterWindowOpen);
//   };

  useEffect(() => {
    fetchSuppliers();
  }, [token, isDeleted])

  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchTerm.trim() !== "") {
        const query = formatSearchQuery(searchTerm);
        await fetchSuppliers(query);
      } else {
        await fetchSuppliers();
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
                  <h1 className="text-2xl font-semibold">Suppliers Overview</h1>
                  <p className="text-sm text-muted-foreground">
                    View and manage suppliers.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-card rounded-lg p-6 border">
              <div className="text-sm text-muted-foreground mb-2">
                Total Suppliers
              </div>
              <div className="text-3xl font-bold">PKR 7,000</div>
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
            <h2 className="text-xl font-semibold">Supplier Listing</h2>

            {/* Search and Filter */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search supplier by name, ID or Unit."
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
                  disabled={selectedRows.length !== 1}
                  onClick={() => navigate("/suppliers/view-supplier")}
                >
                  <Eye className="h-4 w-4" />
                  <span>View Supplier</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                  onClick={() => navigate("/suppliers/create-supplier")}
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Supplier</span>
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
          </div>

          {suppliersData && suppliersData.length > 0 ? (
            <DataTable
              columns={cols}
              data={suppliersData}
              selectedRows={selectedRows}
              onRowClick={toggleRowSelection}
            />
          ) : null}

          {/* <CustomFilter
            template={filter_fields_template}
            templateMapper={filter_fields_mapper}
            dataFetcher={fetchSuppliers}
            open={filterWindowOpen}
            setOpen={setFilterWindowOpen}
          /> */}
        </main>
      </div>
    </div>
  );
};

export default Suppliers;
