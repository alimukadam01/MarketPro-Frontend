
// Create a mapper fucntion that maps customer.city to string value to parse into a string.

import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import CustomFilter from "@/components/layout/CustomFilter";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import DataTable from "@/components/ui/data-table";
import { MetricCard } from "@/components/dashboard/MetricCard";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import {
  transformCustomer,
  listCountLabel,
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
  Edit,
  Trash2,
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
  // true until the first response lands, so the table never flashes
  // "no records" before it has asked. Cleared in a finally, never on
  // the success path alone, or a failed load shimmers for ever.
  const [loading, setLoading] = useState(true);
  const [totalCustomers, setTotalCustomers] = useState(null);
  // Its own flag: this counter and the table are separate
  // requests, and one must not speak for the other.
  const [totalCustomersLoading, setTotalCustomersLoading] = useState(true);
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
  
    } finally {
      setDeleting(false);
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
    } finally {
        setLoading(false);
    }
  }

  const handleFilterClick = (e) => {
    e.preventDefault();
    setFilterWindowOpen(!filterWindowOpen);
  };

  const { searchTerm, setSearchTerm, searching } = useDebouncedSearch(fetchCustomers);

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
      } finally {
        setTotalCustomersLoading(false);
      }
    }

    fetchTotalCustomers()
    fetchCustomers();
  }, [token, isDeleted])


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
            <MetricCard
              title="Total Customers"
              value={totalCustomers}
              loading={totalCustomersLoading}
            />
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
              Customer Listing ({listCountLabel(customersData, selectedRows)})
            </h2>

            {/* Search and Filter */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <SearchField
                  placeholder="Search Customers"
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
                  disabled={deleting || selectedRows.length === 0 || !permissions['delete']}
                >
                  {deleting ? <Spinner size={16} /> : permissions['delete'] ? <Trash2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  <span>Delete</span>
                </Button>
              </div>
            </div>

            {loading || (customersData && customersData.length > 0) ? (
              <DataTable columns={cols} headerOnly />
            ) : null}
          </div>

          {loading || (customersData && customersData.length > 0) ? (
            <DataTable
              columns={cols}
              data={permissions["view"]? customersData: null}
              selectedRows={selectedRows}
              onRowClick={toggleRowSelection}
              rowsOnly
              loading={loading}
            />
          ) : null}
          </div>

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
