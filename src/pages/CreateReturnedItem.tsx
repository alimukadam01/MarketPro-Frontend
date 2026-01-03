import { useState, useEffect } from "react";
import { toast } from "sonner"
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartNoAxesColumnDecreasing, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { useAuth } from "../../services/AuthProvider"
import {
    returnedItemsAPIPackage
} from "../../services/api"
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";

const CreateReturnedItem = () => {

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [units, setUnits] = useState([])
    const { token } = useAuth()
    const navigate = useNavigate()

    // react-hook-form setup
    const { register, handleSubmit, control, watch, reset, setValue } = useForm({
        defaultValues: {
            name: "",
            desc: "",
            unit: ""
        }
    })

    const onReturnedItemCreate = async (data) => {

        console.log(data)

        try {
            const success = await returnedItemsAPIPackage.create(token, data)

            if (success) {
                toast.success("Returned Item created successfully!")
                navigate("/returned-items")
            } else {
                toast.error("Failed to create Returned Item.")
            }
        } catch (error) {
            console.log("Error creating returned item:", error)
        }
    }

    useEffect(() => {
        // fetch sales invoices here
        // fetch sales invoice items here
    }, [token])

    return (
        <div className="min-h-screen bg-background">
            <Sidebar onCollapseChange={setSidebarCollapsed} />
            <div className={`${sidebarCollapsed ? "ml-16" : "ml-64"} transition-all duration-300 flex flex-col`}>
                <Header />

                <main className="flex-1 p-6 space-y-6">
                    {/* Breadcrumb */}
                    <DynamicBreadCrumb />

                    <div className="flex items-center justify-between">
                        <form onSubmit={handleSubmit(onReturnedItemCreate)} className="flex flex-row w-[48%] gap-12">
                            {/* First Column */}
                            <div className="flex flex-col flex-wrap flex-1">
                                <h2 className="text-lg font-semibold mb-6">Add New Returned Item (Optional)</h2>

                                <div className="flex gap-6 mb-6">
                                    <div className="flex-1 space-y-1">
                                        <Label htmlFor="name">Name</Label>
                                        <Input id="name" type="text" {...register("name")} />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <Label htmlFor="unit">Unit</Label>
                                        <Controller
                                            name="unit"
                                            control={control}
                                            render={({ field }) => (
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select Unit"></SelectValue>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {units && Object.keys(units).length > 0 && Object.entries(units).map(([key, unit]) => (
                                                            <SelectItem value={key} key={key}>
                                                                {unit.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="mb-6 space-y-1">
                                    <Label htmlFor="desc">Description</Label>
                                    <Textarea id="desc" {...register("desc")} placeholder="Add ReturnedItem description here..." rows={6} />
                                </div>

                                <div className="flex justify-end gap-3 mt-auto">
                                    <Button type="submit">Create Returned Item</Button>
                                </div>
                            </div>
                        </form>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default CreateReturnedItem;