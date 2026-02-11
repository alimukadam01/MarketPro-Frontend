import { useState, useEffect } from "react";
import { toast } from "sonner"
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { createIdMap } from "../../services/utils"
import { useAuth } from "../../services/AuthProvider"
import { Plus, RotateCcwIcon, X } from "lucide-react";
import {
    getProductsList,
    getProductVariantsList,
    getUnitsList,
    getLocationsList,
    postProduct,
    postInventoryItem
} from "../../services/api"
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import { set } from "date-fns";

const CreateInventoryItem = () => {

    const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
    const [productCreated, setProductCreated] = useState(false)
    const [products, setProducts] = useState([])
    const [productVariants, setProductVariants] = useState([])
    const [productVariantTypes, setProductVariantTypes] = useState([])
    const [newProductVariants, setNewProductVariants] = useState([])
    const [currentAttributes, setCurrentAttributes] = useState({})
    const [units, setUnits] = useState([])
    const [locations, setLocations] = useState([])
    const { token } = useAuth()
    const businessId = localStorage.getItem("mp-business-id")
    const navigate = useNavigate()

    // react-hook-form setup
    const { register, handleSubmit, control, watch, reset, setValue } = useForm({
        defaultValues: {
            product_name: "",
            desc: "",
            quantity: "0",
            unit: "",
            track_code: "",
            notes: "",
            location_id: "",
            quantity_on_hand: "0",
            quantity_reserved: "0",
            unit_cost: "0.0",
            unit_price: "0.0",
            reorder_level: "0",
            newItemProduct: "",
            newItemProductVariant: "",
            newItemQuantity: 0,
            newItemLocation: "",
            newItemCost: 0,
            productVariantAttr: "",
            productVariantVal: ""
        },
    })

    const onProductCreate = async (data) => {

        const ReqData = {
            name: data.product_name,
            desc: data.desc,
            unit: data.unit
        }

        try {
            console.log("Form Data:", ReqData)
            const success = await postProduct(token, ReqData)

            if (success) {
                setProductCreated(true)
                toast.success("Product created successfully!")
            } else {
                toast.error("Failed to create product.")
            }
        } catch (error) {
            console.log("Error creating product:", error)
        }
    }

    const onInventoryItemCreate = async (data) => {

        const ReqData = {
            product: parseInt(data.newItemProduct),
            product_var: parseInt(data.newItemProductVariant),
            location: parseInt(data.newItemLocation),
            quantity: parseInt(data.newItemQuantity),
            unit_cost: parseFloat(data.unit_cost),
            unit_price: parseFloat(data.unit_price),
            reorder_level: parseInt(data.reorder_level),
            quantity_on_hand: parseInt(data.quantity_on_hand),
            quantity_reserved: parseInt(data.quantity_reserved)
        }

        console.log("Inventory Item Data:", ReqData)

        try {
            const success = await postInventoryItem(token, businessId, ReqData)

            if (success) {
                toast.success("Inventory item created successfully!")
                navigate("/inventory");
            } else {
                toast.error("Failed to create inventory item.")
            }
        } catch (error) {
            console.log("Error creating inventory item:", error)
        }
    }

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

    const fetchProducts = async () => {
        if (!token) return;

        try {
            const products = await getProductsList(token)
            if (products) {
                const productMap = createIdMap(products)
                setProducts(productMap)
            } else {
                toast.error("Failed to fetch products")
            }
        } catch (error) {
            console.log("Error fetching products:", error)
            toast.error("Failed to fetch products")
        }
    }

    const fetchProductVariants = async () => {
        if (!token) return;

        try {
            const products = await getProductVariantsList(token)
            if (products) {
                const productMap = createIdMap(products)
                setProductVariants(productMap)
            } else {
                toast.error("Failed to fetch product variants.")
            }
        } catch (error) {
            console.log("Error fetching product variants:", error)
            toast.error("Failed to fetch product  variants.")
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

        fetchProductVariants()
        fetchProducts()
        fetchUnits()
        fetchLocations()
    }, [token])

    useEffect(() => {
        if (productCreated) {
            fetchProductVariants()
            fetchProducts()
            setProductCreated(false)
        }
    }, [productCreated])


    return (
        <div className="min-h-screen bg-background">
            <Sidebar onCollapseChange={setSidebarCollapsed} />
            <div className={`${sidebarCollapsed ? "ml-16" : "ml-64"} transition-all duration-300 flex flex-col`}>
                <Header />

                <main className="flex-1 p-6 space-y-6">
                    {/* Breadcrumb */}
                    <DynamicBreadCrumb />

                    <div className="flex items-center justify-between">
                        {/*<form onSubmit={handleSubmit(onProductCreate)} className="flex flex-row w-[48%] gap-12">
                            First Column
                             <div className="flex flex-col flex-wrap flex-1">
                                <h2 className="text-lg font-semibold mb-6">Add New Product (Optional)</h2>

                                <div className="flex gap-6 mb-6">
                                    <div className="flex-1 space-y-1">
                                        <Label htmlFor="product_name">Name</Label>
                                        <Input id="product_name" type="text" {...register("product_name")} />
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

                                <div className="mb-2 space-y-1">
                                    <Label htmlFor="desc">Description</Label>
                                    <Textarea id="desc" {...register("desc")} placeholder="Add product description here..." rows={6} />
                                </div>

                                <div className="flex flex-col flex-wrap flex-1">
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
                                                {Object.keys(currentAttributes).length == 3 ? "Max. 3 attributes allowed" :
                                                    <>
                                                        <Plus className="h-4 w-4 mr-2" />
                                                        Add Attribute
                                                    </>}
                                            </Button>
                                        </div>

                                        <div className="w-[50%] flex items-end">
                                            <Button
                                                type="button"
                                                onClick={addProductVariant}
                                                className="w-full"
                                            >
                                                <Plus className="h-4 w-4 mr-2" />
                                                Create Variant
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
                                    </div> */}

                                    {/* Product Variants */}
                                    {/* {productVariants && productVariants.length > 0 &&
                                        <div className="mb-6">
                                            <div className="space-y-[10px] flex flex-col-reverse gap-[2px] h-[250px] overflow-y-auto">

                                                {productVariants.map((item, idx) => (
                                                    <div
                                                        key={`${item.id}-${idx}`}
                                                        className="bg-card rounded-lg h-[35px] flex items-center px-4 gap-4 border border-border scrollbar-none"
                                                    >
                                                        <div>{idx + 1}.</div>
                                                        {<div className="font-sm flex flex-1">
                                                            {Object.values(item.attributes).join(" / ")}
                                                        </div>}
                                                        <Button
                                                            type="button"
                                                            variant="unstyled"
                                                            className="p-[0] hover:"
                                                            onClick={() => {
                                                                setProductVariants(prev => prev.filter((_, i) => i !== idx))
                                                            }}>
                                                            <X cursor={'pointer'} />
                                                        </Button>
                                                    </div>
                                                ))}
                                                <h2 className="text-sm font-semibold mb-6">Product Variants</h2>
                                            </div>
                                        </div>
                                    }
                                </div>

                                <div className="flex justify-end gap-3 mt-auto">
                                    <Button type="submit">Create Product And Variants</Button>
                                </div>
                            </div>
                                
                        </form> */}

                        <form onSubmit={handleSubmit(onInventoryItemCreate)} className="flex flex-row w-[48%] gap-12">

                            {/* Second Column */}
                            <div className="flex flex-col flex-wrap flex-1">
                                <h2 className="text-lg font-semibold mb-6">Add Inventory Item</h2>

                                <div className="flex gap-6 mb-6">
                                    <div className="w-[50%] space-y-1">
                                        <Label htmlFor="newItemProduct">Select Product</Label>
                                        <Controller
                                            name="newItemProduct"
                                            control={control}
                                            render={({ field }) => (
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select product" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {products && Object.keys(products).length > 0 && Object.entries(products).map(([key, item]) => (
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
                                        <Label htmlFor="newItemProductVariant">Select Product Variant</Label>
                                        <Controller
                                            name="newItemProductVariant"
                                            control={control}
                                            render={({ field }) => (
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select product variant" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {productVariants && Object.keys(productVariants).length > 0 && Object.entries(productVariants).map(([key, item]) => (
                                                            <SelectItem key={key} value={key}>
                                                                {item.product.name} ({item.name})
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                    </div>
                                    <div className="w-[50%] space-y-1">
                                        <Label htmlFor="newItemLocation">Location</Label>
                                        <Controller
                                            name="newItemLocation"
                                            control={control}
                                            render={({ field }) => (
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                                                    <SelectContent>
                                                        {locations && Object.keys(locations).length > 0 && Object.entries(locations).map(([key, item]) => (
                                                            <SelectItem key={key} value={key}>
                                                                {item.name}
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
                                        <Label htmlFor="newItemQuantity">Quantity</Label>
                                        <Input id="newItemQuantity" type="number" {...register("newItemQuantity")} />
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
                                    <Button type="submit">Create Inventory Item</Button>
                                </div>
                            </div>
                        </form>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default CreateInventoryItem;