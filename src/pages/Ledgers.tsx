import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import DataTable from "@/components/ui/data-table";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { PeriodMetricCard } from "@/components/dashboard/PeriodMetricCard";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../services/AuthProvider";
import { ACCESS_DENIED_MESSAGE } from "../../services/utils";
import {
    getReceivables,
    getPayables,
    getProfitEstimate,
} from "../../services/api";

const formatCurrency = (amount) => `PKR ${Number(amount || 0).toLocaleString()}`;

// Both tables mix customers and suppliers: a supplier holding the business's
// money is under Receivables, a customer it owes under Payables. The tag says
// which, because the same name can be on both sides of a shop's books.
const renderPartyName = (value, row) => (
    <span className="flex items-center gap-2">
        {value}
        {row.tag && (
            <span className="px-2 py-0.25 rounded-full text-xs font-medium whitespace-nowrap bg-muted text-muted-foreground">
                {row.tag}
            </span>
        )}
    </span>
);

const customerCols = [
    { key: "id", label: "ID" },
    { key: "name", label: "Name", render: renderPartyName },
    { key: "phone", label: "Phone" },
    {
        key: "balance",
        label: "Outstanding",
        render: (value) => (
            <span className="font-medium">{formatCurrency(value)}</span>
        ),
    },
    {
        key: "current",
        label: "0-30 days",
        render: (value) => formatCurrency(value),
    },
    {
        key: "days_31_60",
        label: "31-60 days",
        render: (value) => formatCurrency(value),
    },
    {
        key: "days_over_60",
        label: "60+ days",
        render: (value) => formatCurrency(value),
    },
];

const supplierCols = [
    { key: "id", label: "ID" },
    { key: "name", label: "Name", render: renderPartyName },
    { key: "business_name", label: "Business" },
    { key: "phone", label: "Phone" },
    {
        key: "balance",
        label: "Outstanding",
        render: (value) => (
            <span className="font-medium">{formatCurrency(value)}</span>
        ),
    },
];

const Ledgers = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
    const [receivables, setReceivables] = useState(null);
    // customerRows/supplierRows below are derived, so the flag tracks the
    // two fetches that feed them rather than the arrays themselves.
    const [loading, setLoading] = useState(true);
    const [payables, setPayables] = useState(null);
    const { token, getPermissions } = useAuth();
    const permissions = getPermissions("accounting");
    const navigate = useNavigate();

    // A customer and a supplier can share an id, so a row's id carries its
    // kind too; openLedger splits it back apart.
    const customerRows = (receivables?.parties || []).map((party) => ({
        id: `${party.party_kind}-${party.id}`,
        tag: party.party_kind === "supplier" ? "Supplier" : null,
        name: party.name,
        phone: party.phone || "-",
        balance: party.balance,
        current: party.aging?.current,
        days_31_60: party.aging?.days_31_60,
        days_over_60: party.aging?.days_over_60,
    }));

    const supplierRows = (payables?.parties || []).map((party) => ({
        id: `${party.party_kind}-${party.id}`,
        tag: party.party_kind === "customer" ? "Customer" : null,
        name: party.name,
        business_name: party.business_name || "-",
        phone: party.phone || "-",
        balance: party.balance,
    }));

    // The party screen, not the old accounting-only ledger: it carries the same
    // khaata plus the balance, the opening balance and the payment dialog. Under
    // this path rather than /customers, so the URL and the breadcrumb both say
    // the user came through accounting.
    const openLedger = (rowId) => {
        const [kind, id] = String(rowId).split("-");
        const partyId = Number(id);
        if (kind === "supplier") {
            navigate("/accounting/ledgers/view-supplier", {
                state: { supplier_id: partyId },
            });
        } else {
            navigate("/accounting/ledgers/view-customer", {
                state: { customer_id: partyId },
            });
        }
    };

    useEffect(() => {
        if (!token) return;

        // Two fetches feed the two tables; the tables stop shimmering when
        // BOTH have answered, so neither can un-shimmer over missing data.
        let outstanding = 2;
        const settle = () => {
            outstanding -= 1;
            if (outstanding <= 0) setLoading(false);
        };

        const fetchReceivables = async () => {
            try {
                const res = await getReceivables(token);
                if (res) {
                    setReceivables(res);
                } else {
                    toast.error("Failed to fetch receivables.");
                }
            } catch (error) {
                console.log("Error fetching receivables:", error);
                toast.error("Failed to fetch receivables.");
            } finally {
                settle();
            }
        };

        const fetchPayables = async () => {
            try {
                const res = await getPayables(token);
                if (res) {
                    setPayables(res);
                } else {
                    toast.error("Failed to fetch payables.");
                }
            } catch (error) {
                console.log("Error fetching payables:", error);
                toast.error("Failed to fetch payables.");
            } finally {
                settle();
            }
        };

        fetchReceivables();
        fetchPayables();
    }, [token]);

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
                                <h1 className="text-2xl font-semibold">Ledgers Overview</h1>
                                <p className="text-sm text-muted-foreground">
                                    Who owes you, whom you owe, and this month's estimated profit.
                                    Click a row to open the ledger.
                                </p>
                            </div>
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
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                <MetricCard
                                    title="Receivable"
                                    value={formatCurrency(receivables?.total)}
                                    hint="As of today"
                                    loading={loading}
                                    error={!loading && receivables == null}
                                />
                                <MetricCard
                                    title="Payable"
                                    value={formatCurrency(payables?.total)}
                                    hint="As of today"
                                    loading={loading}
                                    error={!loading && payables == null}
                                />
                                {/* Its own switch: the tables on this page are
                                    balances, so there is no page period. */}
                                <PeriodMetricCard
                                    title="Profit (estimated)"
                                    storageKey="ledgers-profit"
                                    defaultPeriod={{ key: "month" }}
                                    fetcher={(period) => getProfitEstimate(token, period)}
                                    pick={(data: { selected?: { profit: number } }) =>
                                        formatCurrency(data.selected?.profit)}
                                    errorMessage="Failed to fetch profit estimate."
                                />
                            </div>

                            <p className="text-xs text-muted-foreground">
                                The profit figure is an estimate. It is only as accurate as the
                                sales, purchase and expense data entered, and depends on product
                                costs being up to date.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <MetricCard
                                  title="Receivable 0&ndash;30 days"
                                  value={formatCurrency(receivables?.aging?.current)}
                                  loading={loading}
                                  error={!loading && receivables == null}
                                />
                                <MetricCard
                                  title="Receivable 31&ndash;60 days"
                                  value={formatCurrency(receivables?.aging?.days_31_60)}
                                  loading={loading}
                                  error={!loading && receivables == null}
                                />
                                <MetricCard
                                  title="Receivable over 60 days"
                                  value={formatCurrency(receivables?.aging?.days_over_60)}
                                  loading={loading}
                                  error={!loading && receivables == null}
                                />
                            </div>

                            {/* Everyone who owes the business: customers, and any
                                supplier holding its money (a rebate, an advance). */}
                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold">
                                    Receivables · who owes you
                                </h2>
                                {loading || customerRows.length > 0 ? (
                                    <DataTable
                                        columns={customerCols}
                                        data={customerRows}
                                        selectedRows={[]}
                                        onRowClick={openLedger}
                                        loading={loading}
                                    />
                                ) : (
                                    <div className="bg-card rounded-lg p-6 border">
                                        <p className="text-sm text-muted-foreground">
                                            Nobody owes you anything right now.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Everyone the business owes: suppliers, and any
                                customer it holds money for. */}
                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold">Payables · whom you owe</h2>
                                {loading || supplierRows.length > 0 ? (
                                    <DataTable
                                        columns={supplierCols}
                                        data={supplierRows}
                                        selectedRows={[]}
                                        onRowClick={openLedger}
                                        loading={loading}
                                    />
                                ) : (
                                    <div className="bg-card rounded-lg p-6 border">
                                        <p className="text-sm text-muted-foreground">
                                            You do not owe anyone right now.
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

export default Ledgers;
