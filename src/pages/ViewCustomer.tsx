import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Input } from "@/components/ui/input";
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
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { createIdMap, isWalkInCustomer } from "../../services/utils";
import { useAuth } from "../../services/AuthProvider";
import {
    getCitiesList,
    getCustomerDetail,
    getCustomerSummary,
    getPartyLedger,
} from "../../services/api";
import { useFieldPatch } from "@/hooks/use-field-patch";

const formatCurrency = (amount) => `PKR ${Number(amount || 0).toLocaleString()}`;

const ViewCustomer = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
    const [cities, setCities] = useState([]);
    // Walk-in invoices are recognised by this customer's name, so it is the
    // one field on this page that cannot be edited.
    const [isWalkIn, setIsWalkIn] = useState(false);
    const [summary, setSummary] = useState(null);
    const [ledger, setLedger] = useState(null);
    const { token, getPermissions } = useAuth();
    const permissions = getPermissions("customers");
    const accountingPermissions = getPermissions("accounting");
    const navigate = useNavigate();
    const location = useLocation();
    const customer_id = location.state?.customer_id || null;

    const endpoint = `/customers/${customer_id}/`;
    const patchField = useFieldPatch(token);

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
        if (!accountingPermissions?.["view"]) return;

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
            }
        };

        fetchCities();
        fetchCustomer();
        fetchSummary();
        fetchLedger();
    }, [token, customer_id]);

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

                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <ArrowLeft
                                className="w-5 h-5 text-muted-foreground cursor-pointer hover:text-primary"
                                onClick={() => navigate("/customers")}
                            />
                            <h1 className="text-2xl font-semibold">Customer Detail</h1>
                        </div>

                        {/* Statement needs the ledger, which this user may not
                            be allowed to see; the reminder only needs the
                            balance, which they always can. */}
                        <PartyActions
                            name={watch("name")}
                            phone={summary?.whatsapp}
                            balance={summary?.balance}
                            ledger={ledger}
                            canShareStatement={!!accountingPermissions?.["view"]}
                        />
                    </div>

                    {/* Customer details — autosaved, no submit button */}
                    <div className="flex flex-col border border-light rounded-lg bg-card px-2 py-2">
                        <Input
                            id="name"
                            className="text-xl font-semibold mb-2 w-fit"
                            type="text"
                            placeholder="Customer name"
                            disabled={!permissions?.["edit"] || isWalkIn}
                            {...register("name", {
                                onChange: (e) =>
                                    patchField(endpoint, "name", e.target.value),
                            })}
                        />
                        {isWalkIn && (
                            <p className="text-xs text-muted-foreground mb-2">
                                This is the counter-sale customer. Its name is fixed so
                                walk-in invoices can still be recognised when they are
                                downloaded.
                            </p>
                        )}

                        <div className="grid grid-cols-6 gap-4">
                            <div className="col-span-2">
                                <Input
                                    id="phone"
                                    type="text"
                                    placeholder="Phone number"
                                    disabled={!permissions?.["edit"]}
                                    {...register("phone", {
                                        onChange: (e) =>
                                            patchField(endpoint, "phone", e.target.value),
                                    })}
                                />
                            </div>
                            <div className="col-span-2">
                                <Input
                                    id="email"
                                    type="text"
                                    placeholder="Email"
                                    disabled={!permissions?.["edit"]}
                                    {...register("email", {
                                        onChange: (e) =>
                                            patchField(endpoint, "email", e.target.value),
                                    })}
                                />
                            </div>
                            <div className="col-span-2">
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
                                                <SelectValue placeholder="City"></SelectValue>
                                            </SelectTrigger>
                                            <SelectContent>
                                                {cities &&
                                                    Object.keys(cities).length > 0 &&
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
                            <div className="col-span-3">
                                <Textarea
                                    id="address"
                                    className="min-h-[40px]"
                                    placeholder="Address"
                                    rows={2}
                                    disabled={!permissions?.["edit"]}
                                    {...register("address", {
                                        onChange: (e) =>
                                            patchField(endpoint, "address", e.target.value),
                                    })}
                                />
                            </div>
                            <div className="col-span-3">
                                <Textarea
                                    id="notes"
                                    className="min-h-[40px]"
                                    placeholder="Notes"
                                    rows={2}
                                    disabled={!permissions?.["edit"]}
                                    {...register("notes", {
                                        onChange: (e) =>
                                            patchField(endpoint, "notes", e.target.value),
                                    })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <MetricCard
                            title="Outstanding Balance"
                            value={formatCurrency(summary?.balance)}
                        />
                        <MetricCard
                            title="Total Business"
                            value={formatCurrency(summary?.total_business)}
                        />
                    </div>

                    {accountingPermissions?.["view"] && (
                        <PartyLedgerSection ledger={ledger} onRangeApply={fetchLedger} />
                    )}
                </main>
            </div>
        </div>
    );
};

export default ViewCustomer;
