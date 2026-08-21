import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import DataTable from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Plus, Edit, Power, Star, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../services/AuthProvider";
import {
    moneyAccountsAPIPackage,
    toggleMoneyAccountActive,
    setDefaultMoneyAccount,
} from "../../services/api";
import { AccountTypeMap } from "../../services/utils";

const formatCurrency = (amount) => `PKR ${Number(amount || 0).toLocaleString()}`;

const cols = [
    { key: "id", label: "ID" },
    {
        key: "name",
        label: "Name",
        render: (value, row) => (
            <span className="flex items-center gap-2">
                {value}
                {row.is_default && (
                    <span className="px-2 py-0.25 rounded-full text-xs font-medium whitespace-nowrap bg-blue-100 text-blue-700">
                        Default
                    </span>
                )}
            </span>
        ),
    },
    {
        key: "type",
        label: "Type",
        render: (value) => AccountTypeMap[value] || value,
    },
    {
        key: "opening_balance",
        label: "Opening Balance",
        render: (value) => formatCurrency(value),
    },
    {
        key: "balance",
        label: "Current Balance",
        render: (value) => (
            <span className="font-medium">{formatCurrency(value)}</span>
        ),
    },
    {
        key: "is_active",
        label: "Status",
        render: (value) => (
            <span
                className={`px-2 py-0.25 rounded-full text-xs font-medium whitespace-nowrap ${value ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                    }`}
            >
                {value ? "Active" : "Inactive"}
            </span>
        ),
    },
];

const defaultForm = () => ({
    name: "",
    type: "cash",
    opening_balance: 0,
});

const MoneyAccounts = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
    const [selectedRows, setSelectedRows] = useState([]);
    const [accountsData, setAccountsData] = useState(null);
    const [isDeleted, setIsDeleted] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(defaultForm());
    const [isLoading, setIsLoading] = useState(false);
    const { token, getPermissions } = useAuth();
    const permissions = getPermissions("accounting");
    const navigate = useNavigate();

    const toggleRowSelection = (id: string) => {
        setSelectedRows((prev) =>
            prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
        );
    };

    const selectedAccount =
        selectedRows.length === 1
            ? (accountsData || []).find((item) => item.id === selectedRows[0])
            : null;

    const fetchAccounts = async () => {
        if (!token) return;
        try {
            const res = await moneyAccountsAPIPackage.list(token);
            if (res) {
                setAccountsData(res);
            } else {
                toast.error("Failed to fetch money accounts.");
            }
        } catch (error) {
            console.log("Error fetching money accounts:", error);
            toast.error("Failed to fetch money accounts.");
        }
    };

    const openCreateDialog = () => {
        setEditingId(null);
        setForm(defaultForm());
        setDialogOpen(true);
    };

    const openEditDialog = () => {
        if (selectedRows.length !== 1) return;
        const account = accountsData?.find(
            (item) => String(item.id) === String(selectedRows[0])
        );
        if (!account) return;

        setEditingId(account.id);
        setForm({
            name: account.name,
            type: account.type,
            opening_balance: account.opening_balance,
        });
        setDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (!form.name) {
            toast.error("Please enter an account name.");
            return;
        }

        setIsLoading(true);
        try {
            const payload = {
                name: form.name,
                type: form.type,
                opening_balance: Math.round(Number(form.opening_balance)),
            };

            const success = editingId
                ? await moneyAccountsAPIPackage.update(token, editingId, payload)
                : await moneyAccountsAPIPackage.create(token, payload);

            if (success) {
                toast.success(editingId ? "Account updated." : "Account created.");
                setDialogOpen(false);
                setSelectedRows([]);
                await fetchAccounts();
            } else {
                toast.error("Failed to save the account.");
            }
        } catch (error) {
            console.log("Error saving money account:", error);
            toast.error("Failed to save the account.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleActive = async () => {
        if (!selectedAccount) return;

        try {
            const success = await toggleMoneyAccountActive(token, selectedAccount.id);
            if (success) {
                toast.success(
                    selectedAccount.is_active ? "Account deactivated." : "Account activated."
                );
                setSelectedRows([]);
                await fetchAccounts();
            } else {
                toast.error("Failed to update the account.");
            }
        } catch (error) {
            console.log("Error toggling money account:", error);
            toast.error("Failed to update the account.");
        }
    };

    const handleSetDefault = async () => {
        if (!selectedAccount) return;

        try {
            const success = await setDefaultMoneyAccount(token, selectedAccount.id);
            if (success) {
                toast.success("Default account updated.");
                setSelectedRows([]);
                await fetchAccounts();
            } else {
                toast.error("Failed to set the default account.");
            }
        } catch (error) {
            console.log("Error setting default money account:", error);
            toast.error("Failed to set the default account.");
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, [token, isDeleted]);

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
                                <h1 className="text-2xl font-semibold">Money Accounts</h1>
                                <p className="text-sm text-muted-foreground">
                                    Where the shop's money sits &mdash; cash, wallet and bank.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end space-x-3">
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center space-x-2"
                            disabled={!permissions?.["create"]}
                            onClick={openCreateDialog}
                        >
                            {permissions?.["create"] ? (
                                <Plus className="w-4 h-4" />
                            ) : (
                                <Lock className="w-4 h-4" />
                            )}
                            <span>Add Account</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center space-x-2"
                            disabled={selectedRows.length !== 1 || !permissions?.["edit"]}
                            onClick={openEditDialog}
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
                            disabled={
                                !selectedAccount ||
                                !permissions?.["edit"] ||
                                !selectedAccount.is_active ||
                                selectedAccount.is_default
                            }
                            onClick={handleSetDefault}
                        >
                            {permissions?.["edit"] ? (
                                <Star className="w-4 h-4" />
                            ) : (
                                <Lock className="w-4 h-4" />
                            )}
                            <span>Set as Default</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center space-x-2"
                            disabled={
                                !selectedAccount ||
                                !permissions?.["edit"] ||
                                (selectedAccount.is_active && selectedAccount.is_system)
                            }
                            onClick={handleToggleActive}
                        >
                            {permissions?.["edit"] ? (
                                <Power className="w-4 h-4" />
                            ) : (
                                <Lock className="w-4 h-4" />
                            )}
                            <span>
                                {selectedAccount && !selectedAccount.is_active
                                    ? "Activate"
                                    : "Deactivate"}
                            </span>
                        </Button>
                    </div>

                    {accountsData && accountsData.length > 0 ? (
                        <DataTable
                            columns={cols}
                            data={permissions?.["view"] ? accountsData : null}
                            selectedRows={selectedRows}
                            onRowClick={toggleRowSelection}
                        />
                    ) : null}

                    <p className="text-xs text-muted-foreground">
                        Deactivating an account keeps its history but stops new money going
                        into it. The default account is preselected on every payment and
                        transaction; if you deactivate it, the account your business was
                        created with becomes the default again. That account cannot be
                        deactivated.
                    </p>
                </main>
            </div>

            {/* Create / Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {editingId ? "Edit Money Account" : "Add Money Account"}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-5 py-2">
                        <div className="space-y-1">
                            <Label>Name</Label>
                            <Input
                                value={form.name}
                                onChange={(e) =>
                                    setForm((prev) => ({ ...prev, name: e.target.value }))
                                }
                                placeholder="Cash"
                            />
                        </div>

                        <div className="space-y-1">
                            <Label>Type</Label>
                            <Select
                                value={form.type}
                                onValueChange={(value) =>
                                    setForm((prev) => ({ ...prev, type: value }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(AccountTypeMap).map(([key, label]) => (
                                        <SelectItem value={key} key={key}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label>Opening Balance (PKR)</Label>
                            <Input
                                type="number"
                                value={form.opening_balance}
                                onChange={(e) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        opening_balance: e.target.value,
                                    }))
                                }
                            />
                            <p className="text-xs text-muted-foreground">
                                The money already in this account when you started using MarketPro.
                            </p>
                        </div>

                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={isLoading}>
                            {isLoading ? "Saving…" : editingId ? "Save Changes" : "Create Account"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default MoneyAccounts;
