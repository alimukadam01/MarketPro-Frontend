import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Edit, Filter, Info, Lock, Plus, Trash2 } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import CustomFilter from "@/components/layout/CustomFilter";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Button } from "@/components/ui/button";
import DataTable from "@/components/ui/data-table";
import { SearchField } from "@/components/ui/search-field";
import { Spinner } from "@/components/ui/spinner";
import PersonDeleteDialog from "@/components/ui/person-delete-dialog";
import MergePeopleDialog from "@/components/ui/merge-people-dialog";
import { cn } from "@/lib/utils";
import { useDebouncedSearch } from "@/hooks/use-debounced-search";
import { useAuth } from "../../services/AuthProvider";
import {
  bulkDeletePeople,
  getPeopleDuplicates,
  getPeopleList,
} from "../../services/api";
import {
  formatCurrency,
  formatDate,
  listCountLabel,
  personNetLabel,
  personRolesLabel,
} from "../../services/utils";

/**
 * People: one record per person or firm, with the roles they play - customer,
 * supplier, either, both or neither - and both sides of their khaata
 * (register #13, #15, #19, #28). Replaces the separate Customers and
 * Suppliers screens.
 */

const cols = [
  { key: "id", label: "ID" },
  { key: "name", label: "Name" },
  { key: "phone", label: "Phone", render: (value) => value || "-" },
  { key: "roles", label: "Roles", render: (_, row) => personRolesLabel(row.roles) },
  { key: "receivable", label: "Receivable", render: (value) => (value ? formatCurrency(value) : "-") },
  { key: "payable", label: "Payable", render: (value) => (value ? formatCurrency(value) : "-") },
  { key: "net", label: "Net", render: (_, row) => personNetLabel(row) },
  { key: "last_activity", label: "Last activity", render: (value) => (value ? formatDate(value) : "-") },
];

const ROLE_TABS = [
  { key: "", label: "All" },
  { key: "customer", label: "Customers" },
  { key: "supplier", label: "Suppliers" },
];

// The standard filter panel (CustomFilter): the side a balance is on, and,
// with a role tab picked, whether that role is active.
const filter_fields_template = { side: "", active: "" };
const filter_fields_mapper = {
  side: {
    label: "Balance",
    type: "select",
    options: [
      { value: "receivable", label: "Receivable" },
      { value: "payable", label: "Payable" },
      { value: "both", label: "On both sides" },
    ],
  },
  active: {
    label: "Role status (with a role tab picked)",
    type: "select",
    options: [
      { value: "true", label: "Active" },
      { value: "false", label: "Inactive" },
    ],
  },
};

const People = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [selectedRows, setSelectedRows] = useState([]);
  const [people, setPeople] = useState(null);
  const [everyone, setEveryone] = useState(null);
  const [loading, setLoading] = useState(true);
  const [everyoneLoading, setEveryoneLoading] = useState(true);
  const [role, setRole] = useState("");
  const [filterQuery, setFilterQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState(0);
  const [duplicates, setDuplicates] = useState([]);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const { token, getPermissions } = useAuth();
  const permissions = getPermissions("people");
  const navigate = useNavigate();

  const toggleRowSelection = (id) => {
    setSelectedRows((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  };

  const fetchPeople = async (search = searchTerm, query = filterQuery, roleKey = role) => {
    if (!token) return;
    try {
      const params = Object.fromEntries(new URLSearchParams(query || ""));
      const res = await getPeopleList(token, { ...params, role: roleKey, search: search?.trim() });
      if (res) {
        setPeople(res);
      } else {
        toast.error("Failed to fetch people.");
      }
    } catch (error) {
      console.log("Error fetching people:", error);
      toast.error("Failed to fetch people.");
    } finally {
      setLoading(false);
    }
  };

  const { searchTerm, setSearchTerm, searching } = useDebouncedSearch((query) =>
    fetchPeople(query ? new URLSearchParams(query.replace(/^\?/, "")).get("search") || "" : "")
  );

  // Everyone, unfiltered: the cards and the tab counts describe the whole
  // list, not the slice on screen.
  useEffect(() => {
    const fetchEveryone = async () => {
      if (!token) return;
      try {
        const res = await getPeopleList(token);
        if (res) {
          setEveryone(res);
        } else {
          toast.error("Failed to fetch people.");
        }
      } catch (error) {
        console.log("Error fetching people:", error);
        toast.error("Failed to fetch people.");
      } finally {
        setEveryoneLoading(false);
      }
    };
    const fetchDuplicates = async () => {
      if (!token) return;
      try {
        const res = await getPeopleDuplicates(token);
        if (res) setDuplicates(res);
      } catch (error) {
        console.log("Error fetching duplicates:", error);
      }
    };
    fetchEveryone();
    fetchDuplicates();
  }, [token, refresh]);

  useEffect(() => {
    fetchPeople();
  }, [token, role, refresh]);

  const metrics = useMemo(() => {
    const rows = everyone || [];
    const has = (row, kind) => !!row.roles?.[kind];
    return {
      total: rows.length,
      customers: rows.filter((r) => has(r, "customer")).length,
      suppliers: rows.filter((r) => has(r, "supplier")).length,
      neither: rows.filter((r) => !has(r, "customer") && !has(r, "supplier")).length,
      receivable: rows.reduce((sum, r) => sum + (r.receivable || 0), 0),
      payable: rows.reduce((sum, r) => sum + (r.payable || 0), 0),
      both: rows.filter((r) => r.receivable > 0 && r.payable > 0).length,
    };
  }, [everyone]);

  const tabCount = (key) =>
    key === "" ? metrics.total : key === "customer" ? metrics.customers : metrics.suppliers;

  const selectedPerson =
    selectedRows.length === 1 ? (people || []).find((p) => p.id === selectedRows[0]) : null;

  const onChanged = () => {
    setSelectedRows([]);
    setRefresh((n) => n + 1);
  };

  // One person: the full preview and the typed name. Several: only people
  // with nothing on record can go together; the server names anyone else.
  const handleDeletion = async () => {
    if (selectedRows.length === 1) {
      setDeleteOpen(true);
      return;
    }
    setDeleting(true);
    try {
      const res = await bulkDeletePeople(token, selectedRows);
      if (res.ok) {
        toast.success("People deleted.");
        onChanged();
      } else if (res.error) {
        toast.error(res.error);
      }
    } catch (error) {
      console.log("Error deleting people:", error);
      toast.error("Failed to delete.");
    } finally {
      setDeleting(false);
    }
  };

  const viewPerson = () => {
    if (selectedRows.length !== 1) return;
    navigate("/people/view-person", { state: { person_id: selectedRows[0] } });
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar onCollapseChange={setSidebarCollapsed} />
      <div className={`${sidebarCollapsed ? "ml-16" : "ml-64"} transition-all duration-300 flex flex-col`}>
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
                <h1 className="text-2xl font-semibold">People Overview</h1>
                <p className="text-sm text-muted-foreground">
                  Everyone you buy from, sell to, lend to or borrow from.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <MetricCard
              title="Total People"
              value={metrics.total}
              hint={`${metrics.customers} customers · ${metrics.suppliers} suppliers · ${metrics.neither} with neither`}
              loading={everyoneLoading}
              error={!everyoneLoading && everyone == null}
            />
            <MetricCard
              title="Receivable"
              value={formatCurrency(metrics.receivable)}
              hint="Sales and loans you gave · as of today"
              loading={everyoneLoading}
              error={!everyoneLoading && everyone == null}
            />
            <MetricCard
              title="Payable"
              value={formatCurrency(metrics.payable)}
              hint="Purchases and loans you took · as of today"
              loading={everyoneLoading}
              error={!everyoneLoading && everyone == null}
            />
            <MetricCard
              title="On Both Sides"
              value={metrics.both}
              hint="Both receivable and payable · a set-off can clear one side"
              loading={everyoneLoading}
              error={!everyoneLoading && everyone == null}
            />
          </div>

          {duplicates.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              <Info className="h-4 w-4 shrink-0" />
              <span className="flex-1">
                {duplicates.length === 1
                  ? "1 group of people shares a phone number and may be the same person."
                  : `${duplicates.length} groups of people share a phone number and may be the same person.`}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="bg-white"
                disabled={!permissions?.["delete"]}
                onClick={() => setMergeOpen(true)}
              >
                Review
              </Button>
            </div>
          )}

          <div>
            <div className="sticky top-0 z-20 bg-background pt-4 pb-[10px] space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <h2 className="text-xl font-semibold">
                  People Listing ({listCountLabel(people, selectedRows)})
                </h2>
                <div role="group" aria-label="Role" className="inline-flex gap-1 rounded-lg bg-muted p-1">
                  {ROLE_TABS.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      aria-pressed={role === tab.key}
                      onClick={() => {
                        setSelectedRows([]);
                        setRole(tab.key);
                      }}
                      className={cn(
                        "h-8 rounded-md px-3 text-sm font-medium",
                        role === tab.key ? "bg-background shadow-sm" : "text-muted-foreground",
                      )}
                    >
                      {tab.label} <span className="tabular-nums opacity-80">{tabCount(tab.key)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <SearchField
                    placeholder="Search People"
                    value={searchTerm}
                    onChange={setSearchTerm}
                    pending={searching}
                  />
                  <Button variant="outline" onClick={() => setFilterOpen(true)}>
                    <Filter className="w-4 h-4 mr-2" />
                    <span>Filter{activeFilters ? ` · ${activeFilters}` : ""}</span>
                  </Button>
                </div>

                <div className="flex items-center space-x-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-2"
                    disabled={!permissions?.["create"]}
                    onClick={() => navigate("/people/create-person")}
                  >
                    {permissions?.["create"] ? <Plus className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    <span>Create Person</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-2"
                    disabled={selectedRows.length !== 1 || !permissions?.["view"]}
                    onClick={viewPerson}
                  >
                    {permissions?.["view"] ? <Edit className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    <span>View Person</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-2"
                    disabled={deleting || selectedRows.length === 0 || !permissions?.["delete"]}
                    onClick={handleDeletion}
                  >
                    {deleting ? (
                      <Spinner size={16} />
                    ) : permissions?.["delete"] ? (
                      <Trash2 className="w-4 h-4" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                    <span>Delete</span>
                  </Button>
                </div>
              </div>

              {loading || (people && people.length > 0) ? <DataTable columns={cols} headerOnly /> : null}
            </div>

            {loading || (people && people.length > 0) ? (
              <DataTable
                columns={cols}
                data={permissions?.["view"] ? people : null}
                selectedRows={selectedRows}
                onRowClick={toggleRowSelection}
                rowsOnly
                loading={loading}
              />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">No people match.</p>
            )}
          </div>

          <CustomFilter
            title="Filter People"
            template={filter_fields_template}
            templateMapper={filter_fields_mapper}
            dataFetcher={async (query) => {
              setFilterQuery(query || "");
              await fetchPeople(searchTerm, query || "");
            }}
            open={filterOpen}
            setOpen={setFilterOpen}
            onActiveChange={setActiveFilters}
          />

          <PersonDeleteDialog
            personId={selectedPerson?.id ?? null}
            personName={selectedPerson?.name || ""}
            open={deleteOpen}
            setOpen={setDeleteOpen}
            onDeleted={onChanged}
          />

          <MergePeopleDialog
            groups={duplicates}
            open={mergeOpen}
            setOpen={setMergeOpen}
            onMerged={onChanged}
          />
        </main>
      </div>
    </div>
  );
};

export default People;
