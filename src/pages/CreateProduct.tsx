import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner"
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus, Trash2, RotateCcwIcon, RefreshCcwIcon, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { createIdMap } from "../../services/utils"
import { useAuth } from "../../services/AuthProvider"
import {
    getProductVariantTypesList,
    getUnitsList,
    postProductAndVariants,
    postProduct
} from "../../services/api"
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import { SubmitButton } from "@/components/ui/submit-button";
import { usePending } from "@/hooks/use-pending";
import { SearchField } from "@/components/ui/search-field";
import { Combobox } from "@/components/ui/combobox";

const CreateProduct = () => {
  const { pending, run } = usePending();

    const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
    const [units, setUnits] = useState([])
    const [productVariantTypes, setProductVariantTypes] = useState([])
    const [variantTypesLoading, setVariantTypesLoading] = useState(true)
    const [currentAttributes, setCurrentAttributes] = useState({})
    const [productVariants, setProductVariants] = useState([])
    const [selectedVariant, setSelectedVariant] = useState(null)
    const [variantSearchTerm, setVariantSearchTerm] = useState("")
    const { token } = useAuth()
    const navigate = useNavigate()

    const attributeCount = Object.keys(currentAttributes).length
    const maxAttributesReached = attributeCount === 3

    // Every attribute needs a value before a variant can be built, otherwise the
    // variant label comes out with an empty segment ("Red / ").
    const variantReady = attributeCount > 0 &&
        Object.values(currentAttributes).every((value) => String(value ?? "").trim() !== "")

    // react-hook-form setup
    const { register, handleSubmit, control } = useForm({
        defaultValues: {
            name: "",
            desc: "",
            unit: "",
            productVariantAttr: "",
            variants: []
        }
    })

    const onProductCreate = async (data) => {

        const {
            productVariantAttr,
            ...rest
        } = data

        const productData = {
            ...rest,
            variants: productVariants
        }

        try {
            const success = await postProductAndVariants(token, productData)

            if (success) {
                toast.success("Product created successfully!")
                navigate("/products")
            } else {
                toast.error("Failed to create product.")
            }
        } catch (error) {
            console.log("Error creating product:", error)
        }
    }

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

    const variantTypeOptions = useMemo(
        () => Object.entries(productVariantTypes).map(([value, item]) => ({
            value,
            label: item.name,
        })),
        [productVariantTypes])

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
            } finally {
                setVariantTypesLoading(false)
            }
        }

        fetchProductVariantTypes()
        fetchUnits()
    }, [token])

    return (
        <div className="min-h-screen bg-background">
            <Sidebar onCollapseChange={setSidebarCollapsed} />
            <div className={`${sidebarCollapsed ? "ml-16" : "ml-64"} transition-all duration-300 flex flex-col h-screen`}>
                <Header />

                <main className="flex-1 flex flex-col p-6 gap-6">
                    {/* Breadcrumb */}
                    <DynamicBreadCrumb />

                    <form onSubmit={handleSubmit(run(onProductCreate))} className="flex flex-col flex-1 gap-4">
                        <div className="flex gap-12 flex-1">
                            {/* First Column */}
                            <div className="flex flex-col flex-1">
                                <h2 className="text-lg font-semibold mb-6">Create New Product</h2>

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
                                <h2 className="text-lg font-semibold mb-6">Add Product Variants (Optional)</h2>

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
                                                <Combobox
                                                    id="productVariantAttr"
                                                    options={variantTypeOptions}
                                                    value={field.value}
                                                    disabled={maxAttributesReached}
                                                    onChange={(value) => {
                                                        if (!value) return   // the clear path, not a pick
                                                        addProductVariantAttr(value)
                                                        field.onChange("")   // back to the placeholder
                                                    }}
                                                    loading={variantTypesLoading}
                                                    placeholder={maxAttributesReached ? "Max. 3 attributes allowed" : "Select Attribute"}
                                                    emptyText="No attributes defined yet."
                                                    notFoundText="No attribute matches that."
                                                />
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
                                    <SearchField
                                      id="variantSearch"
                                      placeholder="Search variants"
                                      value={variantSearchTerm}
                                      onChange={setVariantSearchTerm}
                                      className="w-full"
                                      wrapperClassName="w-full"
                                    />
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
                            <SubmitButton type="submit" pending={pending} pendingLabel="Creating…">Create Product and Variants</SubmitButton>
                        </div>
                    </form>
                </main>
            </div>
        </div>
    );
}

export default CreateProduct;
