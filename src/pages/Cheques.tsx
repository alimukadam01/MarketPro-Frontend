import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import DataTable from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, XCircle, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../services/AuthProvider";
import {
    getPendingCheques,
    markChequeCleared,
    markChequeBounced,
} from "../../services/api";
import {
    formatDate,
    TransactionTypeMap,
    TransactionStatusMap,
    getTransactionStatusColor,
} from "../../services/utils";

const formatCurrency = (amount) => `PKR ${Number(amount || 0).toLocaleString()}`;

const cols = [
    { key: "id", label: "ID" },
    { key: "cheque_number", label: "Cheque No." },
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
        render: (value) => formatCurrency(value),
    },
    { key: "due_date", label: "Due Date" },
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

const Cheques = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
    const [selectedRows, setSelectedRows] = useState([]);
    const [chequesData, setChequesData] = useState(null);
    const { token, getPermissions } = useAuth();
    const permissions = getPermissions("accounting");
    const navigate = useNavigate();

    const totalPending = (chequesData || []).reduce(
        (sum, cheque) => sum + Number(cheque.amount || 0),
        0
    );

    const toggleRowSelection = (id: string) => {
        setSelectedRows((prev) =>
            prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
        );
    };

    const fetchCheques = async () => {
        if (!token) return;
        try {
            const res = await getPendingCheques(token);
            if (res) {
                setChequesData(
                    res.map((cheque) => ({
                        id: cheque.id,
                        cheque_number: cheque.cheque_number || "-",
                        type: cheque.type,
                        account: cheque.account_name,
                        amount: cheque.amount,
                        due_date: cheque.cheque_due_date
                            ? formatDate(cheque.cheque_due_date)
                            : "-",
                        status: cheque.status,
                    }))
                );
            } else {
                toast.error("Failed to fetch pending cheques.");
            }
        } catch (error) {
            console.log("Error fetching cheques:", error);
            toast.error("Failed to fetch pending cheques.");
        }
    };

    const handleMarkCleared = async () => {
        if (selectedRows.length !== 1) return;
        try {
            const success = await markChequeCleared(token, selectedRows[0]);
            if (success) {
                toast.success("Cheque marked cleared. It now affects your balance.");
                setSelectedRows([]);
                await fetchCheques();
            } else {
                toast.error("Failed to mark the cheque cleared.");
            }
        } catch (error) {
            console.log(error);
            toast.error("Failed to mark the cheque cleared.");
        }
    };

    const handleMarkBounced = async () => {
        if (selectedRows.length !== 1) return;
        try {
            const success = await markChequeBounced(token, selectedRows[0]);
            if (success) {
                toast.success("Cheque marked bounced.");
                setSelectedRows([]);
                await fetchCheques();
            } else {
                toast.error("Failed to mark the cheque bounced.");
            }
        } catch (error) {
            console.log(error);
            toast.error("Failed to mark the cheque bounced.");
        }
    };

    useEffect(() => {
        fetchCheques();
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
                                <h1 className="text-2xl font-semibold">Cheques</h1>
                                <p className="text-sm text-muted-foreground">
                                    Cheques waiting to clear. Only cleared cheques affect balances.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-card rounded-lg p-6 border">
                            <div className="text-sm text-muted-foreground mb-2">
                                Pending Cheques
                            </div>
                            <div className="text-3xl font-bold">
                                {chequesData?.length || 0}
                            </div>
                        </div>
                        <div className="bg-card rounded-lg p-6 border">
                            <div className="text-sm text-muted-foreground mb-2">
                                Pending Value
                            </div>
                            <div className="text-3xl font-bold">
                                {formatCurrency(totalPending)}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end space-x-3">
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center space-x-2"
                            disabled={selectedRows.length !== 1 || !permissions?.["edit"]}
                            onClick={handleMarkCleared}
                        >
                            {permissions?.["edit"] ? (
                                <CheckCircle2 className="w-4 h-4" />
                            ) : (
                                <Lock className="w-4 h-4" />
                            )}
                            <span>Mark Cleared</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center space-x-2"
                            disabled={selectedRows.length !== 1 || !permissions?.["edit"]}
                            onClick={handleMarkBounced}
                        >
                            {permissions?.["edit"] ? (
                                <XCircle className="w-4 h-4" />
                            ) : (
                                <Lock className="w-4 h-4" />
                            )}
                            <span>Mark Bounced</span>
                        </Button>
                    </div>

                    {chequesData && chequesData.length > 0 ? (
                        <DataTable
                            columns={cols}
                            data={permissions?.["view"] ? chequesData : null}
                            selectedRows={selectedRows}
                            onRowClick={toggleRowSelection}
                        />
                    ) : (
                        <div className="bg-card rounded-lg p-6 border">
                            <p className="text-sm text-muted-foreground">
                                No cheques are pending right now.
                            </p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default Cheques;
