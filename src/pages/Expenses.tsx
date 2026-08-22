import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import CustomFilter from "@/components/layout/CustomFilter";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import DataTable from "@/components/ui/data-table";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import {
  formatSearchQuery,
  transformExpense
} from "../../services/utils";
import { useAuth } from "../../services/AuthProvider"
import {
  expensesAPIPackage,
  getTotalExpensesMonthly,
  getTotalExpenseAmountMonthly
} from "../../services/api";
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
  { key: "category", label: "Category" },
  { key: "desc", label: "Description" },
  { key: "amount", label: "Amount" },
  { key: "created_at", label: "Expense Date" },
];

const filter_fields_template = {
  name: "",
  category: "",
  desc: "",
  amount: ""
};

const filter_fields_mapper = {
  name: {
    label: "Name",
    type: "text",
    placeholder: "Enter Expense Name",
  },
  category: {
    label: "Category",
    type: "text",
    placeholder: "kiraya, bijli, tankhwa, transport, mutafarriq",
  },
  desc: {
    label: "Description",
    type: "text",
    placeholder: "Enter Expense Description",
  },
  amount: {
    label: "Amount",
    type: "number",
    placeholder: "Enter Expense Amount",
  },
};

const Expenses = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [selectedRows, setSelectedRows] = useState([]);
  const [expensesData, setExpensesData] = useState(null);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalExpenseAmount, setTotalExpenseAmount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const { token } = useAuth() || null;
  const { getPermissions } = useAuth()
  const permissions = getPermissions("expenses")
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
  };

  const handleUpdateClick = () => {
    if (selectedRows.length !== 1) return
    navigate("/expenses/update-expense", {
      state: { expense_id: selectedRows[0] },
    });
  };

  const fetchExpenses = async (searchQuery = null) => {
    if (!token) return;

    try {
      const res = await expensesAPIPackage.list(token, searchQuery, true);
      if (res) {
        
        setExpensesData(res.map(transformExpense));
      } else {
        toast.error("Failed to fetch expenses.");
      }
    } catch (error) {
      toast.error("Failed to fetch expenses.");
      console.error("Error fetching expenses:", error);
    }
  };

  const handleFilterClick = (e) => {
    e.preventDefault();
    setFilterWindowOpen(!filterWindowOpen);
  };

  useEffect(() => {

    const fetchTotalExpenses = async () => {
      if (!token) return;

      try {
        const res = await getTotalExpensesMonthly(token);
        if (res !== null) {
          setTotalExpenses(res);
        } else {
          toast.error("Failed to fetch total expenses.");
        }
      } catch (error) {
        toast.error("Failed to fetch total expenses.");
        console.error("Error fetching total expenses:", error);
      }
    }

    const fetchTotalExpenseAmount = async () => {
      if (!token) return;
      
      try {
        const res = await getTotalExpenseAmountMonthly(token);
        if (res !== null) {
          setTotalExpenseAmount(res);
        } else {
          toast.error("Failed to fetch total expenses.");
        }
      } catch (error) {
        toast.error("Failed to fetch total expenses.");
        console.error("Error fetching total expenses:", error);
      }
    }
    
    fetchTotalExpenseAmount()
    fetchTotalExpenses()
    fetchExpenses();
  }, [token, isDeleted])

  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchTerm.trim() !== "") {
        const query = formatSearchQuery(searchTerm);
        await fetchExpenses(query);
      } else {
        await fetchExpenses();
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
                  <h1 className="text-2xl font-semibold">Expenses Overview</h1>
                  <p className="text-sm text-muted-foreground">
                    View and manage expenses.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-card rounded-lg p-6 border">
              <div className="text-sm text-muted-foreground mb-2">
                Total Expenses this month
              </div>
              <div className="text-3xl font-bold">{totalExpenses}</div>
            </div>
            
            <div className="bg-card rounded-lg p-6 border">
              <div className="text-sm text-muted-foreground mb-2">
                Total Expense Amount this month
              </div>
              <div className="text-3xl font-bold">{totalExpenseAmount}</div>
            </div>
          </div>


          {/* Sales Records Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Expense Listing</h2>

            {/* Search and Filter */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search Expenses"
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
                  disabled={selectedRows.length === 0 || !permissions["delete"]}
                >
                  {permissions["delete"] ? <Trash2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  <span>Delete</span>
                </Button>
              </div>
            </div>
          </div>

          {expensesData && expensesData.length > 0 ? (
            <DataTable
              columns={cols}
              data={permissions["view"] ? expensesData : null}
              selectedRows={selectedRows}
              onRowClick={toggleRowSelection}
            />
          ) : null}

          <CustomFilter
            title="Filter Expenses"
            template={filter_fields_template}
            templateMapper={filter_fields_mapper}
            dataFetcher={fetchExpenses}
            open={filterWindowOpen}
            setOpen={setFilterWindowOpen}
          />
        </main>
      </div>
    </div>
  );
};

export default Expenses;
