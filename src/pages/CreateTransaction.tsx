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
    salesInvoicesAPIPackage,
    purchaseInvoicesAPIPackage,
    getOpeningBalances,
} from "../../services/api";
import { useAuth } from "../../services/AuthProvider";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import {
    createIdMap,
    TransactionTypeGroups,
    TransactionTypeMap,
    PaymentMethodMap,
    MethodsForAccountType,
    ReferenceForType,
    ExpenseCategoryMap,
    formatAccountOption,
    formatInvoiceOption,
    formatPartyBalanceOption,
    pendingInvoicesOnly,
    todayForInput,
} from "../../services/utils";
import { SubmitButton } from "@/components/ui/submit-button";
import { usePending } from "@/hooks/use-pending";
import { Combobox } from "@/components/ui/combobox";

// Dropdown rows keyed by id, as createIdMap returns them. Typed loosely
// because each picker holds a different shape - an account, a party or an
// invoice - and only the render function knows which.
type PickerOption = Record<string, unknown>;
type PickerOptions = Record<string, PickerOption>;

const CreateTransaction = () => {
  const { pending, run } = usePending();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
    const [accounts, setAccounts] = useState({});
    const [customers, setCustomers] = useState({});
    const [suppliers, setSuppliers] = useState({});
    const [salesInvoices, setSalesInvoices] = useState({});
    const [purchaseInvoices, setPurchaseInvoices] = useState({});
    const [accountsLoading, setAccountsLoading] = useState(true);
    const [customersLoading, setCustomersLoading] = useState(true);
    const [suppliersLoading, setSuppliersLoading] = useState(true);
    const [salesInvoicesLoading, setSalesInvoicesLoading] = useState(true);
    const [purchaseInvoicesLoading, setPurchaseInvoicesLoading] = useState(true);
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
            sales_invoice: "",
            purchase_invoice: "",
            expense_name: "",
            expense_category: "",
        },
    });

    const selectedType = watch("type");
    const selectedMethod = watch("payment_method");
    const selectedAccountId = watch("account");

    // One rule decides the cell beside Type: what does this type refer to?
    // Types absent from the map refer to nothing, and Type spans the row.
    const referenceKind = ReferenceForType[selectedType] || null;
    const isTransfer = referenceKind === "transfer_account";
    const isCheque = selectedMethod === "cheque";

    const selectedAccount = accounts[selectedAccountId];
    // Cash does not leave a cash account by bank transfer, and a cheque is
    // drawn on a bank. Before a type is picked, offer everything.
    const allowedMethods =
        MethodsForAccountType[selectedAccount?.type] || Object.keys(PaymentMethodMap);

    // The method has to follow the account. Picking a bank account while
    // "Cash" is selected would otherwise submit a combination the account
    // cannot produce.
    useEffect(() => {
        if (!selectedAccount) return;
        if (!allowedMethods.includes(selectedMethod)) {
            setValue("payment_method", allowedMethods[0]);
        }
    }, [selectedAccountId, selectedAccount, allowedMethods, selectedMethod, setValue]);

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

            // Only the reference this type actually has. Sending a stale key
            // from a previously chosen type would link the wrong record.
            if (referenceKind === "transfer_account" && data.transfer_account) {
                formData.append("transfer_account", data.transfer_account);
            }
            if (referenceKind === "customer" && data.customer) {
                formData.append("customer", data.customer);
            }
            if (referenceKind === "supplier" && data.supplier) {
                formData.append("supplier", data.supplier);
            }
            if (referenceKind === "sales_invoice" && data.sales_invoice) {
                formData.append("sales_invoice", data.sales_invoice);
            }
            if (referenceKind === "purchase_invoice" && data.purchase_invoice) {
                formData.append("purchase_invoice", data.purchase_invoice);
            }
            if (referenceKind === "expense") {
                if (data.expense_name) formData.append("expense_name", data.expense_name);
                if (data.expense_category) {
                    formData.append("expense_category", data.expense_category);
                }
            }

            if (isCheque) {
                if (data.cheque_number) formData.append("cheque_number", data.cheque_number);
                if (data.cheque_due_date) formData.append("cheque_due_date", data.cheque_due_date);
            }
            if (data.reference) formData.append("reference", data.reference);
            if (data.notes) formData.append("notes", data.notes);
            if (imageFile) formData.append("image", imageFile);

            // ok is true only when the server returned an id, so a write that
            // failed can no longer be reported as success.
            const result = await createTransaction(token, formData);
            if (result.ok) {
                toast.success("Transaction recorded successfully!");
                navigate("/accounting");
            } else if (result.error) {
                // null means the interceptor already toasted (403).
                toast.error(result.error);
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
            } finally {
                setAccountsLoading(false);
            }
        };

        const fetchCustomers = async () => {
            try {
                // Unsettled OPENING balances, same rule as suppliers. A
                // customer payment settles the khaata balance carried across
                // at onboarding; money owed on a sales invoice is settled by
                // paying that invoice.
                const res = await getOpeningBalances(token, "customer");
                if (res?.parties) {
                    setCustomers(createIdMap(res.parties));
                }
            } catch (error) {
                console.log("Error fetching customers:", error);
            } finally {
                setCustomersLoading(false);
            }
        };

        const fetchSuppliers = async () => {
            try {
                // Unsettled OPENING balances, not payables. A supplier payment
                // settles the khaata balance carried across at onboarding;
                // money owed against a purchase invoice is settled by paying
                // that invoice. Payables mixes the two, so it listed suppliers
                // with nothing for this payment to settle.
                const res = await getOpeningBalances(token, "supplier");
                if (res?.parties) {
                    setSuppliers(createIdMap(res.parties));
                }
            } catch (error) {
                console.log("Error fetching suppliers:", error);
            } finally {
                setSuppliersLoading(false);
            }
        };

        // Only invoices that still owe something: a fully paid invoice cannot
        // take another payment, and offering it only invites the 400.
        const fetchSalesInvoices = async () => {
            try {
                const res = await salesInvoicesAPIPackage.list(token);
                if (res) setSalesInvoices(pendingInvoicesOnly(createIdMap(res)));
            } catch (error) {
                console.log("Error fetching sales invoices:", error);
            } finally {
                setSalesInvoicesLoading(false);
            }
        };

        const fetchPurchaseInvoices = async () => {
            try {
                const res = await purchaseInvoicesAPIPackage.list(token);
                if (res) setPurchaseInvoices(pendingInvoicesOnly(createIdMap(res)));
            } catch (error) {
                console.log("Error fetching purchase invoices:", error);
            } finally {
                setPurchaseInvoicesLoading(false);
            }
        };

        fetchAccounts();
        fetchCustomers();
        fetchSuppliers();
        fetchSalesInvoices();
        fetchPurchaseInvoices();
    }, [token]);

    /**
     * The cell beside Type. One place decides it, so the create and update
     * screens cannot drift apart on what a type refers to.
     */
    const renderReferenceCell = () => {
        if (!referenceKind) return null;

        // An expense needs both a name and a category, so this row carries
        // three inputs rather than the usual two.
        if (referenceKind === "expense") {
            return (
                <>
                    <div className="flex-1 space-y-1">
                        <Label htmlFor="expense_name">Expense Name</Label>
                        <Input
                            id="expense_name"
                            type="text"
                            placeholder="e.g. Shop rent, Diesel"
                            {...register("expense_name")}
                        />
                    </div>
                    <div className="flex-1 space-y-1">
                        <Label htmlFor="expense_category">Expense Type</Label>
                        <Controller
                            name="expense_category"
                            control={control}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(ExpenseCategoryMap).map(([key, label]) => (
                                            <SelectItem value={key} key={key}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>
                </>
            );
        }

        // Every picker here is filtered to rows that still need settling, so
        // an empty one is normal rather than broken - and has to say why.
        const config = {
            customer: {
                name: "customer" as const,
                label: "Customer",
                placeholder: "Select customer",
                empty: "No customers with pending balances",
                options: customers as PickerOptions,
                loading: customersLoading,
                render: formatPartyBalanceOption,
            },
            supplier: {
                name: "supplier" as const,
                label: "Supplier",
                placeholder: "Select supplier",
                empty: "No suppliers with pending balances",
                options: suppliers as PickerOptions,
                loading: suppliersLoading,
                render: formatPartyBalanceOption,
            },
            sales_invoice: {
                name: "sales_invoice" as const,
                label: "Sales Invoice",
                placeholder: "Select invoice",
                empty: "No sales invoices with pending payments",
                options: salesInvoices as PickerOptions,
                loading: salesInvoicesLoading,
                render: formatInvoiceOption,
            },
            purchase_invoice: {
                name: "purchase_invoice" as const,
                label: "Purchase Invoice",
                placeholder: "Select invoice",
                empty: "No purchase invoices with pending payments",
                options: purchaseInvoices as PickerOptions,
                loading: purchaseInvoicesLoading,
                render: formatInvoiceOption,
            },
            transfer_account: {
                name: "transfer_account" as const,
                label: "Transfer To",
                placeholder: "Select destination account",
                empty: "No other accounts to transfer to",
                options: accounts as PickerOptions,
                loading: accountsLoading,
                render: formatAccountOption,
            },
        }[referenceKind];

        if (!config) return null;

        // Shown on the trigger, so the reason is visible without opening the
        // dropdown onto an empty box.
        const isEmpty = Object.keys(config.options).length === 0;
        const referenceOptions = Object.entries(config.options).map(([key, item]) => ({
            value: String(key),
            label: config.render(item),
        }));

        return (
            <div className="flex-1 space-y-1">
                <Label htmlFor={config.name}>{config.label}</Label>
                <Controller
                    name={config.name}
                    control={control}
                    render={({ field }) => (
                        <Combobox
                            options={referenceOptions}
                            value={field.value}
                            onChange={field.onChange}
                            loading={config.loading}
                            // Still loading is not the same as nothing to pick, and
                            // these lists are filtered to what can actually be
                            // settled - so an empty one is a real answer and says
                            // which. The reason shows on the field as well as in the
                            // popup, because it decides whether to open it at all.
                            placeholder={
                                config.loading || !isEmpty ? config.placeholder : config.empty
                            }
                            emptyText={config.empty}
                            notFoundText="No match."
                        />
                    )}
                />
            </div>
        );
    };

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
                        onSubmit={handleSubmit(run(onTransactionCreate))}
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

                                    {/* Whatever this type refers to sits here, beside Type.
                                        When it refers to nothing, Type spans the row. */}
                                    {renderReferenceCell()}
                                </div>

                                {/* Payment Method belongs next to the account it has to
                                    agree with, not a column away. */}
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
                                                        {allowedMethods.map((key) => (
                                                            <SelectItem value={key} key={key}>
                                                                {PaymentMethodMap[key]}
                                                            </SelectItem>
                                                        ))}
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
                            {/* First Column — Payment Method and the reference cell both
                                moved up beside the fields they belong with. */}
                            <div className="flex flex-col flex-1">
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
                                    <SubmitButton type="submit" pending={pending} pendingLabel="Creating…">Record Transaction</SubmitButton>
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
