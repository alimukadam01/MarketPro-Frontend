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
import { MetricCard } from "@/components/dashboard/MetricCard";
import PartyLedgerSection from "@/components/ui/party-ledger";
import PartyActions from "@/components/ui/party-actions";
import RecordPaymentDialog from "@/components/ui/record-payment-dialog";
import SaveStatus from "@/components/ui/save-status";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import { ArrowLeft, Plus } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import {
    createIdMap,
    formatCurrency,
    formatDate,
    isWalkInCustomer,
    todayForInput,
} from "../../services/utils";
import { useAuth } from "../../services/AuthProvider";
import {
    getCitiesList,
    getCustomerDetail,
    getCustomerSummary,
    getPartyLedger,
    getSettleableItems,
    saveOpeningBalance,
} from "../../services/api";
import { useFieldPatch } from "@/hooks/use-field-patch";

const ViewCustomer = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
    const [cities, setCities] = useState([]);
    // Walk-in invoices are recognised by this customer's name, so it is the
    // one field on this page that cannot be edited.
    const [isWalkIn, setIsWalkIn] = useState(false);
    const [summary, setSummary] = useState(null);
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [ledger, setLedger] = useState(null);
    const [opening, setOpening] = useState(null);
    const [openingLoading, setOpeningLoading] = useState(true);
    const [openingAmount, setOpeningAmount] = useState("");
    const [openingDate, setOpeningDate] = useState(todayForInput());
    const [savingOpening, setSavingOpening] = useState(false);
    const [payOpen, setPayOpen] = useState(false);
    const { token, getPermissions } = useAuth();
    const permissions = getPermissions("customers");
    const accountingPermissions = getPermissions("accounting");
    const canSeeAccounting = !!accountingPermissions?.["view"];
    const navigate = useNavigate();
    const location = useLocation();
    const customer_id = location.state?.customer_id || null;

    const endpoint = `/customers/${customer_id}/`;
    const { patchField, status, retry } = useFieldPatch(token);

    const { register, control, reset, watch } = useForm({
        defaultValues: {
            name: "",
            phone: "",
            email: "",
            city: "",
            address: "",
            notes: "",
        },
    });

    const populateCustomerFields = (data) => {
        setIsWalkIn(isWalkInCustomer(data));
        reset({
            name: data.name || "",
            phone: data.phone || "",
            email: data.email || "",
            city: data.city ? String(data.city) : "",
            address: data.address || "",
            notes: data.notes || "",
        });
    };

    // The ledger is accounting data, so it is only ever fetched for users who
    // are allowed to see it. Everyone else stops at the cards.
    const fetchLedger = async (dateFrom = "", dateTo = "") => {
        if (!token || !customer_id) return;
        if (!canSeeAccounting) return;

        try {
            const res = await getPartyLedger(token, {
                customer_id,
                date_from: dateFrom,
                date_to: dateTo,
            });
            if (res) {
                setLedger(res);
            } else {
                toast.error("Failed to fetch the ledger.");
            }
        } catch (error) {
            console.log("Error fetching ledger:", error);
            toast.error("Failed to fetch the ledger.");
        }
    };

    const fetchSummary = async () => {
        if (!token || !customer_id) return;

        try {
            const res = await getCustomerSummary(token, customer_id);
            if (res) {
                setSummary(res);
            } else {
                toast.error("Failed to fetch customer summary.");
            }
        } catch (error) {
            console.log("Error fetching customer summary:", error);
            toast.error("Failed to fetch customer summary.");
        } finally {
            setSummaryLoading(false);
        }
    };

    // The opening balance is accounting data too. Its figures ride on the
    // settleable-items endpoint, which is the same source the payment dialog
    // reads, so the card and the dialog can never disagree.
    const fetchOpening = async () => {
        if (!token || !customer_id || !canSeeAccounting) return;

        try {
            const res = await getSettleableItems(token, { customerId: customer_id });
            if (res) {
                setOpening(res.opening_balance);
                setOpeningAmount(
                    res.opening_balance?.amount
                        ? String(res.opening_balance.amount)
                        : "",
                );
                // The STORED date, not today. Falling back to today made the
                // card misreport when the balance was taken, and re-saving
                // then moved as_of_date forward without the user asking.
                if (res.opening_balance?.as_of_date) {
                    setOpeningDate(res.opening_balance.as_of_date);
                }
            }
        } catch (error) {
            console.log("Error fetching opening balance:", error);
        } finally {
            setOpeningLoading(false);
        }
    };

    const onSaveOpening = async () => {
        setSavingOpening(true);
        try {
            const ok = await saveOpeningBalance(token, {
                customerId: customer_id,
                amount: Math.floor(Number(openingAmount) || 0),
                asOfDate: openingDate,
            });
            if (ok) {
                toast.success("Opening balance saved.");
                fetchOpening();
                fetchSummary();
                fetchLedger();
            } else {
                toast.error("Failed to save the opening balance.");
            }
        } catch (error) {
            console.log("Error saving opening balance:", error);
            toast.error("Failed to save the opening balance.");
        } finally {
            setSavingOpening(false);
        }
    };

    const onRecorded = () => {
        fetchSummary();
        fetchOpening();
        fetchLedger();
    };

    useEffect(() => {
        const fetchCities = async () => {
            try {
                const cities = await getCitiesList(token);
                if (cities) {
                    setCities(createIdMap(cities));
                } else {
                    toast.error("Failed to fetch cities");
                }
            } catch (error) {
                console.log("Error fetching cities:", error);
                toast.error("Failed to fetch cities");
            }
        };

        const fetchCustomer = async () => {
            if (!token) return;
            if (!customer_id) {
                navigate("/customers");
                return;
            }

            try {
                const customer = await getCustomerDetail(token, customer_id);
                if (customer) {
                    populateCustomerFields(customer);
                } else {
                    toast.error("Failed to fetch customer.");
                    navigate("/customers");
                }
            } catch (error) {
                console.log(error);
                toast.error("Failed to fetch customer.");
                navigate("/customers");
            }
        };

        fetchCities();
        fetchCustomer();
        fetchSummary();
        fetchOpening();
        fetchLedger();
    }, [token, customer_id]);

    const name = watch("name");
    const openingHint = !opening?.amount
        ? "Not set"
        : opening.remaining > 0
            ? `as of ${formatDate(openingDate)} · ${formatCurrency(opening.remaining)} of it still unsettled`
            : `as of ${formatDate(openingDate)} · settled in full`;

    return (
        <div className="min-h-screen bg-background">
            <Sidebar onCollapseChange={setSidebarCollapsed} />
            <div
                className={`${sidebarCollapsed ? "ml-16" : "ml-64"
                    } transition-all duration-300 flex flex-col`}
            >
                <Header />

                <main className="flex-1 p-6 space-y-6">
                    <DynamicBreadCrumb />

                    {/* The party's NAME is the page title now. It used to be an
                        input styled to look like a heading, which is why
                        editing it felt arbitrary. */}
                    <div className="flex items-start justify-between gap-6">
                        <div className="flex items-start space-x-3">
                            <ArrowLeft
                                className="w-5 h-5 mt-2 text-muted-foreground cursor-pointer hover:text-primary"
                                onClick={() => navigate("/customers")}
                            />
                            <div>
                                <h1 className="text-2xl font-semibold">
                                    {name || "Customer"}
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    {["Customer", watch("phone"), cities[watch("city")]?.name]
                                        .filter(Boolean)
                                        .join(" · ")}
                                </p>
                            </div>
                        </div>

                        {/* Statement needs the ledger, which this user may not
                            be allowed to see; the reminder only needs the
                            balance, which they always can. */}
                        <div className="flex items-center gap-3 shrink-0">
                            {canSeeAccounting && (
                                <Button onClick={() => setPayOpen(true)}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Record Payment
                                </Button>
                            )}
                            <PartyActions
                                name={name}
                                phone={summary?.whatsapp}
                                balance={summary?.balance}
                                ledger={ledger}
                                canShareStatement={canSeeAccounting}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <MetricCard
                            title="Outstanding Balance"
                            value={formatCurrency(summary?.balance)}
                            loading={summaryLoading}
                        />
                        <MetricCard
                            title="Total Business"
                            value={formatCurrency(summary?.total_business)}
                            loading={summaryLoading}
                        />
                        {canSeeAccounting && (
                            <MetricCard
                                title="Opening Balance"
                                value={formatCurrency(opening?.amount)}
                                hint={openingHint}
                                loading={openingLoading}
                            />
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                        {/* Customer details — autosaved, no submit button, and
                            it finally says whether the edit landed. */}
                        <div className="md:col-span-2 rounded-lg border bg-card p-6">
                            <div className="mb-4 flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-base font-semibold leading-5">
                                        Customer details
                                    </h2>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Changes save as you type.
                                    </p>
                                </div>
                                <SaveStatus status={status} onRetry={retry} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label htmlFor="name">Name</Label>
                                    <Input
                                        id="name"
                                        type="text"
                                        disabled={!permissions?.["edit"] || isWalkIn}
                                        {...register("name", {
                                            onChange: (e) =>
                                                patchField(endpoint, "name", e.target.value),
                                        })}
                            />
                                    {isWalkIn && (
                                        <p className="text-xs text-muted-foreground">
                                            The counter-sale customer. Its name is fixed so
                                            walk-in invoices stay recognisable.
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="phone">Phone</Label>
                                    <Input
                                        id="phone"
                                        type="text"
                                        disabled={!permissions?.["edit"]}
                                        {...register("phone", {
                                            onChange: (e) =>
                                                patchField(endpoint, "phone", e.target.value),
                                        })}
                        />
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="text"
                                        disabled={!permissions?.["edit"]}
                                        {...register("email", {
                                            onChange: (e) =>
                                                patchField(endpoint, "email", e.target.value),
                                        })}
                        />
                                </div>
                                <div className="space-y-1">
                                    <Label>City</Label>
                                    <Controller
                                        name="city"
                                        control={control}
                                        render={({ field }) => (
                                            <Select
                                                disabled={!permissions?.["edit"]}
                                                onValueChange={(val) => {
                                                    field.onChange(val);
                                                    patchField(endpoint, "city", val, 0);
                                                }}
                                                value={field.value}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="City" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {cities &&
                                                        Object.entries(cities).map(([key, city]) => (
                                                            <SelectItem value={key} key={key}>
                                                                {city.name}
                                                            </SelectItem>
                                                        ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="address">Address</Label>
                                    <Textarea
                                        id="address"
                                        rows={1}
                                        className="h-10 min-h-10 resize-none"
                                        disabled={!permissions?.["edit"]}
                                        {...register("address", {
                                            onChange: (e) =>
                                                patchField(endpoint, "address", e.target.value),
                                        })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="notes">Notes</Label>
                                    <Textarea
                                        id="notes"
                                        rows={1}
                                        className="h-10 min-h-10 resize-none"
                                        placeholder="Anything worth remembering"
                                        disabled={!permissions?.["edit"]}
                                        {...register("notes", {
                                            onChange: (e) =>
                                                patchField(endpoint, "notes", e.target.value),
                                        })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Opening balance, reachable from the party itself. It
                            used to live only on the accounting ledger screen,
                            which a party reached only by carrying an invoice. */}
                        {canSeeAccounting && (
                            <div className="flex flex-col rounded-lg border bg-card p-6">
                                <div className="mb-4">
                                    <h2 className="text-base font-semibold leading-5">
                                        Opening balance
                                    </h2>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        What they owed before MarketPro. Counts toward the
                                        balance, never toward this month's sales.
                                    </p>
                                </div>

                                <div className="flex flex-1 flex-col gap-4">
                                    <div className="space-y-1">
                                        <Label htmlFor="ob-amount">Amount (PKR)</Label>
                                        <Input
                                            id="ob-amount"
                                            type="number"
                                            min="0"
                                            step="1"
                                            value={openingAmount}
                                            onChange={(e) => setOpeningAmount(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="ob-date">Accurate as of</Label>
                                        <Input
                                            id="ob-date"
                                            type="date"
                                            value={openingDate}
                                            onChange={(e) => setOpeningDate(e.target.value)}
                                        />
                                    </div>
                                    <Button
                                        variant="outline"
                                        className="mt-auto w-full"
                                        disabled={savingOpening || !accountingPermissions?.["edit"]}
                                        onClick={onSaveOpening}
                                    >
                                        {savingOpening ? "Saving…" : "Save opening balance"}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {canSeeAccounting && (
                        <PartyLedgerSection
                            ledger={ledger}
                            onRangeApply={fetchLedger}
                            title="Customer Ledger"
                        />
                    )}

                    {canSeeAccounting && customer_id && (
                        <RecordPaymentDialog
                            party="customer"
                            partyId={customer_id}
                            partyName={name}
                            open={payOpen}
                            setOpen={setPayOpen}
                            onRecorded={onRecorded}
                        />
                    )}
                </main>
            </div>
        </div>
    );
};

export default ViewCustomer;
