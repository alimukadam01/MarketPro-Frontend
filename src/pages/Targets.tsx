import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import TargetProgressCard from "@/components/ui/target-card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { ArrowLeft, BarChart3, ChevronDown, Lock, Plus, Target } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../services/AuthProvider";
import {
  getTargetsDashboard,
  manualDataPointsAPIPackage,
  targetsAPIPackage,
} from "../../services/api";
import { formatDate } from "../../services/utils";

const Targets = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [items, setItems] = useState(null);
  const [openIds, setOpenIds] = useState([]);
  const [isChanged, setIsChanged] = useState(false);
  const { token, getPermissions } = useAuth();
  const permissions = getPermissions("targets");
  const navigate = useNavigate();

  // Targets and data points share one grid, so a card is keyed by both its kind
  // and its id: the two tables number their rows independently.
  const keyOf = (item) => `${item.kind}-${item.id}`;

  const toggleCard = (item) => {
    const key = keyOf(item);
    setOpenIds((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const fetchItems = async () => {
    if (!token) return;
    try {
      const [targets, points] = await Promise.all([
        getTargetsDashboard(token),
        manualDataPointsAPIPackage.list(token),
      ]);

      if (!targets && !points) {
        toast.error("Failed to fetch targets.");
        return;
      }

      const merged = [
        ...(targets || []).map((row) => ({ ...row, kind: "target" })),
        ...(points || []).map((row) => ({
          ...row,
          kind: "point",
          as_of_date: row.as_of_date ? formatDate(row.as_of_date) : "",
          created_at_label: formatDate(row.created_at),
        })),
      ];

      // Newest first across both kinds. Both carry created_at for exactly this.
      merged.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      setItems(merged);
    } catch (error) {
      console.log("Error fetching targets:", error);
      toast.error("Failed to fetch targets.");
    }
  };

  const handleEdit = (item) => {
    navigate("/targets/update-target", { state: { target_id: item.id } });
  };

  const handleDelete = async (item) => {
    try {
      const deleted =
        item.kind === "target"
          ? await targetsAPIPackage.delete(token, item.id)
          : await manualDataPointsAPIPackage.delete(token, item.id);

      if (deleted) {
        toast.success("Deleted successfully.");
        setOpenIds((prev) => prev.filter((k) => k !== keyOf(item)));
        setIsChanged(!isChanged);
      } else {
        toast.error("Failed to delete.");
      }
    } catch (error) {
      console.log("Error deleting:", error);
      toast.error("Failed to delete.");
    }
  };

  useEffect(() => {
    fetchItems();
  }, [token, isChanged]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar onCollapseChange={setSidebarCollapsed} />
      <div
        className={`${sidebarCollapsed ? "ml-16" : "ml-64"} transition-all duration-300 flex flex-col`}
      >
        <Header />

        <main className="flex-1 p-6 space-y-6">
          <div className="space-y-1">
            <DynamicBreadCrumb />

            <div className="flex items-start gap-4">
              <div className="flex items-center space-x-3">
                <ArrowLeft
                  className="w-5 h-5 text-muted-foreground cursor-pointer hover:text-primary"
                  onClick={() => navigate("/")}
                />
                <div>
                  <h1 className="text-2xl font-semibold">Targets</h1>
                  <p className="text-sm text-muted-foreground">
                    Where the business stands against the numbers it is aiming
                    for.
                  </p>
                </div>
              </div>

              <div className="flex-1" />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 flex items-center space-x-2"
                    disabled={!permissions?.["create"]}
                  >
                    {permissions?.["create"] ? (
                      <Plus className="w-4 h-4" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                    <span>Create</span>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem
                    onClick={() => navigate("/targets/create-target")}
                  >
                    <Target className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span>Create Target</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate("/targets/create-data-point")}
                  >
                    <BarChart3 className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span>Create Data Point</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {!permissions?.["view"] ? (
            <div className="bg-card rounded-lg p-6 border">
              <p className="text-sm text-muted-foreground">
                Access not granted. Please contact Admin.
              </p>
            </div>
          ) : items && items.length > 0 ? (
            // Rows are the height of a collapsed card; an expanded card spans
            // two of them, so its neighbours never move. 160 rather than 148:
            // the expanded panel now wraps the outcome and the date-basis line
            // to two lines each and pins the Edit button to the foot, which
            // needs 2 x 160 + 24 = 344px rather than 320.
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 auto-rows-[160px] gap-6">
              {items.map((item) => (
                <TargetProgressCard
                  key={keyOf(item)}
                  item={item}
                  isOpen={openIds.includes(keyOf(item))}
                  onToggle={toggleCard}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  canEdit={!!permissions?.["edit"]}
                  canDelete={!!permissions?.["delete"]}
                />
              ))}
            </div>
          ) : (
            <div className="bg-card rounded-lg p-6 border">
              <p className="text-sm text-muted-foreground">
                Nothing here yet. Create a target to start tracking progress, or
                record a data point to keep an outside figure beside it.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Targets;
