import { useState, useEffect } from "react";
import { toast } from "sonner"
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import {
    createIdMap
} from "../../services/utils"
import { useAuth } from "../../services/AuthProvider"
import {
    getProductsList,
    getProductVariantsList,
    getLocationsList,
    updateInventoryItem,
    getInventoryItemDetail
} from "../../services/api"
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import { set } from "date-fns";

const UpdateInventoryItem = () => {

    const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
    const [locations, setLocations] = useState([])
    const { token } = useAuth()
    const businessId = localStorage.getItem("mp-business-id")
    const navigate = useNavigate()
    const location = useLocation()
    const item_id = location.state?.item_id || null

    if (!item_id) {
        toast.error("No inventory item selected.")
        navigate("/inventory")
    }

    // react-hook-form setup
    const { register, handleSubmit, control, watch, reset, setValue } = useForm({
        defaultValues: {
            quantity: 0,
            track_code: "",
            product: null,
            productVariant: null,
            notes: "",
            location: null,
            quantity_on_hand: "0",
            quantity_reserved: "0",
            unit_cost: 0.0,
            unit_price: 0.0,
            reorder_level: 0,
        },
    })

    const populateFields = (data) => {
        // fill the main form fields

        console.log("Product from populateFields: ", data)

        reset({
            quantity: data.quantity || 0,
            track_code: data.track_code || "",
            notes: data.notes || "",
            product: data.product || 0,
            productVariant: data.product_var || null,
            location: data.location || 0,
            quantity_on_hand: data.quantity_on_hand || 0,
            quantity_reserved: data.quantity_reserved || 0,
            unit_cost: data.unit_cost || 0.0,
            unit_price: data.unit_price || 0.0,
            reorder_level: data.reorder_level || 0,
        })
    }

    const onInventoryItemUpdate = async (data) => {

        const ReqData = {
            location: parseInt(data.location),
            quantity: parseInt(data.quantity),
            unit_cost: parseFloat(data.unit_cost),
            unit_price: parseFloat(data.unit_price),
            reorder_level: parseInt(data.reorder_level),
            quantity_on_hand: parseInt(data.quantity_on_hand),
            quantity_reserved: parseInt(data.quantity_reserved)
        }

        try {
            const success = await updateInventoryItem(token, businessId, item_id, ReqData)

            if (success) {
                toast.success("Inventory item updated successfully!")
                navigate("/inventory");
            } else {
                toast.error("Failed to update inventory item.")
            }
        } catch (error) {
            console.log("Error updating inventory item:", error)
        }
    }

    useEffect(() => {

        const fetchLocations = async () => {
            try {
                const locations = await getLocationsList(token)
                if (locations) {
                    const locationsMap = createIdMap(locations)
                    setLocations(locationsMap)
                } else {
                    toast.error("Failed to fetch locations")
                }
            } catch (error) {
                console.log("Error fetching locations:", error)
                toast.error("Failed to fetch locations")
            }
        }

        fetchLocations()
    }, [token])

    useEffect(() => {
        const fetchInventoryItem = async () => {
            if (!token) return
            try {
                const inventoryItem = await getInventoryItemDetail(token, businessId, item_id)
                console.log(inventoryItem)
                if (inventoryItem) {
                    populateFields(inventoryItem)
                } else {
                    toast.error("Failed to fetch inventory item")
                }
            } catch (error) {
                console.log(error)
                toast.error("Failed to fetch inventory item")
            }
        }

        fetchInventoryItem()
    }, [item_id])

    return (
        <div className="min-h-screen bg-background">
            <Sidebar onCollapseChange={setSidebarCollapsed} />
            <div className={`${sidebarCollapsed ? "ml-16" : "ml-64"} transition-all duration-300 flex flex-col`}>
                <Header />

                <main className="flex-1 p-6 space-y-6">
                    {/* Breadcrumb */}
                    <DynamicBreadCrumb />

                    <div className="flex items-center justify-between">

                        <form onSubmit={handleSubmit(onInventoryItemUpdate)} className="flex flex-row w-[48%] gap-12">

                            {/* Second Column */}
                            <div className="flex flex-col flex-wrap flex-1">
                                <h2 className="text-lg font-semibold mb-6">Update Inventory Item</h2>

                                <div className="flex gap-6 mb-6">
                                    <div className="w-[50%] space-y-1">
                                        <Label htmlFor="product">Select Product</Label>
                                        <Input
                                            name="product"
                                            disabled={true}
                                            value={watch("product")?.name || ""}
                                        />
                                    </div>

                                    <div className="w-[50%] space-y-1">
                                        <Label htmlFor="productVariant">Select Product Variant</Label>
                                        <Input
                                            name="product"
                                            disabled={true}
                                            value={watch("productVariant")? `${watch("productVariant").product.name} (${watch("productVariant").name})`: ""}
                                        />
                                    </div>
                                    <div className="w-[50%] space-y-1">
                                        <Label htmlFor="location">Location</Label>
                                        <Controller
                                            name="location"
                                            control={control}
                                            render={({ field }) => (
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                                                    <SelectContent>
                                                        {locations && Object.keys(locations).length > 0 && Object.entries(locations).map(([key, item]) => (
                                                            <SelectItem key={key} value={key}>
                                                                {locations[key].name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                    </div>

                                </div>

                                <div className="flex gap-6 mb-6">
                                    <div className="space-y-1">
                                        <Label htmlFor="quantity">Quantity</Label>
                                        <Input id="quantity" type="number" {...register("quantity")} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="unit_cost">Unit Cost</Label>
                                        <Input id="unit_cost" type="number" {...register("unit_cost")} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="unit_price">Unit Price</Label>
                                        <Input id="unit_price" type="number" {...register("unit_price")} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="reorder_level">Reorder Level</Label>
                                        <Input id="reorder_level" type="number" {...register("reorder_level")} />
                                    </div>
                                </div>

                                <div className="flex gap-6 mb-6">
                                    <div className="w-[50%] space-y-1">
                                        <Label htmlFor="quantity_on_hand">On Hand Quantity</Label>
                                        <Input id="quantity_on_hand" type="number" {...register("quantity_on_hand")} />
                                    </div>
                                    <div className="w-[50%] space-y-1">
                                        <Label htmlFor="quantity_reserved">Reserved Quantity</Label>
                                        <Input id="quantity_reserved" type="number" {...register("quantity_reserved")} />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-auto">
                                    <Button type="submit">Update Inventory Item</Button>
                                </div>
                            </div>
                        </form>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default UpdateInventoryItem;