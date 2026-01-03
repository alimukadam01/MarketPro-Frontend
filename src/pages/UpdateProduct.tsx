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
import { useNavigate, useLocation } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import {
    createIdMap
} from "../../services/utils"
import { useAuth } from "../../services/AuthProvider"
import {
    getProductDetail,
    getUnitsList,
    updateProduct
} from "../../services/api"
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";

const UpdateProduct = () => {

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [units, setUnits] = useState([])
    const { token } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const product_id = location.state?.product_id || null

    // react-hook-form setup
    const { register, handleSubmit, control, watch, reset, setValue } = useForm({
        defaultValues: {
            name: "",
            desc: "",
            unit: ""
        }
    })

    const onProductUpdate = async (data) => {

        console.log(data)

        try {
            const success = await updateProduct(token, product_id, data)

            if (success) {
                toast.success("Product updated successfully!")
                navigate("/products")
            } else {
                toast.error("Failed to update product.")
            }
        } catch (error) {
            console.log("Error creating product:", error)
        }
    }

    const populateProductFields = (data) => {
        reset({
            name: data.name || "",
            desc: data.desc || "",
            unit: data.unit.id
        })
    }

    useEffect(() => {

        const fetchUnits = async () => {
            try {
                const units = await getUnitsList(token)
                if (units) {
                    const unitsMap = createIdMap(units)
                    setUnits(unitsMap)
                } else {
                    toast.error("Failed to fetch units")
                }
            } catch (error) {
                console.log("Error fetching units:", error)
                toast.error("Failed to fetch units")
            }
        }

        const fetchProduct = async () => {
            if (!token) return
            if (!product_id) return

            try {
                const product = await getProductDetail(token, product_id)
                if (product) {
                    populateProductFields(product)
                } else {
                    toast.error("Failed to fetch product.")
                    navigate("/products")
                }
            } catch (error) {
                console.log(error)
                toast.error("Failed to fetch product.")
                navigate("/products")
            }
        }

        fetchUnits()
        fetchProduct()
    }, [token, product_id])

    return (
        <div className="min-h-screen bg-background">
            <Sidebar onCollapseChange={setSidebarCollapsed} />
            <div className={`${sidebarCollapsed ? "ml-16" : "ml-64"} transition-all duration-300 flex flex-col`}>
                <Header />

                <main className="flex-1 p-6 space-y-6">
                    {/* Breadcrumb */}
                    <DynamicBreadCrumb />

                    <div className="flex items-center justify-between">
                        <form onSubmit={handleSubmit(onProductUpdate)} className="flex flex-row w-[48%] gap-12">
                            {/* First Column */}
                            <div className="flex flex-col flex-wrap flex-1">
                                <h2 className="text-lg font-semibold mb-6">Add New Product (Optional)</h2>

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
                                    <Textarea id="desc" {...register("desc")} placeholder="Add product description here..." rows={6} />
                                </div>

                                <div className="flex justify-end gap-3 mt-auto">
                                    <Button type="submit">Update Product</Button>
                                </div>
                            </div>
                        </form>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default UpdateProduct;