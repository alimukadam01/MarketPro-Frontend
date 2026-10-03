import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import CustomFilter from "@/components/layout/CustomFilter";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import DataTable from "@/components/ui/data-table";
import { MetricCard } from "@/components/dashboard/MetricCard";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import {
  listCountLabel,
} from "../../services/utils";
import {
  locationsAPIPackage,
  getTotalLocations
} from "../../services/api";
import { useAuth } from "../../services/AuthProvider"
import {
  Eye,
  ArrowLeft,
  Plus,
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
  { key: "address", label: "Address" },
];

// const filter_fields_template = {
//   city__name: ""
// };

// const filter_fields_mapper = {
//   city__name: {
//     label: "City",
//     type: "text",
//     placeholder: "Enter city name",
//   },
// };

const Locations = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [selectedRows, setSelectedRows] = useState([]);
  const [locationsData, setLocationsData] = useState(null);
  // true until the first response lands, so the table never flashes
  // "no records" before it has asked. Cleared in a finally, never on
  // the success path alone, or a failed load shimmers for ever.
  const [loading, setLoading] = useState(true);
  const [totalLocations, setTotalLocations] = useState(null);
  // Its own flag: this counter and the table are separate
  // requests, and one must not speak for the other.
  const [totalLocationsLoading, setTotalLocationsLoading] = useState(true);
  const { token } = useAuth() || null;
  const { getPermissions } = useAuth()
  const permissions = getPermissions("locations")
  const [isDeleted, setIsDeleted] = useState(false);
  //   const [filterWindowOpen, setFilterWindowOpen] = useState(false);
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
          is_deleted = await locationsAPIPackage.bulkDelete(token, selectedRows);
        } else {
          console.log("Deleting single invoice with ID:", selectedRows[0]);
          is_deleted = await locationsAPIPackage.delete(token, selectedRows[0]);
        }

        if (is_deleted) {
          toast.success("Locations deleted successfully.");
          setIsDeleted(!isDeleted);
          setSelectedRows([]);
        } else {
          toast.error("Failed to delete locations.");
        }
      } catch (error) {
        toast.error("Failed to delete locations.");
        console.error(error);
      }
  
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdateClick = () => {
    if (selectedRows.length !== 1) return
    navigate("/locations/update-location", {
      state: { location_id: selectedRows[0] },
    });
  };

  const fetchLocations = async (searchQuery = null) => {
    if (!token) return;

    try {
      const res = await locationsAPIPackage.list(token, searchQuery);
      if (searchQuery) {
        console.log(res)
      }
      if (res) {
        setLocationsData(res);
      } else {
        toast.error("Failed to fetch locations.");
      }
    } catch (error) {
      toast.error("Failed to fetch locations.");
      console.error("Error fetching locations:", error);
    } finally {
        setLoading(false);
    }
  }

  //   const handleFilterClick = (e) => {
  //     e.preventDefault();
  //     setFilterWindowOpen(!filterWindowOpen);
  //   };

  const { searchTerm, setSearchTerm, searching } = useDebouncedSearch(fetchLocations);

  useEffect(() => {

    const fetchTotalLocations = async () => {
      if (!token) return;

      try {
        const res = await getTotalLocations(token);
        if (res!==null) {
          setTotalLocations(res);
        } else {
          toast.error("Failed to fetch total locations.");
        }
      } catch (error) {
        toast.error("Failed to fetch total locations.");
        console.error("Error fetching total locations:", error);
      } finally {
        setTotalLocationsLoading(false);
      }
    }

    fetchTotalLocations()
    fetchLocations()
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
                  <h1 className="text-2xl font-semibold">Locations Overview</h1>
                  <p className="text-sm text-muted-foreground">
                    View and manage locations.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <MetricCard
              title="Total Locations"
              value={totalLocations}
              loading={totalLocationsLoading}
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
              Location Listing ({listCountLabel(locationsData, selectedRows)})
            </h2>

            {/* Search and Filter */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <SearchField
                  placeholder="Search Locations"
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
                  onClick={() => navigate("/locations/create-location")}
                >
                  {permissions["create"] ? <Plus className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  <span>Create Location</span>
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
                  onClick={handleDeletion}
                  disabled={deleting || selectedRows.length === 0 || !permissions["delete"]}
                >
                  {deleting ? <Spinner size={16} /> : permissions["delete"] ? <Trash2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  <span>Delete</span>
                </Button>
              </div>
            </div>

            {loading || (locationsData && locationsData.length > 0) ? (
              <DataTable columns={cols} colsConfig="[48px_512px_1fr]" headerOnly />
            ) : null}
          </div>

          {loading || (locationsData && locationsData.length > 0) ? (
            <DataTable
              columns={cols}
              data={permissions["view"] ? locationsData : null}
              selectedRows={selectedRows}
              onRowClick={toggleRowSelection}
              colsConfig="[48px_512px_1fr]"
              rowsOnly
              loading={loading}
            />
          ) : null}
          </div>

          {/* <CustomFilter
            title="Filter Locations"
            template={filter_fields_template}
            templateMapper={filter_fields_mapper}
            dataFetcher={fetchLocations}
            open={filterWindowOpen}
            setOpen={setFilterWindowOpen}
          /> */}
        </main>
      </div>
    </div>
  );
};

export default Locations;
