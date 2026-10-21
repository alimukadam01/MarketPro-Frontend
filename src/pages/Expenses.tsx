import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import CustomFilter from "@/components/layout/CustomFilter";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import DataTable from "@/components/ui/data-table";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { PeriodSwitch } from "@/components/ui/period-switch";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import {
  transformExpense,
  listCountLabel,
  formatCurrency,
  ExpenseCategoryLabels,
} from "../../services/utils";
import { PAGE_PERIODS, periodHint } from "../../services/periods";
import { useAuth } from "../../services/AuthProvider"
import {
  expensesAPIPackage,
  getExpensesSummary,
} from "../../services/api";
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
import { useListPeriod, useOnChange } from "@/hooks/use-period";
import { useFilterOptions } from "@/hooks/use-filter-options";

//v2 idea: create an endpoint that serves these 2 arrays individually for each client.

const cols = [
  { key: "id", label: "ID" },
  { key: "name", label: "Name" },
  { key: "category", label: "Category" },
  { key: "desc", label: "Description" },
  { key: "amount", label: "Amount" },
  { key: "created_at", label: "Expense Date" },
];

// Name and description are left to the search box; the expense date to the
// page's period switch.
const filter_fields_template = {
  category: "",
  amount_min: "",
  amount_max: "",
  account: "",
};

// Every category an expense can carry, including the one the system records
// from an invoice's extra charges, since those show in this list too.
const category_options = Object.entries(ExpenseCategoryLabels).map(
  ([value, label]) => ({ value, label: label as string })
);

const Expenses = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [selectedRows, setSelectedRows] = useState([]);
  const [expensesData, setExpensesData] = useState(null);
  // true until the first response lands, so the table never flashes
  // "no records" before it has asked. Cleared in a finally, never on
  // the success path alone, or a failed load shimmers for ever.
  const [loading, setLoading] = useState(true);
  const { token } = useAuth() || null;
  // The page switch, and the cards worked out from the rows the table shows.
  const list = useListPeriod(
    (query) => getExpensesSummary(token, query),
    "Failed to fetch the expense figures.",
  );
  const summary = list.summary;
  const { getPermissions, user } = useAuth()
  const permissions = getPermissions("expenses")
  // How many filters are on, for the Filter button.
  const [filterCount, setFilterCount] = useState(0);
  const options = useFilterOptions(token, user, ["accounts"]);

  const filter_fields_mapper = {
    category: {
      label: "Category",
      type: "select",
      options: category_options,
      anyLabel: "Any category",
    },
    account: {
      label: "Paid from",
      type: "select",
      options: options.accounts,
      anyLabel: "Any account",
    },
    amount: { label: "Amount (PKR)", type: "range", input: "number", keys: ["amount_min", "amount_max"], fullWidth: true },
  };
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
          is_deleted = await expensesAPIPackage.bulkDelete(token, selectedRows);
        } else {
          console.log("Deleting single invoice with ID:", selectedRows[0]);
          is_deleted = await expensesAPIPackage.delete(token, selectedRows[0]);
        }

        if (is_deleted) {
          toast.success("Expenses deleted successfully.");
          setIsDeleted(!isDeleted);
          setSelectedRows([]);
        } else {
          toast.error("Failed to delete expenses.");
        }
      } catch (error) {
        toast.error("Failed to delete expenses.");
        console.error(error);
      }
  
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdateClick = () => {
    if (selectedRows.length !== 1) return
    navigate("/expenses/update-expense", {
      state: { expense_id: selectedRows[0] },
    });
  };

  // `query` is the search or the filter that produced it; left out, the
  // current one is kept (a refetch after a delete or a period change).
  const fetchExpenses = async (query?: string | null) => {
    if (!token) return;

    try {
      const res = await expensesAPIPackage.list(token, list.track(query), true);
      if (res) {
        
        setExpensesData(res.map(transformExpense));
      } else {
        toast.error("Failed to fetch expenses.");
      }
    } catch (error) {
      toast.error("Failed to fetch expenses.");
      console.error("Error fetching expenses:", error);
    } finally {
        setLoading(false);
    }
  };

  const handleFilterClick = (e) => {
    e.preventDefault();
    setFilterWindowOpen(!filterWindowOpen);
  };

  const { searchTerm, setSearchTerm, searching } = useDebouncedSearch(fetchExpenses);

  useEffect(() => {

    fetchExpenses();
  }, [token, isDeleted])

  // A new period refetches the rows, and with them the cards.
  useOnChange(list.period, () => fetchExpenses());


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

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <ArrowLeft
                  className="w-5 h-5 text-muted-foreground cursor-pointer hover:text-primary"
                  onClick={() => navigate("/")}
                />
                <div className="flex-1 items-center justify-between">
                  <h1 className="text-2xl font-semibold">Expenses Overview</h1>
                  <p className="text-sm text-muted-foreground">
                    View and manage expenses.
                  </p>
                </div>
              </div>

              {/* Narrows the cards and the table together. An expense has no
                  date of its own, so this goes by when it was recorded. */}
              <PeriodSwitch
                label="Period for the cards and the table"
                options={PAGE_PERIODS}
                value={list.period}
                onChange={list.setPeriod}
                allowCustom
              />
            </div>
          </div>

          {/* Key Metrics Cards - from the same rows the table shows. */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <MetricCard
              title="Expenses"
              value={summary?.expense_count}
              hint={periodHint(summary?.period, summary?.filtered)}
              loading={list.summaryLoading}
              valueLoading={list.summaryRefreshing}
            />
            <MetricCard
              title="Expense Amount"
              value={formatCurrency(summary?.expense_amount)}
              hint={periodHint(summary?.period, summary?.filtered)}
              loading={list.summaryLoading}
              valueLoading={list.summaryRefreshing}
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
              Expense Listing ({listCountLabel(expensesData, selectedRows)})
            </h2>

            {/* Search and Filter */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <SearchField
                  placeholder="Search Expenses"
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
                  <span>{filterCount ? `Filter · ${filterCount}` : "Filter"}</span>
                </Button>
              </div>

              {/* Action Icons */}
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                  disabled={!permissions["create"]}
                  onClick={() => navigate("/expenses/create-expense")}
                >
                  {permissions["create"] ? <Plus className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  <span>Create Expense</span>
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

            {loading || (expensesData && expensesData.length > 0) ? (
              <DataTable columns={cols} headerOnly />
            ) : null}
          </div>

          {loading || (expensesData && expensesData.length > 0) ? (
            <DataTable
              columns={cols}
              data={permissions["view"] ? expensesData : null}
              selectedRows={selectedRows}
              onRowClick={toggleRowSelection}
              rowsOnly
              loading={loading}
            />
          ) : null}
          </div>

          <CustomFilter
            title="Filter Expenses"
            template={filter_fields_template}
            templateMapper={filter_fields_mapper}
            dataFetcher={fetchExpenses}
            open={filterWindowOpen}
            setOpen={setFilterWindowOpen}
            onActiveChange={setFilterCount}
          />
        </main>
      </div>
    </div>
  );
};

export default Expenses;
