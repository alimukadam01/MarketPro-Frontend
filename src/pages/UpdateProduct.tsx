import { useState, useEffect } from "react";
import { toast } from "sonner"
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, RotateCcwIcon, RefreshCcwIcon } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import {
    createIdMap
} from "../../services/utils"
import { useAuth } from "../../services/AuthProvider"
import {
    getProductDetail,
    getUnitsList,
    getProductVariantTypesList,
    updateProductAndVariants,
} from "../../services/api"
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";

const UpdateProduct = () => {

    const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
    const [units, setUnits] = useState([])
    const [productVariantTypes, setProductVariantTypes] = useState([])
    const [currentAttributes, setCurrentAttributes] = useState({})
    const [productVariants, setProductVariants] = useState([])
    const [selectedVariant, setSelectedVariant] = useState(null)
    const { token } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const product_id = location.state?.product_id || null

    // react-hook-form setup
    const { register, handleSubmit, control, watch, reset, setValue } = useForm({
        defaultValues: {
            name: "",
            desc: "",
            unit: "",
            productVariantAttr: "",
            productVariantVal: ""
        }
    })

    const addProductVariantAttr = (productVariantAttr, productVariantVal) => {
        if (!productVariantAttr || !productVariantVal) return;

        const selectedVariantType = productVariantTypes[productVariantAttr]
        setCurrentAttributes(prevAttributes => ({
            ...prevAttributes,
            [selectedVariantType.name]: productVariantVal, // add or update
        }))
        reset({ productVariantAttr: "", productVariantVal: "" }, { keepValues: true })
    }

    const addProductVariant = () => {
        setProductVariants([...productVariants, {
            "attributes": currentAttributes
        }])

        setCurrentAttributes(() =>
            Object.keys(currentAttributes).reduce((acc, key) => {
                acc[key] = ""
                return acc
            }, {})
        )
    }

    const updateProductVariant = () => {
        if (!selectedVariant) return;

        // 1. remove selectedVariant from variants
        const filteredVariants = productVariants.filter(
            v => v !== selectedVariant
        )

        // 2. update selectedVariant attributes
        const updatedVariant = {
            ...selectedVariant,
            attributes: currentAttributes
        }
        console.log("Updated variant: ", updatedVariant)
        
        // 3. add updated variant back
        setProductVariants([...filteredVariants, updatedVariant]);

        // 4. reset selected variant
        setSelectedVariant(null);

        // 5. reset current attributes values
        setCurrentAttributes(() =>
            Object.keys(currentAttributes).reduce((acc, key) => {
                acc[key] = ""
                return acc
            }, {})
        )
    }

    const handleVariantSelection = (item) => {
        setSelectedVariant(item)
        setCurrentAttributes(item.attributes)
    }

    const populateProductFields = (data) => {
        reset({
            name: data.name || "",
            desc: data.desc || "",
            unit: data.unit.id
        })
        setProductVariants(data.variants)
    }

    const onProductUpdate = async (data) => {

        const {
            productVariantAttr,
            productVariantVal,
            ...rest
        } = data

        const productData = {
            ...rest,
            variants: productVariants
        }

        console.log(productData)

        try {
            const success = await updateProductAndVariants(token, product_id, productData)

            if (success) {
                toast.success("Product updated successfully!")
                navigate("/products")
            } else {
                toast.error("Failed to update product.")
            }
        } catch (error) {
            console.log("Error updating product:", error)
        }
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

        const fetchProductVariantTypes = async () => {
            try {
                const productVarTypes = await getProductVariantTypesList(token)
                if (productVarTypes) {
                    const productVarTypesMap = createIdMap(productVarTypes)
                    setProductVariantTypes(productVarTypesMap)
                } else {
                    toast.error("Failed to fetch units")
                }
            } catch (error) {
                console.log("Error fetching units:", error)
                toast.error("Failed to fetch units")
            }
        }

        fetchProductVariantTypes()
        fetchUnits()
        fetchProduct()
    }, [token, product_id])

    {
        console.log("Selected Variant: ", selectedVariant)
        console.log("Product Variants: ", productVariants)
    }

    return (
        <div className="min-h-screen bg-background">
            <Sidebar onCollapseChange={setSidebarCollapsed} />
            <div className={`${sidebarCollapsed ? "ml-16" : "ml-64"} transition-all duration-300 flex flex-col`}>
                <Header />

                <main className="flex-1 p-6 space-y-6">
                    {/* Breadcrumb */}
                    <DynamicBreadCrumb />

                    <form onSubmit={handleSubmit(onProductUpdate)} className="flex flex-row gap-12">
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
                        </div>

                        {/* Second Column */}
                        <div className="flex flex-col flex-wrap flex-1">
                            <h2 className="text-lg font-semibold mb-6">Add Product Variants (Optional)</h2>
                            {currentAttributes && Object.keys(currentAttributes).length > 0 && <div className="flex flex-col mb-2 gap-2">
                                {Object.entries(currentAttributes).map(([key, value], entryIndex) => (
                                    <div
                                        key={`${entryIndex}`}
                                        className="flex w-full gap-4"
                                    >
                                        <div className="w-[50%] space-y-1">
                                            <Input
                                                id="productVariantKey"
                                                type="text"
                                                disabled={true}
                                                value={key}
                                            />
                                        </div>

                                        <div className="w-[50%] space-y-1">
                                            <Input
                                                id="productVariantVal"
                                                type="text"
                                                value={currentAttributes[key]}
                                                onChange={(e) => setCurrentAttributes((prev) => ({
                                                    ...prev,
                                                    [key]: e.target.value,   // update only this key
                                                }))
                                                }
                                            />
                                        </div>

                                        <div className="w-[5%] space-y-1">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() =>
                                                    setCurrentAttributes((prev) => Object.fromEntries(
                                                        Object.entries(prev).filter(([attrKey]) => attrKey !== key)
                                                    ))
                                                }
                                                className="w-full"
                                            >
                                                <X />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>}

                            {
                                Object.keys(currentAttributes).length < 3 &&
                                <div className="flex gap-4 mb-2 items-end">
                                    <div className="w-[50%] space-y-1">
                                        <Label htmlFor="productVariantAttr">Select Attribute</Label>
                                        <Controller
                                            name="productVariantAttr"
                                            control={control}
                                            render={({ field }) => (
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <SelectTrigger><SelectValue placeholder="Select Attribute" /></SelectTrigger>
                                                    <SelectContent>
                                                        {productVariantTypes && Object.keys(productVariantTypes).length > 0 && Object.entries(productVariantTypes).map(([key, item]) => (
                                                            <SelectItem key={key} value={key}>
                                                                {item.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                    </div>

                                    <div className="w-[50%] space-y-1">
                                        <Label htmlFor="productVariantVal">Value</Label>
                                        <Input id="productVariantVal" type="text" {...register("productVariantVal")} />
                                    </div>

                                    {
                                        Object.keys(currentAttributes).length != 0 &&
                                        <div className="w-[5%]">

                                        </div>
                                    }


                                </div>
                            }

                            <div className="flex gap-4 mb-1">

                                <div className="w-[50%] flex items-end">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                            addProductVariantAttr(watch("productVariantAttr"), watch("productVariantVal") || "")
                                        }
                                        className="w-full"
                                        disabled={Object.keys(currentAttributes).length == 3 ? true : false}
                                    >
                                        {
                                            Object.keys(currentAttributes).length == 3 ? "Max. 3 attributes allowed" :
                                                <>
                                                    <Plus className="h-4 w-4 mr-2" />
                                                    Add Attribute
                                                </>
                                        }
                                    </Button>
                                </div>

                                <div className="w-[50%] flex items-end">
                                    <Button
                                        type="button"
                                        onClick={selectedVariant ? updateProductVariant : addProductVariant}
                                        className="w-full"
                                    >
                                        {
                                        selectedVariant ? 
                                        <>
                                            <RefreshCcwIcon className="h-4 w-4 mr-2" />
                                            Update Variant 
                                        </>
                                        : 
                                        <>
                                            <Plus className="h-4 w-4 mr-2" />
                                            Create Variant 
                                        </>
                                        
                                        }
                                        
                                    </Button>
                                </div>

                                {Object.keys(currentAttributes).length != 0 &&
                                    <div className="w-[5%] space-y-1">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() =>
                                                setCurrentAttributes({})
                                            }
                                            className="w-full"
                                        >
                                            <RotateCcwIcon />
                                        </Button>
                                    </div>
                                }
                            </div>

                            {/* Product Variants */}
                            {productVariants && productVariants.length > 0 &&
                                <div className="mb-6">
                                    <div className="flex flex-col-reverse gap-[2px] h-[250px] overflow-y-auto">

                                        {productVariants.map((item, idx) => (
                                            <div
                                                key={`${item.id}-${idx}`}
                                                className={
                                                    `bg-card rounded-lg h-[35px] flex cursor-pointer items-center px-4 gap-4 border 
                                                    ${selectedVariant == item ? "border-2 border-[#4285F4]" : "border border-border"} 
                                                    scrollbar-none`
                                                }
                                                onClick={() => handleVariantSelection(item)}
                                            >
                                                <div>{idx + 1}.</div>
                                                {<div className="font-sm flex flex-1">
                                                    {
                                                        item.attributes && Object.keys(item.attributes).length > 0? 
                                                        Object.values(item.attributes).join(" / "):
                                                        'default'
                                                    }
                                                </div>}
                                                <Button
                                                    type="button"
                                                    variant="unstyled"
                                                    className="p-[0] hover:"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setProductVariants(prev => prev.filter((_, i) => i !== idx))
                                                    }}>
                                                    <X cursor={'pointer'} />
                                                </Button>
                                            </div>
                                        ))}
                                        <h2 className="text-sm font-semibold mb-1">Product Variants</h2>
                                    </div>
                                </div>
                            }

                            <div className="flex justify-end gap-3 mt-auto">
                                <Button type="submit">Update Product and Variants</Button>
                            </div>
                        </div>
                    </form>
                </main>
            </div>
        </div>
    );
}

export default UpdateProduct;