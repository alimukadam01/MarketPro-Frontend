import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import DataTable from "@/components/ui/data-table";
import { MetricCard } from "@/components/dashboard/MetricCard";
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

const customerCols = [
    { key: "id", label: "ID" },
    { key: "name", label: "Customer" },
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
    { key: "name", label: "Supplier" },
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
    const [profit, setProfit] = useState(null);
    const [profitLoading, setProfitLoading] = useState(true);
    const { token, getPermissions } = useAuth();
    const permissions = getPermissions("accounting");
    const navigate = useNavigate();

    const customerRows = (receivables?.parties || []).map((party) => ({
        id: party.id,
        name: party.name,
        phone: party.phone || "-",
        balance: party.balance,
        current: party.aging?.current,
        days_31_60: party.aging?.days_31_60,
        days_over_60: party.aging?.days_over_60,
    }));

    const supplierRows = (payables?.parties || []).map((party) => ({
        id: party.id,
        name: party.name,
        business_name: party.business_name || "-",
        phone: party.phone || "-",
        balance: party.balance,
    }));

    // The party screen, not the old accounting-only ledger: it carries the same
    // khaata plus the balance, the opening balance and the payment dialog. Under
    // this path rather than /customers, so the URL and the breadcrumb both say
    // the user came through accounting.
    const openCustomerLedger = (id) => {
        navigate("/accounting/ledgers/view-customer", {
            state: { customer_id: id },
        });
    };

    const openSupplierLedger = (id) => {
        navigate("/accounting/ledgers/view-supplier", {
            state: { supplier_id: id },
        });
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

        const fetchProfit = async () => {
            try {
                const res = await getProfitEstimate(token);
                if (res) {
                    setProfit(res);
                } else {
                    toast.error("Failed to fetch profit estimate.");
                }
            } catch (error) {
                console.log("Error fetching profit estimate:", error);
                toast.error("Failed to fetch profit estimate.");
            } finally {
              setProfitLoading(false);
            }
        };

        fetchReceivables();
        fetchPayables();
        fetchProfit();
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
                                    loading={loading}
                                />
                                <MetricCard
                                    title="Payable"
                                    value={formatCurrency(payables?.total)}
                                    loading={loading}
                                />
                                <MetricCard
                                    title="Profit this month (estimated)"
                                    value={formatCurrency(profit?.this_month?.profit)}
                                    loading={profitLoading}
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
                                />
                                <MetricCard
                                  title="Receivable 31&ndash;60 days"
                                  value={formatCurrency(receivables?.aging?.days_31_60)}
                                  loading={loading}
                                />
                                <MetricCard
                                  title="Receivable over 60 days"
                                  value={formatCurrency(receivables?.aging?.days_over_60)}
                                  loading={loading}
                                />
                            </div>

                            {/* Customers who owe money */}
                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold">
                                    Customers with Outstanding Balance
                                </h2>
                                {loading || customerRows.length > 0 ? (
                                    <DataTable
                                        columns={customerCols}
                                        data={customerRows}
                                        selectedRows={[]}
                                        onRowClick={openCustomerLedger}
                                        loading={loading}
                                    />
                                ) : (
                                    <div className="bg-card rounded-lg p-6 border">
                                        <p className="text-sm text-muted-foreground">
                                            No customer owes you anything right now.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Suppliers we owe */}
                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold">Suppliers Owed</h2>
                                {loading || supplierRows.length > 0 ? (
                                    <DataTable
                                        columns={supplierCols}
                                        data={supplierRows}
                                        selectedRows={[]}
                                        onRowClick={openSupplierLedger}
                                        loading={loading}
                                    />
                                ) : (
                                    <div className="bg-card rounded-lg p-6 border">
                                        <p className="text-sm text-muted-foreground">
                                            You do not owe any supplier right now.
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
