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
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import {
    createTransaction,
    moneyAccountsAPIPackage,
    suppliersAPIPackage,
    getCustomersList,
} from "../../services/api";
import { useAuth } from "../../services/AuthProvider";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import {
    createIdMap,
    TransactionTypeGroups,
    TransactionTypeMap,
    PartyTransactionTypes,
    PaymentMethodMap,
    formatAccountOption,
    todayForInput,
} from "../../services/utils";

const CreateTransaction = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
    const [accounts, setAccounts] = useState({});
    const [customers, setCustomers] = useState({});
    const [suppliers, setSuppliers] = useState({});
    const [imageFile, setImageFile] = useState(null);
    const { token } = useAuth();
    const navigate = useNavigate();

    const { register, handleSubmit, control, watch, setValue } = useForm({
        defaultValues: {
            type: "",
            amount: 0,
            date: todayForInput(),
            account: "",
            transfer_account: "",
            payment_method: "cash",
            reference: "",
            notes: "",
            cheque_number: "",
            cheque_due_date: "",
            customer: "",
            supplier: "",
        },
    });

    const selectedType = watch("type");
    const selectedMethod = watch("payment_method");

    const isTransfer = selectedType === "transfer";
    const isCheque = selectedMethod === "cheque";
    const needsParty = PartyTransactionTypes.includes(selectedType);
    const isCustomerType = ["customer_receipt", "sales_return_refund"].includes(selectedType);

    const onTransactionCreate = async (data) => {
        if (!data.type) {
            toast.error("Please select a transaction type.");
            return;
        }
        if (!data.account) {
            toast.error("Please select the account this money moved through.");
            return;
        }

        try {
            const formData = new FormData();
            formData.append("type", data.type);
            formData.append("amount", String(Math.round(Number(data.amount))));
            formData.append("date", data.date);
            formData.append("account", data.account);
            formData.append("payment_method", data.payment_method);

            if (isTransfer && data.transfer_account) {
                formData.append("transfer_account", data.transfer_account);
            }
            if (isCheque) {
                if (data.cheque_number) formData.append("cheque_number", data.cheque_number);
                if (data.cheque_due_date) formData.append("cheque_due_date", data.cheque_due_date);
            }
            if (needsParty) {
                if (isCustomerType && data.customer) formData.append("customer", data.customer);
                if (!isCustomerType && data.supplier) formData.append("supplier", data.supplier);
            }
            if (data.reference) formData.append("reference", data.reference);
            if (data.notes) formData.append("notes", data.notes);
            if (imageFile) formData.append("image", imageFile);

            const success = await createTransaction(token, formData);
            if (success) {
                toast.success("Transaction recorded successfully!");
                navigate("/accounting");
            } else {
                toast.error("Failed to record transaction.");
            }
        } catch (error) {
            console.log("Error creating transaction:", error);
            toast.error("Failed to record transaction.");
        }
    };

    useEffect(() => {
        const fetchAccounts = async () => {
            try {
                // Deactivated accounts take no new money.
                const res = await moneyAccountsAPIPackage.list(token, "?is_active=true");
                if (res) {
                    setAccounts(createIdMap(res));
                    const defaultAccount = res.find((account) => account.is_default);
                    if (defaultAccount) setValue("account", String(defaultAccount.id));
                } else {
                    toast.error("Failed to fetch money accounts.");
                }
            } catch (error) {
                console.log("Error fetching money accounts:", error);
                toast.error("Failed to fetch money accounts.");
            }
        };

        const fetchCustomers = async () => {
            try {
                const res = await getCustomersList(token);
                if (res) {
                    setCustomers(createIdMap(res));
                }
            } catch (error) {
                console.log("Error fetching customers:", error);
            }
        };

        const fetchSuppliers = async () => {
            try {
                const res = await suppliersAPIPackage.list(token);
                if (res) {
                    setSuppliers(createIdMap(res));
                }
            } catch (error) {
                console.log("Error fetching suppliers:", error);
            }
        };

        fetchAccounts();
        fetchCustomers();
        fetchSuppliers();
    }, [token]);

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

                    <div className="bg-card rounded-lg p-4 border">
                        <p className="text-sm text-muted-foreground">
                            Record this only if the money actually moved. Goods given on credit
                            are recorded as an invoice, not here.
                        </p>
                    </div>

                    <form
                        onSubmit={handleSubmit(onTransactionCreate)}
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
                                                <Select onValueChange={field.onChange} value={field.value}>
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
                                        <Input id="amount" type="number" {...register("amount")} />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <Label htmlFor="date">Date</Label>
                                        <Input id="date" type="date" {...register("date")} />
                                    </div>
                                </div>

                                <div className="flex gap-6 mb-6">
                                    <div className="flex-1 space-y-1">
                                        <Label htmlFor="account">Account</Label>
                                        <Controller
                                            name="account"
                                            control={control}
                                            render={({ field }) => (
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select account" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {accounts && Object.keys(accounts).length > 0 && Object.entries(accounts).map(([key, account]: any) => (
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
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select destination account" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {accounts && Object.keys(accounts).length > 0 && Object.entries(accounts).map(([key, account]: any) => (
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
                                        {...register("notes")}
                                        placeholder="Add any additional notes here..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Row Two — starts a fresh baseline, so Photo lines up with
                            Payment Method. */}
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
                                                <Select onValueChange={field.onChange} value={field.value}>
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
                                    {needsParty && (
                                        <div className="flex-1 space-y-1">
                                            <Label htmlFor={isCustomerType ? "customer" : "supplier"}>
                                                {isCustomerType ? "Customer" : "Supplier"}
                                            </Label>
                                            <Controller
                                                name={isCustomerType ? "customer" : "supplier"}
                                                control={control}
                                                render={({ field }) => (
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <SelectTrigger>
                                                            <SelectValue
                                                                placeholder={`Select ${isCustomerType ? "customer" : "supplier"}`}
                                                            />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {Object.entries(
                                                                isCustomerType ? customers : suppliers
                                                            ).map(([key, party]: any) => (
                                                                <SelectItem value={String(key)} key={key}>
                                                                    {party.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            />
                                        </div>
                                    )}
                                </div>

                                {isCheque && (
                                    <div className="flex gap-6 mb-6">
                                        <div className="flex-1 space-y-1">
                                            <Label htmlFor="cheque_number">Cheque Number</Label>
                                            <Input
                                                id="cheque_number"
                                                type="text"
                                                {...register("cheque_number")}
                                            />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <Label htmlFor="cheque_due_date">Due Date</Label>
                                            <Input
                                                id="cheque_due_date"
                                                type="date"
                                                {...register("cheque_due_date")}
                                            />
                                        </div>
                                    </div>
                                )}

                                {isCheque && (
                                    <p className="text-xs text-muted-foreground mb-6">
                                        A cheque stays pending until you mark it cleared. It does not
                                        change any balance before that.
                                    </p>
                                )}
                            </div>

                            {/* Second Column */}
                            <div className="flex flex-col flex-1">
                                <div className="mb-6 space-y-1">
                                    <Label htmlFor="image">Photo</Label>
                                    <input
                                        id="image"
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Optional. A photo of the slip or wallet confirmation.
                                    </p>
                                </div>

                                <div className="flex justify-end mt-auto">
                                    <Button type="submit">Record Transaction</Button>
                                </div>
                            </div>
                        </div>
                    </form>
                </main>
            </div>
        </div>
    );
};

export default CreateTransaction;
