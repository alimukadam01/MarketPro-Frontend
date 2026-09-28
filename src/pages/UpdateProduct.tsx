import { useState, useEffect } from "react";
import { toast } from "sonner"
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Trash2, RotateCcwIcon, RefreshCcwIcon, Search } from "lucide-react";
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
    const [variantSearchTerm, setVariantSearchTerm] = useState("")
    const { token } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const product_id = location.state?.product_id || null

    const attributeCount = Object.keys(currentAttributes).length
    const maxAttributesReached = attributeCount === 3

    // Every attribute needs a value before a variant can be built, otherwise the
    // variant label comes out with an empty segment ("Red / ").
    const variantReady = attributeCount > 0 &&
        Object.values(currentAttributes).every((value) => String(value ?? "").trim() !== "")

    // react-hook-form setup
    const { register, handleSubmit, control, reset } = useForm({
        defaultValues: {
            name: "",
            desc: "",
            unit: "",
            productVariantAttr: ""
        }
    })

    // Picking from the dropdown adds the attribute straight away — there is no
    // separate "Add Attribute" button. Re-picking an existing attribute keeps
    // whatever value was already typed against it.
    const addProductVariantAttr = (productVariantAttr) => {
        if (!productVariantAttr) return;

        const selectedVariantType = productVariantTypes[productVariantAttr]
        if (!selectedVariantType) return;

        setCurrentAttributes(prevAttributes => ({
            ...prevAttributes,
            [selectedVariantType.name]: prevAttributes[selectedVariantType.name] ?? "",
        }))
    }

    // Keeps the attribute keys in place and wipes only their values, so the next
    // variant can be typed without picking the attributes again.
    const clearAttributeValues = () => {
        setCurrentAttributes((prev) =>
            Object.keys(prev).reduce((acc, key) => {
                acc[key] = ""
                return acc
            }, {})
        )
    }

    const deselectVariant = () => {
        setSelectedVariant(null)
        clearAttributeValues()
    }

    const addProductVariant = () => {
        setProductVariants([...productVariants, {
            "attributes": currentAttributes
        }])

        clearAttributeValues()
    }

    // Replaced in place rather than removed and re-appended, so an edited variant
    // keeps its position in the list.
    const updateProductVariant = () => {
        if (!selectedVariant) return;

        setProductVariants((prev) =>
            prev.map((variant) =>
                variant === selectedVariant
                    ? { ...variant, attributes: currentAttributes }
                    : variant
            )
        )

        deselectVariant()
    }

    const handleVariantSelection = (item) => {
        setSelectedVariant(item)
        setCurrentAttributes({ ...item.attributes })
    }

    const handleVariantDeletion = (index) => {
        const variant = productVariants[index]
        if (variant === selectedVariant) {
            deselectVariant()
        }
        setProductVariants(prev => prev.filter((_, i) => i !== index))
    }

    // Carries the original index so the number shown and the row deleted still
    // refer to the real entry while the list is filtered.
    const visibleVariants = productVariants
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => {
            const query = variantSearchTerm.trim().toLowerCase()
            if (!query) return true
            const label = item.attributes && Object.keys(item.attributes).length > 0
                ? Object.values(item.attributes).join(" / ")
                : "default"
            return label.toLowerCase().includes(query)
        })

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
            ...rest
        } = data

        const productData = {
            ...rest,
            variants: productVariants
        }

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

    // Esc drops the selection but leaves the attribute keys standing.
    useEffect(() => {
        if (!selectedVariant) return

        const handleEscape = (event) => {
            if (event.key === "Escape") {
                deselectVariant()
            }
        }

        window.addEventListener("keydown", handleEscape)
        return () => window.removeEventListener("keydown", handleEscape)
    }, [selectedVariant])

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

        const init = async () => {
            await Promise.all([
                fetchProductVariantTypes(),
                fetchUnits(),
            ])
            fetchProduct()
        }
        init()
    }, [token, product_id])

    return (
        <div className="min-h-screen bg-background">
            <Sidebar onCollapseChange={setSidebarCollapsed} />
            <div className={`${sidebarCollapsed ? "ml-16" : "ml-64"} transition-all duration-300 flex flex-col h-screen`}>
                <Header />

                <main className="flex-1 flex flex-col p-6 gap-6">
                    {/* Breadcrumb */}
                    <DynamicBreadCrumb />

                    <form onSubmit={handleSubmit(onProductUpdate)} className="flex flex-col flex-1 gap-4">
                        <div className="flex gap-12 flex-1">
                            {/* First Column */}
                            <div className="flex flex-col flex-1">
                                <h2 className="text-lg font-semibold mb-6">Update Product</h2>

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
                            <div className="flex flex-col flex-1">
                                <h2 className="text-lg font-semibold mb-6">Update Product Variants</h2>

                                {/* Attribute rows — the heading only appears once an attribute has been picked.
                                    Label + space-y-1 on a block wrapper, exactly as the left column does it:
                                    the inline <label> takes the parent's line box, so these rows land on the
                                    same baseline as the Name and Unit fields instead of 10px above them. */}
                                {attributeCount > 0 && <div className="space-y-1 mb-2">
                                    <Label className="font-semibold">Variant Configuration</Label>

                                    <div className="flex flex-col gap-2">
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
                                                    className="bg-muted disabled:opacity-100 disabled:text-foreground"
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
                                    </div>
                                </div>}

                                {/* Pick, build and reset all sit on one row */}
                                <div className="flex gap-4 mb-2 items-end">
                                    <div className="w-[50%] space-y-1">
                                        <Label htmlFor="productVariantAttr">Add Attribute</Label>
                                        <Controller
                                            name="productVariantAttr"
                                            control={control}
                                            render={({ field }) => (
                                                <Select
                                                    value={field.value}
                                                    disabled={maxAttributesReached}
                                                    onValueChange={(value) => {
                                                        addProductVariantAttr(value)
                                                        field.onChange("")   // back to the placeholder
                                                    }}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={maxAttributesReached ? "Max. 3 attributes allowed" : "Select Attribute"} />
                                                    </SelectTrigger>
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

                                    <div className="w-[50%] flex items-end">
                                        <Button
                                            type="button"
                                            onClick={selectedVariant ? updateProductVariant : addProductVariant}
                                            className="w-full"
                                            disabled={!variantReady}
                                        >
                                            {selectedVariant ?
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

                                    <div className="w-[5%] space-y-1">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                setSelectedVariant(null)
                                                setCurrentAttributes({})
                                            }}
                                            className="w-full"
                                        >
                                            <RotateCcwIcon />
                                        </Button>
                                    </div>
                                </div>

                                {/* Ends flush with the Create Variant button, clear of the reset column */}
                                <div className="flex gap-4 mb-2">
                                    <div className="w-[100%] relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                        <Input
                                            id="variantSearch"
                                            type="text"
                                            placeholder="Search variants"
                                            className="pl-10"
                                            value={variantSearchTerm}
                                            onChange={(e) => setVariantSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    <div className="w-[5%]"></div>
                                </div>

                                {/* Product Variants */}
                                {productVariants && productVariants.length > 0 &&
                                    <div className="mb-6">
                                        <div className="flex flex-col gap-[2px] h-[250px] overflow-y-auto">

                                            {visibleVariants.map(({ item, index }) => (
                                                <div
                                                    key={`${item.id}-${index}`}
                                                    className="flex gap-4 items-center"
                                                >
                                                    <div
                                                        className={
                                                            `flex-1 bg-card rounded-lg h-[35px] flex cursor-pointer items-center px-4 gap-4
                                                            ${selectedVariant === item ? "border-2 border-[#4285F4]" : "border border-border"}`
                                                        }
                                                        onClick={() => handleVariantSelection(item)}
                                                    >
                                                        <div>{index + 1}.</div>
                                                        {<div className="font-sm flex flex-1">
                                                            {
                                                                item.attributes && Object.keys(item.attributes).length > 0 ?
                                                                    Object.values(item.attributes).join(" / ") :
                                                                    'default'
                                                            }
                                                        </div>}
                                                    </div>

                                                    <div className="w-[5%]">
                                                        <Button
                                                            type="button"
                                                            variant="unstyled"
                                                            className="p-[0] w-full hover:text-destructive"
                                                            onClick={() => handleVariantDeletion(index)}
                                                        >
                                                            <Trash2 cursor={'pointer'} />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                }
                            </div>
                        </div>

                        <div className="flex justify-end mt-auto">
                            <Button type="submit">Update Product and Variants</Button>
                        </div>
                    </form>
                </main>
            </div>
        </div>
    );
}

export default UpdateProduct;
