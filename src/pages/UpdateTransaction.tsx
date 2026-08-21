import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import {
    transactionsAPIPackage,
    updateTransaction,
    moneyAccountsAPIPackage,
} from "../../services/api";
import { useAuth } from "../../services/AuthProvider";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import {
    createIdMap,
    getImageUrl,
    TransactionTypeGroups,
    TransactionTypeMap,
    PaymentMethodMap,
    TransactionStatusMap,
    formatAccountOption,
} from "../../services/utils";

const UpdateTransaction = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
    const [accounts, setAccounts] = useState({});
    const [imageFile, setImageFile] = useState(null);
    const [existingImageUrl, setExistingImageUrl] = useState(null);
    const [isSourceLinked, setIsSourceLinked] = useState(false);
    const { token } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const transaction_id = location.state?.transaction_id || null;

    const { register, handleSubmit, control, watch, reset } = useForm({
        defaultValues: {
            type: "",
            amount: 0,
            date: "",
            account: "",
            transfer_account: "",
            payment_method: "cash",
            status: "C",
            reference: "",
            notes: "",
            cheque_number: "",
            cheque_due_date: "",
        },
    });

    const selectedType = watch("type");
    const selectedMethod = watch("payment_method");
    const isTransfer = selectedType === "transfer";
    const isCheque = selectedMethod === "cheque";

    // Active accounts only, plus whichever this transaction already uses — a
    // deactivated account takes no new money but stays visible on its history.
    const selectableAccounts = (currentValue) =>
        Object.entries(accounts).filter(
            ([key, account]: any) =>
                account.is_active || String(key) === String(currentValue)
        );

    const onTransactionUpdate = async (data) => {
        if (isSourceLinked) return;

        try {
            const formData = new FormData();
            formData.append("type", data.type);
            formData.append("amount", String(Math.round(Number(data.amount))));
            formData.append("date", data.date);
            formData.append("account", data.account);
            formData.append("payment_method", data.payment_method);
            formData.append("status", data.status);

            if (isTransfer && data.transfer_account) {
                formData.append("transfer_account", data.transfer_account);
            }
            if (isCheque) {
                if (data.cheque_number) formData.append("cheque_number", data.cheque_number);
                if (data.cheque_due_date) formData.append("cheque_due_date", data.cheque_due_date);
            }
            if (data.reference) formData.append("reference", data.reference);
            if (data.notes) formData.append("notes", data.notes);
            if (imageFile) formData.append("image", imageFile);

            const success = await updateTransaction(token, transaction_id, formData);
            if (success) {
                toast.success("Transaction updated successfully!");
                navigate("/accounting");
            } else {
                toast.error("Failed to update transaction.");
            }
        } catch (error) {
            console.log("Error updating transaction:", error);
            toast.error("Failed to update transaction.");
        }
    };

    useEffect(() => {
        const fetchAccounts = async () => {
            try {
                const res = await moneyAccountsAPIPackage.list(token);
                if (res) {
                    setAccounts(createIdMap(res));
                } else {
                    toast.error("Failed to fetch money accounts.");
                }
            } catch (error) {
                console.log("Error fetching money accounts:", error);
                toast.error("Failed to fetch money accounts.");
            }
        };

        const fetchTransaction = async () => {
            if (!token) return;
            if (!transaction_id) return;
            try {
                const transaction = await transactionsAPIPackage.detail(token, transaction_id);
                if (transaction) {
                    setIsSourceLinked(transaction.is_source_linked);
                    setExistingImageUrl(getImageUrl(transaction.image) || null);
                    reset({
                        type: transaction.type || "",
                        amount: transaction.amount || 0,
                        date: transaction.date || "",
                        account: transaction.account ? String(transaction.account.id) : "",
                        transfer_account: transaction.transfer_account
                            ? String(transaction.transfer_account.id)
                            : "",
                        payment_method: transaction.payment_method || "cash",
                        status: transaction.status || "C",
                        reference: transaction.reference || "",
                        notes: transaction.notes || "",
                        cheque_number: transaction.cheque_number || "",
                        cheque_due_date: transaction.cheque_due_date || "",
                    });
                } else {
                    toast.error("Failed to fetch transaction.");
                    navigate("/accounting");
                }
            } catch (error) {
                console.log(error);
                toast.error("Failed to fetch transaction.");
                navigate("/accounting");
            }
        };

        fetchAccounts();
        fetchTransaction();
    }, [token, transaction_id]);

    return (
        <div className="min-h-screen bg-background">
            <Sidebar onCollapseChange={setSidebarCollapsed} />
            <div
                className={`${sidebarCollapsed ? "ml-16" : "ml-64"
                    } transition-all duration-300 flex flex-col h-screen`}
            >
                <Header />

                <main className="flex-1 flex flex-col p-6 gap-6">
                    {/* Breadcrumb */}
                    <DynamicBreadCrumb />

                    {isSourceLinked && (
                        <div className="bg-card rounded-lg p-4 border">
                            <p className="text-sm text-muted-foreground">
                                This transaction came from an invoice payment or an expense.
                                Edit it from that record instead.
                            </p>
                        </div>
                    )}

                    <form
                        onSubmit={handleSubmit(onTransactionUpdate)}
                        className="flex flex-col flex-1 gap-4"
                    >
                        {/* Row One — both columns start together, so Reference lines up
                            with Type and Notes stretches to end level with Account. */}
                        <div className="flex gap-12">
                            {/* First Column */}
                            <div className="flex flex-col flex-1">
                                <h2 className="text-lg font-semibold mb-6">Transaction Details</h2>

                                <div className="flex gap-6 mb-6">
                                    <div className="flex-1 space-y-1">
                                        <Label htmlFor="type">Type</Label>
                                        <Controller
                                            name="type"
                                            control={control}
                                            render={({ field }) => (
                                                <Select
                                                    onValueChange={field.onChange}
                                                    value={field.value}
                                                    disabled={isSourceLinked}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select transaction type" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {Object.entries(TransactionTypeGroups).map(
                                                            ([group, types]) => (
                                                                <div key={group}>
                                                                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                                                        {group}
                                                                    </div>
                                                                    {types.map((type) => (
                                                                        <SelectItem value={type} key={type}>
                                                                            {TransactionTypeMap[type]}
                                                                        </SelectItem>
                                                                    ))}
                                                                </div>
                                                            )
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-6 mb-6">
                                    <div className="flex-1 space-y-1">
                                        <Label htmlFor="amount">Amount (PKR)</Label>
                                        <Input
                                            id="amount"
                                            type="number"
                                            disabled={isSourceLinked}
                                            {...register("amount")}
                                        />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <Label htmlFor="date">Date</Label>
                                        <Input
                                            id="date"
                                            type="date"
                                            disabled={isSourceLinked}
                                            {...register("date")}
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-6 mb-6">
                                    <div className="flex-1 space-y-1">
                                        <Label htmlFor="account">Account</Label>
                                        <Controller
                                            name="account"
                                            control={control}
                                            render={({ field }) => (
                                                <Select
                                                    onValueChange={field.onChange}
                                                    value={field.value}
                                                    disabled={isSourceLinked}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select account" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {selectableAccounts(field.value).map(([key, account]: any) => (
                                                            <SelectItem value={String(key)} key={key}>
                                                                {formatAccountOption(account)}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                    </div>
                                    {isTransfer && (
                                        <div className="flex-1 space-y-1">
                                            <Label htmlFor="transfer_account">Transfer To</Label>
                                            <Controller
                                                name="transfer_account"
                                                control={control}
                                                render={({ field }) => (
                                                    <Select
                                                        onValueChange={field.onChange}
                                                        value={field.value}
                                                        disabled={isSourceLinked}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select destination account" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {selectableAccounts(field.value).map(([key, account]: any) => (
                                                                <SelectItem value={String(key)} key={key}>
                                                                    {formatAccountOption(account)}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Second Column */}
                            <div className="flex flex-col flex-1">
                                <h2 className="text-lg font-semibold mb-6">Reference &amp; Notes</h2>

                                <div className="flex gap-6 mb-6">
                                    <div className="flex-1 space-y-1">
                                        <Label htmlFor="reference">Reference</Label>
                                        <Input
                                            id="reference"
                                            type="text"
                                            disabled={isSourceLinked}
                                            placeholder="Slip number, wallet transaction ID, etc."
                                            {...register("reference")}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col flex-1 mb-6 space-y-1">
                                    <Label htmlFor="notes">Notes</Label>
                                    <Textarea
                                        id="notes"
                                        className="flex-1"
                                        disabled={isSourceLinked}
                                        {...register("notes")}
                                        placeholder="Add any additional notes here..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Row Two — starts a fresh baseline, so Photo lines up with
                            Payment Method and Status. */}
                        <div className="flex gap-12">
                            {/* First Column */}
                            <div className="flex flex-col flex-1">
                                <div className="flex gap-6 mb-6">
                                    <div className="flex-1 space-y-1">
                                        <Label htmlFor="payment_method">Payment Method</Label>
                                        <Controller
                                            name="payment_method"
                                            control={control}
                                            render={({ field }) => (
                                                <Select
                                                    onValueChange={field.onChange}
                                                    value={field.value}
                                                    disabled={isSourceLinked}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select method" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {Object.entries(PaymentMethodMap).map(([key, label]) => (
                                                            <SelectItem value={key} key={key}>
                                                                {label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <Label htmlFor="status">Status</Label>
                                        <Controller
                                            name="status"
                                            control={control}
                                            render={({ field }) => (
                                                <Select
                                                    onValueChange={field.onChange}
                                                    value={field.value}
                                                    disabled={isSourceLinked}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select status" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {Object.entries(TransactionStatusMap).map(([key, label]) => (
                                                            <SelectItem value={key} key={key}>
                                                                {label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                    </div>
                                </div>

                                {isCheque && (
                                    <div className="flex gap-6 mb-6">
                                        <div className="flex-1 space-y-1">
                                            <Label htmlFor="cheque_number">Cheque Number</Label>
                                            <Input
                                                id="cheque_number"
                                                type="text"
                                                disabled={isSourceLinked}
                                                {...register("cheque_number")}
                                            />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <Label htmlFor="cheque_due_date">Due Date</Label>
                                            <Input
                                                id="cheque_due_date"
                                                type="date"
                                                disabled={isSourceLinked}
                                                {...register("cheque_due_date")}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Second Column */}
                            <div className="flex flex-col flex-1">
                                <div className="mb-6 space-y-1">
                                    <Label htmlFor="image">Photo</Label>
                                    {existingImageUrl && !imageFile && (
                                        <a
                                            href={existingImageUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <img
                                                src={existingImageUrl}
                                                alt="transaction"
                                                className="w-24 h-24 object-cover rounded border cursor-pointer hover:opacity-80"
                                            />
                                        </a>
                                    )}
                                    <input
                                        id="image"
                                        type="file"
                                        accept="image/*"
                                        disabled={isSourceLinked}
                                        onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Leave empty to keep the existing photo.
                                    </p>
                                </div>

                                <div className="flex justify-end mt-auto">
                                    <Button type="submit" disabled={isSourceLinked}>
                                        Update Transaction
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </form>
                </main>
            </div>
        </div>
    );
};

export default UpdateTransaction;
