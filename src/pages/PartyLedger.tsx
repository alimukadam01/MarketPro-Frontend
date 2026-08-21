import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import PartyLedgerSection from "@/components/ui/party-ledger";
import PartyActions from "@/components/ui/party-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../services/AuthProvider";
import {
    getPartyLedger,
    partyOpeningBalancesAPIPackage,
} from "../../services/api";
import { todayForInput } from "../../services/utils";

const formatCurrency = (amount) => `PKR ${Number(amount || 0).toLocaleString()}`;

const PartyLedger = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
    const [ledger, setLedger] = useState(null);
    const [openingAmount, setOpeningAmount] = useState("");
    const [openingDate, setOpeningDate] = useState(
        todayForInput()
    );
    const { token, getPermissions } = useAuth();
    const permissions = getPermissions("accounting");
    const navigate = useNavigate();
    const location = useLocation();
    const customer_id = location.state?.customer_id || null;
    const supplier_id = location.state?.supplier_id || null;

    const isCustomer = !!customer_id;
    const party = ledger?.party;

    const fetchLedger = async (dateFrom = "", dateTo = "") => {
        if (!token) return;
        if (!customer_id && !supplier_id) {
            navigate("/accounting/ledgers");
            return;
        }

        try {
            const res = await getPartyLedger(token, {
                customer_id,
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

    const handleOpeningBalanceSave = async () => {
        if (!openingAmount) {
            toast.error("Please enter the outstanding amount.");
            return;
        }

        try {
            const success = await partyOpeningBalancesAPIPackage.create(token, {
                customer: customer_id,
                supplier: supplier_id,
                amount: Math.round(Number(openingAmount)),
                as_of_date: openingDate,
            });

            if (success) {
                toast.success("Opening balance saved.");
                setOpeningAmount("");
                await fetchLedger();
            } else {
                toast.error("Failed to save the opening balance.");
            }
        } catch (error) {
            console.log("Error saving opening balance:", error);
            toast.error("Failed to save the opening balance.");
        }
    };

    // Already normalised to the country-code form wa.me needs; stripping the
    // stored number here would drop the leading 0 and open the wrong contact.
    const phone = party?.whatsapp || "";

    // This page is behind the accounting guard already, so the statement is
    // always on offer here.
    const partyActions = (
        <PartyActions
            name={party?.name}
            phone={phone}
            balance={ledger?.closing_balance}
            ledger={ledger}
            canShareStatement
        />
    );

    useEffect(() => {
        fetchLedger();
    }, [token, customer_id, supplier_id]);

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
                                onClick={() => navigate("/accounting/ledgers")}
                            />
                            <div>
                                <h1 className="text-2xl font-semibold">
                                    {party?.name || "Party Ledger"}
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    {isCustomer ? "Customer" : "Supplier"} ledger
                                    {party?.phone ? ` · ${party.phone}` : ""}
                                </p>
                            </div>
                        </div>
                    </div>

                    {!permissions?.["view"] ? (
                        <div className="bg-card rounded-lg p-6 border">
                            <p className="text-sm text-muted-foreground">
                                Access not granted. Please contact Admin.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="bg-card rounded-lg p-6 border">
                                    <div className="text-sm text-muted-foreground mb-2">
                                        Outstanding Balance
                                    </div>
                                    <div className="text-3xl font-bold">
                                        {formatCurrency(ledger?.closing_balance)}
                                    </div>
                                </div>
                            </div>

                            <PartyLedgerSection
                                ledger={ledger}
                                onRangeApply={fetchLedger}
                                actions={partyActions}
                            />

                            {/* Opening balance from the paper khaata */}
                            <div className="bg-card rounded-lg p-6 border space-y-4">
                                <div>
                                    <div className="text-base font-medium">
                                        Opening Balance
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        What this party already owed before MarketPro. It counts
                                        toward the balance but never appears as this month's sales.
                                    </p>
                                </div>

                                <div className="flex items-end space-x-4">
                                    <div className="space-y-1">
                                        <Label htmlFor="opening_amount">Amount (PKR)</Label>
                                        <Input
                                            id="opening_amount"
                                            type="number"
                                            className="w-48"
                                            value={openingAmount}
                                            onChange={(e) => setOpeningAmount(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="opening_date">Accurate As Of</Label>
                                        <Input
                                            id="opening_date"
                                            type="date"
                                            className="w-48"
                                            value={openingDate}
                                            onChange={(e) => setOpeningDate(e.target.value)}
                                        />
                                    </div>
                                    <Button
                                        variant="outline"
                                        disabled={!permissions?.["create"]}
                                        onClick={handleOpeningBalanceSave}
                                        className="flex items-center space-x-2"
                                    >
                                        {!permissions?.["create"] && <Lock className="w-4 h-4" />}
                                        <span>Save</span>
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </main>
            </div>
        </div>
    );
};

export default PartyLedger;
