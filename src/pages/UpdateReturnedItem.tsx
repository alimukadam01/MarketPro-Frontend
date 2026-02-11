import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { returnedItemsAPIPackage } from "../../services/api";
import { useAuth } from "../../services/AuthProvider"
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";

const UpdateReturnedItem = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
    const { token } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const returned_item_id = location.state?.returned_item_id || null

    // react-hook-form setup
    const { register, handleSubmit, control, watch, reset, setValue } = useForm({
        defaultValues: {
            sales_invoice_id: "",
            invoice_item_id: "",
            quantity: "",
            reason: ""
        },
    });

    const onReturnedItemUpdate = async (data) => {

        try {
            const success = await returnedItemsAPIPackage.update(token, returned_item_id, data);

            if (success) {
                toast.success("Returned Item updated successfully!");
                navigate("/returned-items");
            } else {
                toast.error("Failed to update returned item.");
            }
        } catch (error) {
            console.log("Error creating returned item:", error);
        }
    };

    const populateReturnedItemFields = (data) => {
        reset({
            sales_invoice_id: data.invoice_item.sales_invoice.id,
            invoice_item_id: data.invoice_item.id || "",
            quantity: data.quantity || "",
            reason: data.reason || ""
        });
    };

    useEffect(() => {

        const fetchReturnedItem = async () => {
            if (!token) return;
            if (!returned_item_id) return;

            try {
                const returned_item = await returnedItemsAPIPackage.detail(token, returned_item_id);
                if (returned_item) {
                    populateReturnedItemFields(returned_item);
                } else {
                    toast.error("Failed to fetch returned item.");
                    navigate("/returned-items");
                }
            } catch (error) {
                console.log(error);
                toast.error("Failed to fetch returned item.");
                navigate("/returned-items");
            }
        };

        fetchReturnedItem();
    }, [token, returned_item_id]);


    {
        console.log(watch("sales_invoice_id"))
    }

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
                            onSubmit={handleSubmit(onReturnedItemUpdate)}
                            className="flex flex-row w-[48%] gap-12"
                        >
                            {/* First Column */}
                            <div className="flex flex-col flex-wrap flex-1">
                                <h2 className="text-lg font-semibold mb-6">Update Returned Item</h2>

                                <div className="flex gap-6 mb-6">
                                    <div className="flex-1 space-y-1">
                                        <Label htmlFor="sales_invoice_id">Sales Invoice</Label>
                                        <Input id="sales_invoice_id" type="text" value={`Sales Invoice (${watch("sales_invoice_id")})`} disabled={true}/>
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <Label htmlFor="invoice_item_id">Invoice Item</Label>
                                        <Input id="invoice_item_id" type="text" value={watch("invoice_item_id")} disabled={true} />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <Label htmlFor="quantity">Quantity</Label>
                                        <Input id="quantity" type="text" {...register("quantity")} />
                                    </div>
                                </div>

                                <div className="flex gap-6 mb-6">
                                </div>

                                <div className="mb-6 space-y-1">
                                    <Label htmlFor="reason">Reason</Label>
                                    <Textarea
                                        id="reason"
                                        {...register("reason")}
                                        placeholder="Enter reason here"
                                        rows={3}
                                    />
                                </div>

                                <div className="flex justify-end gap-3 mt-auto">
                                    <Button type="submit">Update Returned Item</Button>
                                </div>
                            </div>
                        </form>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default UpdateReturnedItem;
