import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { MetricCard } from "@/components/dashboard/MetricCard";
import PartyLedgerSection from "@/components/ui/party-ledger";
import PartyActions from "@/components/ui/party-actions";
import RecordPaymentDialog from "@/components/ui/record-payment-dialog";
import SaveStatus from "@/components/ui/save-status";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import { ArrowLeft, Plus } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { cn } from "@/lib/utils";
import {
    createIdMap,
    formatCurrency,
    formatDate,
    isWalkInCustomer,
    todayForInput,
} from "../../../services/utils";
import { useAuth } from "../../../services/AuthProvider";
import {
    getCitiesList,
    getCustomerDetail,
    getCustomerSummary,
    getPartyLedger,
    getSettleableItems,
    saveOpeningBalance,
    suppliersAPIPackage,
    getSupplierSummary,
} from "../../../services/api";
import { useFieldPatch } from "@/hooks/use-field-patch";

/**
 * Everything the two party screens do not disagree about.
 *
 * Only the leaves differ: which endpoint, which noun, and which argument name
 * the API wants the id under. Keeping them here rather than in branches through
 * the body is what stops the two screens drifting apart again - which is how
 * they got here, with one of them passing `loading` to the ledger and the other
 * not.
 */
const CONFIG = {
    customer: {
        noun: "Customer",
        listPath: "/customers",
        module: "customers",
        stateKey: "customer_id",
        endpoint: (id) => `/customers/${id}/`,
        fetchDetail: (token, id) => getCustomerDetail(token, id),
        fetchSummary: (token, id) => getCustomerSummary(token, id),
        ledgerArgs: (id) => ({ customer_id: id }),
        idArg: (id) => ({ customerId: id }),
        ledgerTitle: "Customer Ledger",
        openingBlurb:
            "What they owed before MarketPro. Counts toward the balance, never toward this month's sales.",
    },
    supplier: {
        noun: "Supplier",
        listPath: "/suppliers",
        module: "suppliers",
        stateKey: "supplier_id",
        endpoint: (id) => `/suppliers/${id}/`,
        fetchDetail: (token, id) => suppliersAPIPackage.detail(token, id),
        fetchSummary: (token, id) => getSupplierSummary(token, id),
        ledgerArgs: (id) => ({ supplier_id: id }),
        idArg: (id) => ({ supplierId: id }),
        ledgerTitle: "Supplier Ledger",
        openingBlurb:
            "What you owed them before MarketPro. Counts toward the balance, never toward this month's purchases.",
    },
};

/**
 * The customer and supplier detail screens, which are one screen.
 *
 * They were two files of roughly five hundred lines that differed in about a
 * quarter of them: a city and an address against a business name, the walk-in
 * rule, and the nouns. Everything underneath - four fetches, the autosaving
 * details card, the opening balance, the khaata, the payment dialog - was
 * duplicated, and had already drifted.
 *
 * This also absorbs the old Party Ledger screen, which was a strict subset of
 * this one. It existed because an accounting user might not have reached a
 * party any other way; that cannot happen, because customers is a base module
 * every business has and accounting is the add-on on top of it. There is no
 * accounting-without-customers user for it to serve.
 *
 * The form carries the union of both parties' fields. A supplier simply never
 * renders city or address, so those keys stay "" and are never patched - which
 * is cheaper than two schemas and keeps populate() a single reset().
 */
export function PartyDetail({ party }: { party: "customer" | "supplier" }) {
    const config = CONFIG[party];

    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
    const [cities, setCities] = useState([]);
    const [citiesLoading, setCitiesLoading] = useState(true);
    // Walk-in invoices are recognised by this customer's name, so it is the one
    // field here that cannot be edited. Suppliers have no such row.
    const [isWalkIn, setIsWalkIn] = useState(false);
    const [summary, setSummary] = useState(null);
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [ledger, setLedger] = useState(null);
    const [ledgerLoading, setLedgerLoading] = useState(true);
    const [opening, setOpening] = useState(null);
    const [openingLoading, setOpeningLoading] = useState(true);
    const [openingAmount, setOpeningAmount] = useState("");
    const [openingDate, setOpeningDate] = useState(todayForInput());
    const [savingOpening, setSavingOpening] = useState(false);
    const [payOpen, setPayOpen] = useState(false);
    const { token, getPermissions } = useAuth();
    const permissions = getPermissions(config.module);
    const accountingPermissions = getPermissions("accounting");
    const canSeeAccounting = !!accountingPermissions?.["view"];
    const navigate = useNavigate();
    const location = useLocation();
    const party_id = location.state?.[config.stateKey] || null;
    // Set by whoever sent the user here, so the back arrow returns to the list
    // they actually came from rather than always to the party list.
    const backTo = location.state?.from || config.listPath;

    const endpoint = config.endpoint(party_id);
    const { patchField, status, retry } = useFieldPatch(token);

    const { register, control, reset, watch } = useForm({
        defaultValues: {
            name: "",
            business_name: "",
            phone: "",
            email: "",
            city: "",
            address: "",
            notes: "",
        },
    });

    const populateFields = (data) => {
        setIsWalkIn(party === "customer" && isWalkInCustomer(data));
        reset({
            name: data.name || "",
            business_name: data.business_name || "",
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
        if (!token || !party_id || !canSeeAccounting) {
            setLedgerLoading(false);
            return;
        }

        // Set on every call, not just the first: the date range re-fetches
        // through this same function, and the rows it is replacing are the
        // previous range's.
        setLedgerLoading(true);
        try {
            const res = await getPartyLedger(token, {
                ...config.ledgerArgs(party_id),
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
        } finally {
            setLedgerLoading(false);
        }
    };

    const fetchSummary = async () => {
        if (!token || !party_id) return;

        try {
            const res = await config.fetchSummary(token, party_id);
            if (res) {
                setSummary(res);
            } else {
                toast.error(`Failed to fetch ${party} summary.`);
            }
        } catch (error) {
            console.log(`Error fetching ${party} summary:`, error);
            toast.error(`Failed to fetch ${party} summary.`);
        } finally {
            setSummaryLoading(false);
        }
    };

    // The opening balance is accounting data too. Its figures ride on the
    // settleable-items endpoint, which is the same source the payment dialog
    // reads, so the card and the dialog can never disagree.
    const fetchOpening = async () => {
        if (!token || !party_id || !canSeeAccounting) return;

        try {
            const res = await getSettleableItems(token, config.idArg(party_id));
            if (res) {
                setOpening(res.opening_balance);
                setOpeningAmount(
                    res.opening_balance?.amount
                        ? String(res.opening_balance.amount)
                        : "",
                );
                // The STORED date, not today. Falling back to today made the
                // card misreport when the balance was taken, and re-saving then
                // moved as_of_date forward without the user asking.
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
                ...config.idArg(party_id),
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
            // Suppliers have no city field, so there is nothing to populate.
            if (party !== "customer") {
                setCitiesLoading(false);
                return;
            }
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
            } finally {
                setCitiesLoading(false);
            }
        };

        const fetchParty = async () => {
            if (!token) return;
            if (!party_id) {
                navigate(config.listPath);
                return;
            }

            try {
                const record = await config.fetchDetail(token, party_id);
                if (record) {
                    populateFields(record);
                } else {
                    toast.error(`Failed to fetch ${party}.`);
                    navigate(config.listPath);
                }
            } catch (error) {
                console.log(error);
                toast.error(`Failed to fetch ${party}.`);
                navigate(config.listPath);
            }
        };

        fetchCities();
        fetchParty();
        fetchSummary();
        fetchOpening();
        fetchLedger();
    }, [token, party_id]);

    const name = watch("name");
    const cityOptions = Object.entries(cities).map(([value, city]) => ({
        value,
        label: city.name,
    }));
    const subtitle =
        party === "customer"
            ? [config.noun, watch("phone"), cities[watch("city")]?.name]
            : [config.noun, watch("business_name"), watch("phone")];
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

                    {/* The party's NAME is the page title. It used to be an input
                        styled to look like a heading, which is why editing it
                        felt arbitrary. */}
                    <div className="flex items-start justify-between gap-6">
                        <div className="flex items-start space-x-3">
                            <ArrowLeft
                                className="w-5 h-5 mt-2 text-muted-foreground cursor-pointer hover:text-primary"
                                onClick={() => navigate(backTo)}
                            />
                            <div>
                                <h1 className="text-2xl font-semibold">
                                    {name || config.noun}
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    {subtitle.filter(Boolean).join(" · ")}
                                </p>
                            </div>
                        </div>

                        {/* Statement needs the ledger, which this user may not be
                            allowed to see; the reminder only needs the balance,
                            which they always can. */}
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
                        {/* Details — autosaved, no submit button, and it says
                            whether the edit landed. */}
                        <div className="md:col-span-2 rounded-lg border bg-card p-6">
                            <div className="mb-4 flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-base font-semibold leading-5">
                                        {config.noun} details
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

                                {party === "customer" ? (
                                    <>
                                        <div className="space-y-1">
                                            <Label htmlFor="city">City</Label>
                                            <Controller
                                                name="city"
                                                control={control}
                                                render={({ field }) => (
                                                    <Combobox
                                                        id="city"
                                                        options={cityOptions}
                                                        value={field.value}
                                                        onChange={(val) => {
                                                            field.onChange(val);
                                                            patchField(endpoint, "city", val, 0);
                                                        }}
                                                        loading={citiesLoading}
                                                        disabled={!permissions?.["edit"]}
                                                        placeholder="City"
                                                        emptyText="No cities yet."
                                                        notFoundText="No city matches that."
                                                    />
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
                                    </>
                                ) : (
                                    <div className="space-y-1">
                                        <Label htmlFor="business_name">Business name</Label>
                                        <Input
                                            id="business_name"
                                            type="text"
                                            disabled={!permissions?.["edit"]}
                                            {...register("business_name", {
                                                onChange: (e) =>
                                                    patchField(
                                                        endpoint,
                                                        "business_name",
                                                        e.target.value,
                                                    ),
                                            })}
                                        />
                                    </div>
                                )}

                                {/* Notes spans the row for a supplier: with no city
                                    or address above it, the card would otherwise not
                                    line up with Opening balance beside it. */}
                                <div
                                    className={cn(
                                        "space-y-1",
                                        party === "supplier" && "col-span-2",
                                    )}
                                >
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
                                        {config.openingBlurb}
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
                            loading={ledgerLoading}
                            onRangeApply={fetchLedger}
                            title={config.ledgerTitle}
                        />
                    )}

                    {canSeeAccounting && party_id && (
                        <RecordPaymentDialog
                            party={party}
                            partyId={party_id}
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
}

export default PartyDetail;
