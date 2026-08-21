import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import DataTable from "@/components/ui/data-table";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../services/AuthProvider";
import { getDayBook, getDailySummary } from "../../services/api";
import {
    AccountTypeMap,
    TransactionTypeMap,
    TransactionStatusMap,
    getTransactionStatusColor,
    todayForInput,
} from "../../services/utils";

const cols = [
    { key: "id", label: "ID" },
    {
        key: "type",
        label: "Type",
        render: (value) => (
            <span className="whitespace-nowrap">{TransactionTypeMap[value] || value}</span>
        ),
    },
    { key: "reference", label: "Reference" },
    {
        key: "money_in",
        label: "Money In",
        render: (value) => (value ? `PKR ${Number(value).toLocaleString()}` : "-"),
    },
    {
        key: "money_out",
        label: "Money Out",
        render: (value) => (value ? `PKR ${Number(value).toLocaleString()}` : "-"),
    },
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

const formatCurrency = (amount) => `PKR ${Number(amount || 0).toLocaleString()}`;

const DailyBook = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
    const [selectedDate, setSelectedDate] = useState(
        todayForInput()
    );
    const [dayBook, setDayBook] = useState(null);
    const [summary, setSummary] = useState(null);
    const [accountIndex, setAccountIndex] = useState(0);
    const { token, getPermissions } = useAuth();
    const permissions = getPermissions("accounting");
    const navigate = useNavigate();

    const accounts = dayBook?.accounts || [];
    const account = accounts[accountIndex] || null;

    const showPreviousAccount = () =>
        setAccountIndex((prev) => (prev - 1 + accounts.length) % accounts.length);

    const showNextAccount = () =>
        setAccountIndex((prev) => (prev + 1) % accounts.length);

    const fetchDayBook = async () => {
        if (!token) return;
        try {
            const res = await getDayBook(token, selectedDate);
            if (res) {
                setDayBook(res);
            } else {
                toast.error("Failed to fetch the day book.");
            }
        } catch (error) {
            console.log("Error fetching day book:", error);
            toast.error("Failed to fetch the day book.");
        }
    };

    const fetchSummary = async () => {
        if (!token) return;
        try {
            const res = await getDailySummary(token, selectedDate);
            if (res) {
                setSummary(res);
            } else {
                toast.error("Failed to fetch the daily summary.");
            }
        } catch (error) {
            console.log("Error fetching daily summary:", error);
            toast.error("Failed to fetch the daily summary.");
        }
    };

    useEffect(() => {
        // A different day can have a different set of accounts.
        setAccountIndex(0);
        fetchDayBook();
        fetchSummary();
    }, [token, selectedDate]);

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

                        <div className="flex items-center space-x-3">
                            <ArrowLeft
                                className="w-5 h-5 text-muted-foreground cursor-pointer hover:text-primary"
                                onClick={() => navigate("/accounting")}
                            />
                            <div>
                                <h1 className="text-2xl font-semibold">Daily Book</h1>
                                <p className="text-sm text-muted-foreground">
                                    The daily cash book. Pick any past date to review it.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="space-y-1">
                            <Label htmlFor="date">Date</Label>
                            <Input
                                id="date"
                                type="date"
                                className="w-56"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                            />
                        </div>
                    </div>

                    {!permissions?.["view"] ? (
                        <div className="bg-card rounded-lg p-6 border">
                            <p className="text-sm text-muted-foreground">
                                Access not granted. Please contact Admin.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Key figures for the day */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <MetricCard
                                    title="Money In"
                                    value={formatCurrency(dayBook?.total_money_in)}
                                />
                                <MetricCard
                                    title="Money Out"
                                    value={formatCurrency(dayBook?.total_money_out)}
                                />
                                <MetricCard
                                    title="Credit Extended"
                                    value={formatCurrency(summary?.credit_extended)}
                                />
                                <MetricCard
                                    title="Credit Recovered"
                                    value={formatCurrency(summary?.money_in?.udhaar_recovered)}
                                />
                                <MetricCard
                                    title="Total Receivable"
                                    value={formatCurrency(summary?.total_receivable)}
                                />
                                <MetricCard
                                    title="Total Payable"
                                    value={formatCurrency(summary?.total_payable)}
                                />
                                <MetricCard
                                    title="Cheques Due"
                                    value={String(summary?.pending_cheques?.length || 0)}
                                />
                                <MetricCard
                                    title="Profit (estimated)"
                                    value={formatCurrency(summary?.profit?.profit)}
                                />
                            </div>

                            <p className="text-xs text-muted-foreground">
                                The profit figure is an estimate. It is only as accurate as the
                                sales, purchase and expense data entered, and depends on product
                                costs being up to date.
                            </p>

                            {/* Daily Summary */}
                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold">Daily Summary</h2>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="bg-card rounded-lg p-6 border space-y-2">
                                        <div className="text-base font-medium mb-2">Money In</div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Cash sales</span>
                                            <span>{formatCurrency(summary?.money_in?.cash_sales)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">
                                                Credit recovered
                                            </span>
                                            <span>
                                                {formatCurrency(summary?.money_in?.udhaar_recovered)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Other income</span>
                                            <span>
                                                {formatCurrency(summary?.money_in?.other_income)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm font-bold border-t pt-2">
                                            <span>Total</span>
                                            <span>{formatCurrency(summary?.money_in?.total)}</span>
                                        </div>
                                    </div>

                                    <div className="bg-card rounded-lg p-6 border space-y-2">
                                        <div className="text-base font-medium mb-2">Money Out</div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Expenses</span>
                                            <span>{formatCurrency(summary?.money_out?.expenses)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">
                                                Supplier payments
                                            </span>
                                            <span>
                                                {formatCurrency(summary?.money_out?.supplier_payments)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Salaries</span>
                                            <span>{formatCurrency(summary?.money_out?.salaries)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">
                                                Owner drawings
                                            </span>
                                            <span>{formatCurrency(summary?.money_out?.drawings)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm font-bold border-t pt-2">
                                            <span>Total</span>
                                            <span>{formatCurrency(summary?.money_out?.total)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* One account at a time */}
                            <div className="space-y-4">
                                {account ? (
                                    <>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={accounts.length <= 1}
                                                    onClick={showPreviousAccount}
                                                >
                                                    <ChevronLeft className="w-4 h-4" />
                                                </Button>

                                                <div className="text-center">
                                                    <h2 className="text-xl font-semibold">
                                                        {account.account_name}
                                                    </h2>
                                                    <p className="text-sm text-muted-foreground">
                                                        {AccountTypeMap[account.account_type] ||
                                                            account.account_type}
                                                        {accounts.length > 1 &&
                                                            ` · ${accountIndex + 1} of ${accounts.length}`}
                                                    </p>
                                                </div>

                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={accounts.length <= 1}
                                                    onClick={showNextAccount}
                                                >
                                                    <ChevronRight className="w-4 h-4" />
                                                </Button>
                                            </div>

                                            <div className="flex items-center space-x-6">
                                                <div className="text-right">
                                                    <div className="text-xs text-muted-foreground">
                                                        Opening
                                                    </div>
                                                    <div className="text-sm font-medium">
                                                        {formatCurrency(account.opening_balance)}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs text-muted-foreground">
                                                        In
                                                    </div>
                                                    <div className="text-sm font-medium">
                                                        {formatCurrency(account.money_in)}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs text-muted-foreground">
                                                        Out
                                                    </div>
                                                    <div className="text-sm font-medium">
                                                        {formatCurrency(account.money_out)}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs text-muted-foreground">
                                                        Closing
                                                    </div>
                                                    <div className="text-sm font-bold">
                                                        {formatCurrency(account.closing_balance)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {account.rows?.length > 0 ? (
                                            <DataTable
                                                columns={cols}
                                                data={account.rows}
                                                selectedRows={[]}
                                                onRowClick={() => { }}
                                            />
                                        ) : (
                                            <div className="bg-card rounded-lg p-6 border">
                                                <p className="text-sm text-muted-foreground">
                                                    No money moved through this account on this date.
                                                </p>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="bg-card rounded-lg p-6 border">
                                        <p className="text-sm text-muted-foreground">
                                            No money accounts yet.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </main>
            </div>
        </div>
    );
};

export default DailyBook;
