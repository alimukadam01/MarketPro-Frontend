import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MetricCard } from "@/components/dashboard/MetricCard";
import PartyLedgerSection from "@/components/ui/party-ledger";
import PartyActions from "@/components/ui/party-actions";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../../services/AuthProvider";
import {
    suppliersAPIPackage,
    getSupplierSummary,
    getPartyLedger,
} from "../../services/api";
import { useFieldPatch } from "@/hooks/use-field-patch";

const formatCurrency = (amount) => `PKR ${Number(amount || 0).toLocaleString()}`;

const ViewSupplier = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
    const [summary, setSummary] = useState(null);
    const [ledger, setLedger] = useState(null);
    const { token, getPermissions } = useAuth();
    const permissions = getPermissions("suppliers");
    const accountingPermissions = getPermissions("accounting");
    const navigate = useNavigate();
    const location = useLocation();
    const supplier_id = location.state?.supplier_id || null;

    const endpoint = `/suppliers/${supplier_id}/`;
    const patchField = useFieldPatch(token);

    const { register, reset, watch } = useForm({
        defaultValues: {
            name: "",
            business_name: "",
            phone: "",
            email: "",
            notes: "",
        },
    });

    const populateSupplierFields = (data) => {
        reset({
            name: data.name || "",
            business_name: data.business_name || "",
            phone: data.phone || "",
            email: data.email || "",
            notes: data.notes || "",
        });
    };

    // The ledger is accounting data, so it is only ever fetched for users who
    // are allowed to see it. Everyone else stops at the cards.
    const fetchLedger = async (dateFrom = "", dateTo = "") => {
        if (!token || !supplier_id) return;
        if (!accountingPermissions?.["view"]) return;

        try {
            const res = await getPartyLedger(token, {
                supplier_id,
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
        const fetchSupplier = async () => {
            if (!token) return;
            if (!supplier_id) {
                navigate("/suppliers");
                return;
            }

            try {
                const supplier = await suppliersAPIPackage.detail(token, supplier_id);
                if (supplier) {
                    populateSupplierFields(supplier);
                } else {
                    toast.error("Failed to fetch supplier.");
                    navigate("/suppliers");
                }
            } catch (error) {
                console.log(error);
                toast.error("Failed to fetch supplier.");
                navigate("/suppliers");
            }
        };

        const fetchSummary = async () => {
            if (!token || !supplier_id) return;

            try {
                const res = await getSupplierSummary(token, supplier_id);
                if (res) {
                    setSummary(res);
                } else {
                    toast.error("Failed to fetch supplier summary.");
                }
            } catch (error) {
                console.log("Error fetching supplier summary:", error);
                toast.error("Failed to fetch supplier summary.");
            }
        };

        fetchSupplier();
        fetchSummary();
        fetchLedger();
    }, [token, supplier_id]);

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
                                onClick={() => navigate("/suppliers")}
                            />
                            <h1 className="text-2xl font-semibold">Supplier Detail</h1>
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

                    {/* Supplier details — autosaved, no submit button */}
                    <div className="flex flex-col border border-light rounded-lg bg-card px-2 py-2">
                        <Input
                            id="name"
                            className="text-xl font-semibold mb-2 w-fit"
                            type="text"
                            placeholder="Supplier name"
                            disabled={!permissions?.["edit"]}
                            {...register("name", {
                                onChange: (e) =>
                                    patchField(endpoint, "name", e.target.value),
                            })}
                        />

                        <div className="grid grid-cols-6 gap-4">
                            <div className="col-span-2">
                                <Input
                                    id="business_name"
                                    type="text"
                                    placeholder="Business name"
                                    disabled={!permissions?.["edit"]}
                                    {...register("business_name", {
                                        onChange: (e) =>
                                            patchField(endpoint, "business_name", e.target.value),
                                    })}
                                />
                            </div>
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
                            <div className="col-span-6">
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

export default ViewSupplier;
