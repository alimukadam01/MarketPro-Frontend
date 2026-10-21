import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import DataTable from "@/components/ui/data-table";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Button } from "@/components/ui/button";
import { PeriodSwitch } from "@/components/ui/period-switch";
import { toast } from "sonner";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../services/AuthProvider";
import { getBook, getBookSummary } from "../../services/api";
import {
    AccountTypeMap,
    TransactionTypeMap,
    TransactionStatusMap,
    getTransactionStatusColor,
    formatDate,
  ACCESS_DENIED_MESSAGE,
} from "../../services/utils";
import { CARD_PERIODS, TODAY, periodHint } from "../../services/periods";

const cols = [
    { key: "id", label: "ID" },
    // A period spans days, so each row says which one.
    { key: "date", label: "Date", render: (value) => (value ? formatDate(value) : "-") },
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

/**
 * The Book of Business: the day book over any period - today by default, a
 * week from Saturday, this month, quarter or year, or a custom range. Every
 * figure and every account table on the page follows the period. Receivable
 * and payable are balances, so they always show where things stand today.
 */
const BookOfBusiness = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
    const [period, setPeriod] = useState<{ key: string; from?: string; to?: string }>(TODAY);
    const [dayBook, setDayBook] = useState(null);
    // Every surface fed by fetchDayBook shares this: the two figures above the
    // fold and the per-account tables, which are nested inside dayBook rather
    // than fetched separately. True only until the first answer; after that a
    // period change keeps the page on screen and only the figures wait.
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState(null);
    const [summaryLoading, setSummaryLoading] = useState(true);
    // The latest fetch failed: the cards show a hazard rather than the last
    // period's figures as though they were this one's.
    const [bookFailed, setBookFailed] = useState(false);
    const [summaryFailed, setSummaryFailed] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    // A slow answer for an older period must not overwrite a newer one.
    const latest = useRef(0);
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

    const fetchBook = async () => {
        if (!token) return;
        const ticket = ++latest.current;
        setRefreshing(true);
        try {
            const [book, totals] = await Promise.all([
                getBook(token, period),
                getBookSummary(token, period),
            ]);
            if (ticket !== latest.current) return;
            setBookFailed(!book);
            setSummaryFailed(!totals);
            if (book) {
                setDayBook(book);
            } else {
                toast.error("Failed to fetch the book of business.");
            }
            if (totals) {
                setSummary(totals);
            } else {
                toast.error("Failed to fetch the summary.");
            }
        } catch (error) {
            console.log("Error fetching the book of business:", error);
            if (ticket === latest.current) {
                toast.error("Failed to fetch the book of business.");
                setBookFailed(true);
                setSummaryFailed(true);
            }
        } finally {
            if (ticket === latest.current) {
                setLoading(false);
                setSummaryLoading(false);
                setRefreshing(false);
            }
        }
    };

    // Compared by value: a custom range is a new object on every edit.
    const periodKey = JSON.stringify(period);
    useEffect(() => {
        // A different period can have a different set of accounts.
        setAccountIndex(0);
        fetchBook();
    }, [token, periodKey]);

    // The period the figures cover, as the server worked it out.
    const covered = dayBook
        ? { key: period.key, date_from: dayBook.date_from, date_to: dayBook.date_to }
        : null;
    const hint = periodHint(covered);

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
                                    onClick={() => navigate("/accounting")}
                                />
                                <div>
                                    <h1 className="text-2xl font-semibold">Book of Business</h1>
                                    <p className="text-sm text-muted-foreground">
                                        The cash book over any period. Every figure below follows it.
                                    </p>
                                </div>
                            </div>

                            {permissions?.["view"] && (
                                <PeriodSwitch
                                    label="Period for the book of business"
                                    options={CARD_PERIODS}
                                    value={period}
                                    onChange={setPeriod}
                                    allowCustom
                                    clearTo={TODAY}
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
                            {/* Key figures for the period. Receivable and
                                payable are balances, so they show today's. */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <MetricCard
                                    title="Money In"
                                    value={formatCurrency(dayBook?.total_money_in)}
                                    hint={hint}
                                    loading={loading}
                                    error={bookFailed}
                                    valueLoading={refreshing}
                                  />
                                <MetricCard
                                    title="Money Out"
                                    value={formatCurrency(dayBook?.total_money_out)}
                                    hint={hint}
                                    loading={loading}
                                    error={bookFailed}
                                    valueLoading={refreshing}
                                  />
                                <MetricCard
                                    title="Credit Extended"
                                    value={formatCurrency(summary?.credit_extended)}
                                    hint={hint}
                                    loading={summaryLoading}
                                    error={summaryFailed}
                                    valueLoading={refreshing}
                                  />
                                <MetricCard
                                    title="Credit Recovered"
                                    value={formatCurrency(summary?.money_in?.udhaar_recovered)}
                                    hint={hint}
                                    loading={summaryLoading}
                                    error={summaryFailed}
                                    valueLoading={refreshing}
                                  />
                                <MetricCard
                                    title="Total Receivable"
                                    value={formatCurrency(summary?.total_receivable)}
                                    hint="As of today"
                                    loading={summaryLoading}
                                    error={summaryFailed}
                                  />
                                <MetricCard
                                    title="Total Payable"
                                    value={formatCurrency(summary?.total_payable)}
                                    hint="As of today"
                                    loading={summaryLoading}
                                    error={summaryFailed}
                                  />
                                <MetricCard
                                    title="Cheques Due"
                                    value={String(summary?.pending_cheques?.length || 0)}
                                    hint={summary?.date_to ? `Pending, due by ${formatDate(summary.date_to)}` : undefined}
                                    loading={summaryLoading}
                                    error={summaryFailed}
                                    valueLoading={refreshing}
                                  />
                                <MetricCard
                                    title="Profit (estimated)"
                                    value={formatCurrency(summary?.profit?.profit)}
                                    hint={hint}
                                    loading={summaryLoading}
                                    error={summaryFailed}
                                    valueLoading={refreshing}
                                  />
                            </div>

                            <p className="text-xs text-muted-foreground">
                                The profit figure is an estimate. It is only as accurate as the
                                sales, purchase and expense data entered, and depends on product
                                costs being up to date.
                            </p>

                            {/* Daily Summary */}
                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold">Summary</h2>

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

                                        {loading || account.rows?.length > 0 ? (
                                            <DataTable
                                                columns={cols}
                                                data={account.rows}
                                                selectedRows={[]}
                                                onRowClick={() => { }}
                                                loading={loading}
                                            />
                                        ) : (
                                            <div className="bg-card rounded-lg p-6 border">
                                                <p className="text-sm text-muted-foreground">
                                                    No money moved through this account in this period.
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

export default BookOfBusiness;
