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
import { expensesAPIPackage, moneyAccountsAPIPackage } from "../../services/api";
import { useAuth } from "../../services/AuthProvider"
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import { formatAccountOption, ExpenseCategoryMap, ExpenseCategoryLabels } from "../../services/utils";
import { InfoBox } from "@/components/ui/info-box";
import { SubmitButton } from "@/components/ui/submit-button";
import { usePending } from "@/hooks/use-pending";
import { Spinner } from "@/components/ui/spinner";

const UpdateExpense = () => {
  const { pending, run } = usePending();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
    // True until the record arrives, which the spinner beside the title
    // reports. A failure is the only thing that toasts.
    const [detailLoading, setDetailLoading] = useState(true);
    const [accounts, setAccounts] = useState([]);
    const { token, getPermissions } = useAuth();
    const hasAccounting = !!getPermissions("accounting")?.["view"];
    const navigate = useNavigate();
    const location = useLocation();
    const expense_id = location.state?.expense_id || null
    // Set when the expense is an extra charge on a sales invoice. The invoice
    // owns it and rebuilds it from its charges and payments, so it is shown
    // here but cannot be changed; the API refuses an edit as well.
    const [invoiceCharge, setInvoiceCharge] = useState(null)

    // react-hook-form setup
    const { register, handleSubmit, control, watch, reset, setValue } = useForm({
        defaultValues: {
            name: "",
            category: "",
            desc: "",
            amount: 0,
            account: "",
            date: "",
        },
    });

    const onExpenseUpdate = async (data) => {

        try {
            const payload: any = {
                name: data.name,
                category: data.category || null,
                desc: data.desc,
                amount: data.amount,
            };

            // Money details only mean something once accounting is enabled.
            if (hasAccounting) {
                if (data.account) payload.account = Number(data.account);
                if (data.date) payload.date = data.date;
            }

            const success = await expensesAPIPackage.update(token, expense_id, payload);

            if (success) {
                toast.success("Expense updated successfully!");
                navigate("/expenses");
            } else {
                toast.error("Failed to update expense.");
            }
        } catch (error) {
            console.log("Error updating expense:", error);
        }
    };

    const populateExpenseFields = (data) => {
        setInvoiceCharge(data.is_invoice_charge ? data.sales_invoice : null);
        reset({
            name: data.name,
            category: data.category || "",
            desc: data.desc || "",
            amount: data.amount || 0,
            // paid_from / paid_on come off the linked transaction. account and
            // date are write_only, so the detail response never carried them
            // and this used to hard-code "" - the account always looked unset.
            account: data.paid_from ? String(data.paid_from) : "",
            date: data.paid_on || (data.created_at ? data.created_at.split("T")[0] : ""),
        });
    };

    useEffect(() => {

        const fetchAccounts = async () => {
            if (!token || !hasAccounting) return;
            try {
                // Deactivated accounts take no new money.
                const res = await moneyAccountsAPIPackage.list(token, "?is_active=true");
                if (res) {
                    setAccounts(res);
                }
            } catch (error) {
                console.log("Error fetching money accounts:", error);
            }
        };

        const fetchExpense = async () => {
            if (!token) return;
            if (!expense_id) return;

            try {
                const expense = await expensesAPIPackage.detail(token, expense_id);
                if (expense) {
                    populateExpenseFields(expense);
                } else {
                    toast.error("Failed to fetch expense.");
                    navigate("/expenses");
                }
            } catch (error) {
                console.log(error);
                toast.error("Failed to fetch expense.");
                navigate("/expenses");
            }
        };

        const init = async () => {
            // Accounts FIRST, then the expense. Fired together, reset() lands
            // before the options exist and the Select falls back to its
            // placeholder with a value it cannot match.
            await fetchAccounts();
            fetchExpense().finally(() => setDetailLoading(false));
        };
        init();
    }, [token, expense_id]);


    return (
        <div className="min-h-screen bg-background">
            <Sidebar onCollapseChange={setSidebarCollapsed} />
            <div
                className={`${sidebarCollapsed ? "ml-16" : "ml-64"
                    } transition-all duration-300 flex flex-col`}
            >
                <Header />

                <main className="flex-1 p-6 space-y-6">
                    {/* Breadcrumb */}
                    <DynamicBreadCrumb />

                    <div className="flex items-center justify-between">
                        <form
                            onSubmit={handleSubmit(run(onExpenseUpdate))}
                            className="flex flex-row w-[48%] gap-12"
                        >
                            {/* First Column */}
                            <div className="flex flex-col flex-wrap flex-1">
                                <h2 className="flex items-center gap-3 text-lg font-semibold mb-6">Update Expense{detailLoading && <Spinner size={18} label="Loading" color="hsl(var(--spinner))" />}</h2>

                                {invoiceCharge && (
                                    <InfoBox className="mb-6">
                                        This is an extra charge on sales invoice #{invoiceCharge}, recorded
                                        when the invoice was paid. Change or remove the charge on the invoice.
                                    </InfoBox>
                                )}

                                {/* display: contents keeps the layout as it was; disabled
                                    locks every field inside for an invoice's charge. */}
                                <fieldset disabled={!!invoiceCharge} className="contents">

                                <div className="flex gap-6 mb-6">
                                    <div className="flex-1 space-y-1">
                                        <Label htmlFor="name">Name</Label>
                                        <Input id="name" type="text" {...register("name")} />
                                    </div>
                                </div>

                                <div className="mb-6 space-y-1">
                                    <Label>Category</Label>
                                    <Controller
                                        name="category"
                                        control={control}
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select category" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {/* The charge category only appears for a charge
                                                        expense, so its value has a label to match. */}
                                                    {Object.entries(invoiceCharge ? ExpenseCategoryLabels : ExpenseCategoryMap).map(([key, label]) => (
                                                        <SelectItem value={key} key={key}>
                                                            {label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </div>

                                <div className="mb-6 space-y-1">
                                    <Label htmlFor="desc">Description</Label>
                                    <Textarea
                                        id="desc"
                                        {...register("desc")}
                                        placeholder="Enter expense details here"
                                        rows={3}
                                    />
                                </div>

                                <div className="flex gap-6 mb-6">
                                    <div className="flex-1 space-y-1">
                                        <Label htmlFor="amount">Amount</Label>
                                        <Input id="amount" type="text" {...register("amount")} />
                                    </div>
                                </div>

                                {hasAccounting && (
                                    <div className="flex gap-6 mb-6">
                                        <div className="flex-1 space-y-1">
                                            <Label>Paid From</Label>
                                            <Controller
                                                name="account"
                                                control={control}
                                                render={({ field }) => (
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select account" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {accounts.map((account: any) => (
                                                                <SelectItem value={String(account.id)} key={account.id}>
                                                                    {formatAccountOption(account)}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <Label htmlFor="date">Date</Label>
                                            <Input id="date" type="date" {...register("date")} />
                                        </div>
                                    </div>
                                )}

                                </fieldset>

                                {!invoiceCharge && (
                                    <div className="flex justify-end gap-3 mt-auto">
                                        <SubmitButton type="submit" pending={pending} pendingLabel="Updating…">Update Expense</SubmitButton>
                                    </div>
                                )}
                            </div>
                        </form>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default UpdateExpense;
