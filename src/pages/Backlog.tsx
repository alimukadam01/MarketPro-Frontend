import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import DataTable from "@/components/ui/data-table";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import { formatDate, getImageUrl, listCountLabel } from "../../services/utils";
import {
  backlogEntriesAPIPackage,
  toggleBacklogEntryStatus,
} from "../../services/api";
import { useAuth } from "../../services/AuthProvider";
import { SearchField } from "@/components/ui/search-field";
import { useDebouncedSearch } from "@/hooks/use-debounced-search";
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Lock,
  CheckCircle2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";

const cols = [
  { key: "id", label: "ID" },
  {
    key: "type",
    label: "Type",
    render: (val: string) => (
      <span
        className={
          val === "sales_invoice"
            ? "bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium"
            : "bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-medium"
        }
      >
        {val === "sales_invoice" ? "Sales Invoice" : "Purchase Invoice"}
      </span>
    ),
  },
  {
    key: "image",
    label: "Image",
    render: (val: string) => {
      const src = getImageUrl(val);
      return src ? (
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          View Image
        </a>
      ) : (
        <span className="text-muted-foreground text-xs">No image</span>
      );
    },
  },
  { key: "assigned_to_name", label: "Assigned To" },
  {
    key: "is_done",
    label: "Status",
    render: (val: boolean) => (
      <span
        className={
          val
            ? "bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium"
            : "bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-medium"
        }
      >
        {val ? "Done" : "Pending"}
      </span>
    ),
  },
  { key: "created_at_display", label: "Created" },
];

const transformEntry = (entry) => ({
  id: entry.id,
  type: entry.type,
  image: entry.image,
  assigned_to_name: entry.assigned_to?.user?.name || "Unassigned",
  is_done: entry.is_done,
  created_at_display: entry.created_at
    ? formatDate(entry.created_at.split("T")[0])
    : "-",
});

const Backlog = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [selectedRows, setSelectedRows] = useState([]);
  const [backlogData, setBacklogData] = useState(null);
  // true until the first response lands, so the table never flashes
  // "no records" before it has asked. Cleared in a finally, never on
  // the success path alone, or a failed load shimmers for ever.
  const [loading, setLoading] = useState(true);
  const [isDeleted, setIsDeleted] = useState(false);
  const { token, user, getPermissions } = useAuth();
  const permissions = getPermissions("backlog_entries");
  const navigate = useNavigate();

  const isAdmin = user?.role === "admin";

  const toggleRowSelection = (id: string) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const fetchBacklog = async (searchQuery = null) => {
    if (!token) return;
    try {
      const res = await backlogEntriesAPIPackage.list(token, searchQuery);
      if (res) {
        setBacklogData(res.map(transformEntry));
      } else {
        toast.error("Failed to fetch backlog entries.");
      }
    } catch (error) {
      toast.error("Failed to fetch backlog entries.");
      console.log("Error fetching backlog:", error);
    } finally {
        setLoading(false);
    }
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
          is_deleted = await backlogEntriesAPIPackage.bulkDelete(
            token,
            selectedRows,
            "entry"
          );
        } else {
          is_deleted = await backlogEntriesAPIPackage.delete(
            token,
            selectedRows[0]
          );
        }

        if (is_deleted) {
          toast.success("Backlog entries deleted successfully.");
          setIsDeleted(!isDeleted);
          setSelectedRows([]);
        } else {
          toast.error("Failed to delete backlog entries.");
        }
      } catch (error) {
        toast.error("Failed to delete backlog entries.");
        console.log(error);
      }
  
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (selectedRows.length !== 1) return;
    try {
      const success = await toggleBacklogEntryStatus(token, selectedRows[0]);
      if (success) {
        toast.success("Status updated.");
        setSelectedRows([]);
        await fetchBacklog();
      } else {
        toast.error("Failed to update status.");
      }
    } catch (error) {
      toast.error("Failed to update status.");
      console.log(error);
    }
  };

  const handleUpdateClick = () => {
    if (selectedRows.length !== 1) return;
    navigate("/backlog/update-entry", {
      state: { entry_id: selectedRows[0] },
    });
  };

  const { searchTerm, setSearchTerm, searching } = useDebouncedSearch(fetchBacklog);

  useEffect(() => {
    fetchBacklog();
  }, [token, isDeleted]);

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
          <div className="space-y-1">
            <DynamicBreadCrumb />

            <div className="flex items-center space-x-3">
              <ArrowLeft
                className="w-5 h-5 text-muted-foreground cursor-pointer hover:text-primary"
                onClick={() => navigate("/")}
              />
              <div>
                <h1 className="text-2xl font-semibold">Backlog Overview</h1>
                <p className="text-sm text-muted-foreground">
                  View and manage backlog entries.
                </p>
              </div>
            </div>
          </div>

          {/* Sticky from here down: once the heading reaches the top of the
              window it stays there, along with the action row and the column
              header, and only the rows carry on scrolling underneath. The three
              sit in one container so the column header needs no top offset of
              its own - a number that would differ per page and drift whenever a
              heading or a button changed. */}
          <div>
          <div className="sticky top-0 z-20 bg-background pt-4 pb-[10px] space-y-4">
            <h2 className="text-xl font-semibold">
              Backlog Listing ({listCountLabel(backlogData, selectedRows)})
            </h2>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <SearchField
                  placeholder="Search Backlog"
                  value={searchTerm}
                  onChange={setSearchTerm}
                  pending={searching}
                />
              </div>

              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                  disabled={!permissions?.["create"]}
                  onClick={() => navigate("/backlog/create-entry")}
                >
                  {permissions?.["create"] ? (
                    <Plus className="w-4 h-4" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  <span>Create Entry</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                  disabled={selectedRows.length !== 1 || !permissions?.["edit"]}
                  onClick={handleUpdateClick}
                >
                  {permissions?.["edit"] ? (
                    <Edit className="w-4 h-4" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  <span>View/Update</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                  disabled={selectedRows.length !== 1}
                  onClick={handleToggleStatus}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Toggle Status</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                  disabled={deleting || selectedRows.length === 0 || !isAdmin}
                  onClick={handleDeletion}
                >
                  {deleting ? (
                    <Spinner size={16} />
                  ) : isAdmin ? (
                    <Trash2 className="w-4 h-4" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  <span>Delete</span>
                </Button>
              </div>
            </div>

            {loading || (backlogData && backlogData.length > 0) ? (
              <DataTable columns={cols} headerOnly />
            ) : null}
          </div>

          {loading || (backlogData && backlogData.length > 0) ? (
            <DataTable
              columns={cols}
              data={permissions?.["view"] ? backlogData : null}
              selectedRows={selectedRows}
              onRowClick={toggleRowSelection}
              rowsOnly
              loading={loading}
            />
          ) : null}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Backlog;
