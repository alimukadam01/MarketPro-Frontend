import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import CustomFilter from "@/components/layout/CustomFilter";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import DataTable from "@/components/ui/data-table";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import {
  formatSearchQuery,
  transformProject,
  createIdMap,
  listCountLabel,
} from "../../services/utils";
import { useAuth } from "../../services/AuthProvider"
import {
  projectsAPIPackage
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
  { key: "name", label: "Name" },
  { key: "customer", label: "Customer" },
  { key: "status", label: "Status" },
  { key: "purchase_invoices", label: "Purchase Invoices" },
  { key: "sales_invoices", label: "Sales Invoices" },
  { key: "tasks", label: "Tasks" },
];

const filter_fields_template = {
  customer: ""
};

const filter_fields_mapper = {
  customer: {
    label: "Customer",
    type: "text",
    placeholder: "Enter customer name",
  },
};

const Projects = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [selectedRows, setSelectedRows] = useState([])
  const [projectsData, setProjectsData] = useState(null)
  // true until the first response lands, so the table never flashes
  // "no records" before it has asked. Cleared in a finally, never on
  // the success path alone, or a failed load shimmers for ever.
  const [loading, setLoading] = useState(true);
  const [projectsIdMap, setProjectsIdMap] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const { token } = useAuth() || null
  const { getPermissions } = useAuth()
  const permissions = getPermissions("projects")
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
        is_deleted = await projectsAPIPackage.bulkDelete(token, selectedRows);
      } else {
        console.log("Deleting project with ID:", selectedRows[0]);
        is_deleted = await projectsAPIPackage.delete(token, selectedRows[0]);
      }

      if (is_deleted) {
        toast.success("Projects deleted successfully.");
        setIsDeleted(!isDeleted);
        setSelectedRows([]);
      } else {
        toast.error("Failed to delete projects.");
      }
    } catch (error) {
      toast.error("Failed to delete projects.");
      console.error(error);
    }
  }

  const handleUpdateClick = () => {
    if (selectedRows.length !== 1) return
    navigate("/projects/view-project", {
      state: { project_id: selectedRows[0] },
    });
  };

  const fetchProjects = async (searchQuery = null) => {
    if (!token) return;

    try {
      const res = await projectsAPIPackage.list(token, searchQuery);
      if (searchQuery){
        console.log(res)
      }
      if (res) {
        setProjectsData(res.map(transformProject))
        setProjectsIdMap(createIdMap(res))
      } else {
        toast.error("Failed to fetch projects.");
      }
    } catch (error) {
      toast.error("Failed to fetch projects.");
      console.error("Error fetching projects:", error);
    } finally {
        setLoading(false);
    }
  };

  const handleFilterClick = (e) => {
    e.preventDefault();
    setFilterWindowOpen(!filterWindowOpen);
  };

  useEffect(() => {

    fetchProjects();
  }, [token, isDeleted])

  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchTerm.trim() !== "") {
        const query = formatSearchQuery(searchTerm);
        await fetchProjects(query);
      } else {
        await fetchProjects();
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
                  <h1 className="text-2xl font-semibold">Projects Overview</h1>
                  <p className="text-sm text-muted-foreground">
                    View and manage projects.
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
              Project Listing ({listCountLabel(projectsData, selectedRows)})
            </h2>

            {/* Search and Filter */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search Projects"
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
                  disabled={!permissions["create"]}
                  onClick={() => navigate("/projects/create-project")}
                >
                  {permissions["create"] ? <Plus className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  <span>Create Project</span>
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

            {loading || (projectsData && projectsData.length > 0) ? (
              <DataTable columns={cols} headerOnly />
            ) : null}
          </div>

          {loading || (projectsData && projectsData.length > 0) ? (
            <DataTable
              columns={cols}
              data={permissions["view"] ? projectsData : null}
              selectedRows={selectedRows}
              onRowClick={toggleRowSelection}
              rowsOnly
              loading={loading}
            />
          ) : null}
          </div>

          <CustomFilter
            title="Filter Projects"
            template={filter_fields_template}
            templateMapper={filter_fields_mapper}
            dataFetcher={fetchProjects}
            open={filterWindowOpen}
            setOpen={setFilterWindowOpen}
          />
        </main>
      </div>
    </div>
  );
};

export default Projects;
