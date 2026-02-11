import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { postSupplier } from "../../services/api";
import { useAuth } from "../../services/AuthProvider"
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";

const CreateSupplier = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
    const { token } = useAuth();
    const navigate = useNavigate();

    // react-hook-form setup
    const { register, handleSubmit, control, watch, reset, setValue } = useForm({
        defaultValues: {
            name: "",
            business_name: "",
            phone: "",
            email: "",
            notes: "",
        },
    });

    const onSupplierCreate = async (data) => {

        try {
            const success = await postSupplier(token, data);

            if (success) {
                toast.success("Supplier created successfully!");
                navigate("/suppliers");
            } else {
                toast.error("Failed to create supplier.");
            }
        } catch (error) {
            console.log("Error creating supplier:", error);
        }
    };


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
                            onSubmit={handleSubmit(onSupplierCreate)}
                            className="flex flex-row w-[48%] gap-12"
                        >
                            {/* First Column */}
                            <div className="flex flex-col flex-wrap flex-1">
                                <h2 className="text-lg font-semibold mb-6">Add New Supplier</h2>

                                <div className="flex gap-6 mb-6">
                                    <div className="flex-1 space-y-1">
                                        <Label htmlFor="name">Name</Label>
                                        <Input id="name" type="text" {...register("name")} />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <Label htmlFor="business_name">Business Name</Label>
                                        <Input id="business_name" type="text" {...register("business_name")} />
                                    </div>
                                </div>

                                <div className="flex gap-6 mb-6">
                                    <div className="flex-1 space-y-1">
                                        <Label htmlFor="phone">Phone Number</Label>
                                        <Input id="phone" type="text" {...register("phone")} />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <Label htmlFor="name">Email</Label>
                                        <Input id="name" type="text" {...register("email")} />
                                    </div>
                                </div>

                                <div className="mb-6 space-y-1">
                                    <Label htmlFor="notes">Notes</Label>
                                    <Textarea
                                        id="notes"
                                        {...register("notes")}
                                        placeholder="Enter notes here"
                                        rows={3}
                                    />
                                </div>

                                <div className="flex justify-end gap-3 mt-auto">
                                    <Button type="submit">Create Supplier</Button>
                                </div>
                            </div>
                        </form>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default CreateSupplier;
