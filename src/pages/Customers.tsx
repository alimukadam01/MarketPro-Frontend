
// Create a mapper fucntion that maps customer.city to string value to parse into a string.

import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import CustomFilter from "@/components/layout/CustomFilter";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import DataTable from "@/components/ui/data-table";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import {
  formatSearchQuery,
  transformCustomer
} from "../../services/utils";
import {
  getCustomersList,
  bulkDeleteCustomers,
  deleteCustomer,
  getTotalCustomers
} from "../../services/api";
import { useAuth } from "../../services/AuthProvider"
import {
  ArrowLeft,
  Plus,
  Filter,
  Search,
  Edit,
  Trash2,
  Lock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

//v2 idea: create an endpoint that serves these 2 arrays individually for each client.

const cols = [
  { key: "id", label: "ID" },
  { key: "name", label: "Name" },
  { key: "phone", label: "Contact No." },
  { key: "email", label: "Email" },
  { key: "city", label: "City" },
];

const filter_fields_template = {
  city__name: ""
};

const filter_fields_mapper = {
  city__name: {
    label: "City",
    type: "text",
    placeholder: "Enter city name",
  },
};

const Customers = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [selectedRows, setSelectedRows] = useState([]);
  const [customersData, setCustomersData] = useState(null);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const { token } = useAuth() || null;
  const { getPermissions } = useAuth()
  const permissions = getPermissions("customers")
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
        is_deleted = await bulkDeleteCustomers(token, selectedRows);
      } else {
        console.log("Deleting single invoice with ID:", selectedRows[0]);
        is_deleted = await deleteCustomer(token, selectedRows[0]);
      }

      if (is_deleted) {
        toast.success("Customers deleted successfully.");
        setIsDeleted(!isDeleted);
        setSelectedRows([]);
      } else {
        toast.error("Failed to delete customers.");
      }
    } catch (error) {
      toast.error("Failed to delete customers.");
      console.error(error);
    }
  };

  const handleViewClick = () => {
    if (selectedRows.length !== 1) return
    navigate("/customers/view-customer", {
      state: { customer_id: selectedRows[0] },
    });
  };

  const fetchCustomers = async (searchQuery = null) => {
    if (!token) return;

    try {
      const res = await getCustomersList(token, searchQuery, true);
      if (res) {
        setCustomersData(res.map(transformCustomer));
      } else {
        toast.error("Failed to fetch customers.");
      }
    } catch (error) {
      toast.error("Failed to fetch customers.");
      console.error("Error fetching customers:", error);
    }
  }

  const handleFilterClick = (e) => {
    e.preventDefault();
    setFilterWindowOpen(!filterWindowOpen);
  };

  useEffect(() => {

    const fetchTotalCustomers = async () => {
      if (!token) return;

      try {
        const res = await getTotalCustomers(token);
        if (res!==null) {
          setTotalCustomers(res);
        } else {
          toast.error("Failed to fetch total customers.");
        }
      } catch (error) {
        toast.error("Failed to fetch total customers.");
        console.error("Error fetching total customers:", error);
      }
    }

    fetchTotalCustomers()
    fetchCustomers();
  }, [token, isDeleted])

  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchTerm.trim() !== "") {
        const query = formatSearchQuery(searchTerm);
        await fetchCustomers(query);
      } else {
        await fetchCustomers();
      }
    }, 400); // wait 400ms after user stops typing

    return () => clearTimeout(delayDebounce);
  }, [searchTerm])

  return (
    <div className="min-h-screen bg-background">
      <Sidebar onCollapseChange={setSidebarCollapsed} />

      <div
        className={`${sidebarCollapsed ? "ml-16" : "ml-64"
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
                  <h1 className="text-2xl font-semibold">Customers Overview</h1>
                  <p className="text-sm text-muted-foreground">
                    View and manage customers.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-card rounded-lg p-6 border">
              <div className="text-sm text-muted-foreground mb-2">
                Total Customers
              </div>
              <div className="text-3xl font-bold">{ totalCustomers }</div>
            </div>
          </div>

          {/* Sales Records Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Customer Listing</h2>

            {/* Search and Filter */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search Customers"
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
                  disabled={
                    !permissions["create"] 
                  }
                  onClick={() => navigate("/customers/create-customer")}
                >
                  {permissions["create"] == true? <Plus className="w-4 h-4" />: <Lock className="w-4 h-4"/>}
                  <span>Create Customer</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                  disabled={selectedRows.length !== 1 || !permissions["view"]}
                  onClick={handleViewClick}
                >
                  {permissions["view"]? <Edit className="w-4 h-4" />: <Lock className="w-4 h-4" />}
                  <span>View Customer</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                  onClick={handleDeletion}
                  disabled={selectedRows.length === 0 || !permissions['delete']}
                >
                  {permissions['delete']? <Trash2 className="w-4 h-4" />: <Lock className="w-4 h-4" />}
                  <span>Delete</span>
                </Button>
              </div>
            </div>
          </div>

          {customersData && customersData.length > 0 ? (
            <DataTable
              columns={cols}
              data={permissions["view"]? customersData: null}
              selectedRows={selectedRows}
              onRowClick={toggleRowSelection}
            />
          ) : null}

          <CustomFilter
            title="Filter Customers"
            template={filter_fields_template}
            templateMapper={filter_fields_mapper}
            dataFetcher={fetchCustomers}
            open={filterWindowOpen}
            setOpen={setFilterWindowOpen}
          />
        </main>
      </div>
    </div>
  );
};

export default Customers;
