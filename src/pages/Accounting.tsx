import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import CustomFilter from "@/components/layout/CustomFilter";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import DataTable from "@/components/ui/data-table";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { PeriodSwitch } from "@/components/ui/period-switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ArrowLeft,
  BookOpen,
  Landmark,
  Users,
  Wallet2,
  Plus,
  Edit,
  Trash2,
  Filter,
  Lock,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../services/AuthProvider";
import {
    getCashInHand,
    getTransactionsSummary,
    getMonthlyCashTrend,
    transactionsAPIPackage,
} from "../../services/api";
import {
  AccountTypeMap,
  transformTransaction,
  TransactionTypeMap,
  TransactionStatusMap,
  getTransactionStatusColor,
  listCountLabel,
  ACCESS_DENIED_MESSAGE,
} from "../../services/utils";
import { Spinner } from "@/components/ui/spinner";
import { SearchField } from "@/components/ui/search-field";
import { useDebouncedSearch } from "@/hooks/use-debounced-search";
import { useListPeriod, useOnChange } from "@/hooks/use-period";
import { useFilterOptions } from "@/hooks/use-filter-options";
import { PAGE_PERIODS, periodHint } from "../../services/periods";

const subModules = [
    { label: "Book of Business", icon: BookOpen, actionLink: "/accounting/book-of-business" },
    { label: "Ledgers", icon: Users, actionLink: "/accounting/ledgers" },
    { label: "Money Accounts", icon: Wallet2, actionLink: "/accounting/accounts" },
    { label: "Cheques", icon: Landmark, actionLink: "/accounting/cheques" },
];

const cols = [
    { key: "id", label: "ID" },
    { key: "date", label: "Date" },
    {
        key: "type",
        label: "Type",
        render: (value) => (
            <span className="whitespace-nowrap">{TransactionTypeMap[value] || value}</span>
        ),
    },
    { key: "account", label: "Account" },
    {
        key: "amount",
        label: "Amount",
        render: (value) => `PKR ${Number(value).toLocaleString()}`,
    },
    { key: "payment_method", label: "Method" },
    {
        key: "status",
        label: "Status",
        render: (value) => (
            <span
                className={`px-2 py-0.25 rounded-full text-xs font-medium whitespace-nowrap ${getTransactionStatusColor(value)}`}
            >
                {TransactionStatusMap[value] || value}
            </span>
        ),
    },
];

// No date: the page's period switch is that filter.
const filter_fields_template = {
    type: "",
    status: "",
    payment_method: "",
    account: "",
    customer: "",
    supplier: "",
    amount_min: "",
    amount_max: "",
};

// Values mirror Transaction.TYPE_CHOICES / STATUS_CHOICES /
// PAYMENT_METHOD_CHOICES in accounts/models.py — the API filters on the raw
// value, so these must stay in step with the model.
const transaction_type_options = [
    { value: "sale_payment", label: "Sale Payment" },
    { value: "customer_receipt", label: "Customer Payment" },
    { value: "purchase_return_refund", label: "Purchase Return Refund" },
    { value: "owner_capital", label: "Owner Capital" },
    { value: "loan_received", label: "Loan Received" },
    { value: "other_income", label: "Other Income" },
    { value: "purchase_payment", label: "Purchase Payment" },
    { value: "supplier_payment", label: "Supplier Payment" },
    { value: "sales_return_refund", label: "Sales Return Refund" },
    { value: "expense", label: "Expense" },
    { value: "salary_payment", label: "Salary Payment" },
    { value: "owner_drawings", label: "Owner Drawings" },
    { value: "loan_repayment", label: "Loan Repayment" },
    { value: "other_payment", label: "Other Payment" },
    { value: "transfer", label: "Account Transfer" },
    { value: "cash_adjustment", label: "Cash Adjustment" },
    { value: "customer_credit_note", label: "Customer Credit Note" },
    { value: "customer_debit_note", label: "Customer Debit Note" },
    { value: "supplier_credit_note", label: "Supplier Credit Note" },
    { value: "supplier_debit_note", label: "Supplier Debit Note" },
];

const transaction_status_options = [
    { value: "C", label: "Cleared" },
    { value: "PEN", label: "Pending" },
    { value: "B", label: "Bounced" },
];

const payment_method_options = [
    { value: "cash", label: "Cash" },
    { value: "wallet", label: "Wallet" },
    { value: "bank_transfer", label: "Bank Transfer" },
    { value: "cheque", label: "Cheque" },
];

const formatCurrency = (amount) => `PKR ${Number(amount || 0).toLocaleString()}`;

const Accounting = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
    const [cashInHand, setCashInHand] = useState(null);
    const [cashLoading, setCashLoading] = useState(true);
    // Null until it lands - never zero-filled, see ChartCard's `loading`.
    const [cashTrend, setCashTrend] = useState(null);
    const [transactionsData, setTransactionsData] = useState(null);
    // true until the first response lands, so the table never flashes
    // "no records" before it has asked. Cleared in a finally, never on
    // the success path alone, or a failed load shimmers for ever.
    const [loading, setLoading] = useState(true);
    const [selectedRows, setSelectedRows] = useState([]);
    const [isDeleted, setIsDeleted] = useState(false);
    const [filterWindowOpen, setFilterWindowOpen] = useState(false);
    const { token, getPermissions, user } = useAuth();
    const permissions = getPermissions("accounting");
    // How many filters are on, for the Filter button.
    const [filterCount, setFilterCount] = useState(0);
    const options = useFilterOptions(token, user, ["accounts", "customers", "suppliers"]);

    const filter_fields_mapper = {
        type: { label: "Type", type: "select", options: transaction_type_options, anyLabel: "Any type" },
        status: { label: "Status", type: "select", options: transaction_status_options, anyLabel: "Any status" },
        payment_method: { label: "Method", type: "select", options: payment_method_options, anyLabel: "Any method" },
        account: { label: "Account", type: "select", options: options.accounts, anyLabel: "Any account" },
        // A receipt or payment against the party, on account or against one
        // of their invoices.
        customer: {
            label: "Customer",
            type: "combobox",
            fullWidth: true,
            options: options.customers,
            loading: options.loading.customers,
            placeholder: "Any customer",
            emptyText: "No customers yet.",
            notFoundText: "No customer matches that.",
        },
        supplier: {
            label: "Supplier",
            type: "combobox",
            fullWidth: true,
            options: options.suppliers,
            loading: options.loading.suppliers,
            placeholder: "Any supplier",
            emptyText: "No suppliers yet.",
            notFoundText: "No supplier matches that.",
        },
        amount: { label: "Amount (PKR)", type: "range", input: "number", keys: ["amount_min", "amount_max"], fullWidth: true },
    };
    // The page switch, and money in / out across the rows the table shows.
    const list = useListPeriod(
        (query) => getTransactionsSummary(token, query),
        "Failed to fetch money in and out.",
    );
    const money = list.summary;
    const navigate = useNavigate();

    const toggleRowSelection = (id: string) => {
        setSelectedRows((prev) =>
            prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
        );
    };

    // `query` is the search or the filter that produced it; left out, the
    // current one is kept (a refetch after a delete or a period change).
    const fetchTransactions = async (query?: string | null) => {
        if (!token) return;
        try {
            const res = await transactionsAPIPackage.list(token, list.track(query));
            if (res) {
                setTransactionsData(res.map(transformTransaction));
            } else {
                toast.error("Failed to fetch transactions.");
            }
        } catch (error) {
            console.log("Error fetching transactions:", error);
            toast.error("Failed to fetch transactions.");
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
                  is_deleted = await transactionsAPIPackage.bulkDelete(
                      token,
                      selectedRows,
                      "transaction"
                  );
              } else {
                  is_deleted = await transactionsAPIPackage.delete(token, selectedRows[0]);
              }

              if (is_deleted) {
                  toast.success("Transactions deleted successfully.");
                  setIsDeleted(!isDeleted);
                  setSelectedRows([]);
              } else {
                  toast.error("Failed to delete transactions.");
              }
          } catch (error) {
              toast.error("Failed to delete transactions.");
              console.log(error);
          }
    
    } finally {
      setDeleting(false);
    }
  };

    const handleUpdateClick = () => {
        if (selectedRows.length !== 1) return;
        navigate("/accounting/update-transaction", {
            state: { transaction_id: selectedRows[0] },
        });
    };

    const { searchTerm, setSearchTerm, searching } = useDebouncedSearch(fetchTransactions);

    useEffect(() => {
        if (!token) return;

        const fetchCashInHand = async () => {
            try {
                const res = await getCashInHand(token);
                if (res) setCashInHand(res);
            } catch (error) {
                console.log(error);
                toast.error("Failed to fetch cash in hand.");
            } finally {
              setCashLoading(false);
            }
        };

        const fetchCashTrend = async () => {
            try {
                const res = await getMonthlyCashTrend(token);
                if (res) setCashTrend(res);
            } catch (error) {
                console.log(error);
                toast.error("Failed to fetch cash trend.");
            }
        };

        fetchCashInHand();
        fetchCashTrend();
        fetchTransactions();
    }, [token, isDeleted]);

    // A new period refetches the rows, and with them money in and out.
    useOnChange(list.period, () => fetchTransactions());


    return (
        <div className="min-h-screen bg-background">
            <Sidebar onCollapseChange={setSidebarCollapsed} />
            <div
                className={`${sidebarCollapsed ? "ml-16" : "ml-64"
                    } transition-all duration-300 flex flex-col`}
            >
                <Header />

                <main className="flex-1 p-6 space-y-6">
                    <div className="space-y-1">
                        <DynamicBreadCrumb />

                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center space-x-3">
                                <ArrowLeft
                                    className="w-5 h-5 text-muted-foreground cursor-pointer hover:text-primary"
                                    onClick={() => navigate("/")}
                                />
                                <div>
                                    <h1 className="text-2xl font-semibold">Accounting Overview</h1>
                                    <p className="text-sm text-muted-foreground">
                                        The cash position and every transaction recorded.
                                    </p>
                                </div>
                            </div>

                            {/* Narrows money in / out and the table together.
                                Cash in Hand is a balance and never follows it. */}
                            {permissions?.["view"] && (
                                <PeriodSwitch
                                    label="Period for the cards and the table"
                                    options={PAGE_PERIODS}
                                    value={list.period}
                                    onChange={list.setPeriod}
                                    allowCustom
                                />
                            )}
                        </div>
                    </div>

                    {!permissions?.["view"] ? (
                        <div className="bg-card rounded-lg p-6 border">
                            <p className="text-sm text-muted-foreground">
                                {ACCESS_DENIED_MESSAGE}
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Cash position */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                <MetricCard
                                    title="Cash in Hand"
                                    value={formatCurrency(cashInHand?.total)}
                                    hint="As of today"
                                    loading={cashLoading}
                                  />
                                <MetricCard
                                    title="Money In"
                                    value={formatCurrency(money?.money_in)}
                                    hint={periodHint(money?.period, money?.filtered)}
                                    loading={list.summaryLoading}
                                    valueLoading={list.summaryRefreshing}
                                  />
                                <MetricCard
                                    title="Money Out"
                                    value={formatCurrency(money?.money_out)}
                                    hint={periodHint(money?.period, money?.filtered)}
                                    loading={list.summaryLoading}
                                    valueLoading={list.summaryRefreshing}
                                  />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="flex flex-col gap-6">
                                    <ChartCard
                                        title="Net Cash Movement"
                                        hint="This month"
                                        data={cashTrend}
                                        color="#8b5cf6"
                                    />

                                    {/* Sub-modules */}
                                    <div className="flex items-center gap-1">
                                        {subModules.map((subModule) => {
                                            const Icon = subModule.icon;
                                            return (
                                                <Button
                                                    key={subModule.label}
                                                    variant="outline"
                                                    size="lg"
                                                    className="flex-1 flex items-center space-x-2 px-4"
                                                    onClick={() => navigate(subModule.actionLink)}
                                                >
                                                    <Icon className="w-4 h-4" />
                                                    <span>{subModule.label}</span>
                                                </Button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Account Balances */}
                                <div className="bg-card rounded-lg p-6 border">
                                    <div className="text-base font-medium mb-4">
                                        Account Balances
                                    </div>
                                    {cashInHand?.accounts?.length > 0 ? (
                                        <div className="space-y-2">
                                            {cashInHand.accounts.map((account) => (
                                                <div
                                                    key={account.id}
                                                    className="bg-card rounded-lg border px-4 py-2 flex items-center justify-between"
                                                >
                                                    <div>
                                                        <div className="text-sm font-medium">
                                                            {account.name}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {AccountTypeMap[account.type] || account.type}
                                                        </div>
                                                    </div>
                                                    <div className="text-sm font-bold">
                                                        {formatCurrency(account.balance)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">
                                            No accounts yet.
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Transactions.

                                Sticky from here down: once the heading
                                reaches the top of the window it stays
                                there, with the action row and the column
                                header, and only the rows carry on
                                scrolling underneath. The three sit in one
                                container so the column header needs no top
                                offset of its own. */}
                            <div>
                            <div className="sticky top-0 z-20 bg-background pt-4 pb-[10px] space-y-4">
                            <h2 className="text-xl font-semibold">
                                All Transactions ({listCountLabel(transactionsData, selectedRows)})
                            </h2>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <SearchField
                                      placeholder="Search Transactions"
                                      value={searchTerm}
                                      onChange={setSearchTerm}
                                      pending={searching}
                                    />
                                    <Button
                                        variant="outline"
                                        onClick={() => setFilterWindowOpen(!filterWindowOpen)}
                                    >
                                        <Filter className="w-4 h-4 mr-2" />
                                        <span>{filterCount ? `Filter · ${filterCount}` : "Filter"}</span>
                                    </Button>
                                </div>

                                <div className="flex items-center space-x-3">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex items-center space-x-2"
                                        disabled={!permissions?.["create"]}
                                        onClick={() => navigate("/accounting/create-transaction")}
                                    >
                                        {permissions?.["create"] ? (
                                            <Plus className="w-4 h-4" />
                                        ) : (
                                            <Lock className="w-4 h-4" />
                                        )}
                                        <span>Record Transaction</span>
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

                            {loading || (transactionsData && transactionsData.length > 0) ? (
                                <DataTable columns={cols} headerOnly />
                            ) : null}
                            </div>

                            {loading || (transactionsData && transactionsData.length > 0) ? (
                                <DataTable
                                    columns={cols}
                                    data={transactionsData}
                                    selectedRows={selectedRows}
                                    onRowClick={toggleRowSelection}
                                    rowsOnly
                                    loading={loading}
                                />
                            ) : null}
                            </div>

                            <CustomFilter
                                title="Filter Transactions"
                                template={filter_fields_template}
                                templateMapper={filter_fields_mapper}
                                dataFetcher={fetchTransactions}
                                open={filterWindowOpen}
                                setOpen={setFilterWindowOpen}
                                onActiveChange={setFilterCount}
                            />
                        </>
                    )}
                </main>
            </div>
        </div>
    );
};

export default Accounting;
