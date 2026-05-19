import { useState, useEffect } from "react";
import { toast } from "sonner"
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, RotateCcwIcon, RefreshCcwIcon, CheckCircle2Icon } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import {
    createIdMap,
    PQStatusMap
} from "../../services/utils"
import { useAuth } from "../../services/AuthProvider"
import {
    suppliersAPIPackage,
    purchaseQuotationsAPIPackage,
    getProductVariantsList,
    updatePurchaseQuotationAndItems

} from "../../services/api"
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import { ReadStream } from "fs";

const UpdatePurchaseQuotation = () => {

    const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
    const [quotationItems, setQuotationItems] = useState([])
    const [itemValidationErrors, setItemValidationErrors] = useState([])
    const [products, setProducts] = useState(null)
    const [suppliers, setSuppliers] = useState(null)

    const { token } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const purchase_quotation_id = location.state?.purchase_quotation_id || null

    // react-hook-form setup
    const { register, handleSubmit, control, watch, reset, setValue } = useForm({
        defaultValues: {
            quotation_no: "",
            status: "",
            notes: "",
            product: "",
            supplier: "",
            unit_price: 0.0,
            quantity: 0
        }
    })

    const addQuotationItem = async (product, supplier, quantity, unit_price) => {
        const errors = {};
        if (!product) errors.product = "Product is required";
        if (!supplier) errors.supplier = "Supplier is required";
        if (!quantity || quantity === "" || quantity === "0") errors.quantity = "Quantity is required";
        if (!unit_price || unit_price === "" || unit_price === "0") errors.unit_price = "Unit price is required";
        setItemValidationErrors(errors);

        if (Object.keys(errors).length > 0) return;

        setQuotationItems((prev) => ([...prev, {
            product_id: parseInt(product),
            supplier_id: parseInt(supplier),
            quantity: parseInt(quantity),
            unit_price: parseFloat(unit_price)
        }]))
    }

    const populatePurchaseQuotationFields = (data) => {
        reset({
            quotation_no: data.quotation_no || "",
            status: data.status || "",
            notes: data.notes
        })
        setQuotationItems(data.items.map((item)=>({
            id: item.id,
            product_id: item.product.id,
            supplier_id: item.supplier.id,
            quantity: item.quantity,
            unit_price: item.unit_price
        })))
    }

    const onPurchaseQuotationUpdate = async (data) => {

        const { product, supplier, unit_price, quantity, ...rest } = data

        try {
            const success = await updatePurchaseQuotationAndItems(token, purchase_quotation_id, {
                ...rest,
                items: quotationItems
            })

            if (success) {
                toast.success("Purchase Quotation updated successfully!")
                navigate(-1)
            } else {
                toast.error("Failed to update purchase quotation.")
            }
        } catch (error) {
            console.log("Error updating purchase quotation:", error)
        }
    }

    useEffect(() => {
        const fetchProducts = async () => {
            if (!token) return;

            try {
                const products = await getProductVariantsList(token)
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

        const fetchSuppliers = async () => {
            try {
                const suppliers = await suppliersAPIPackage.list(token)
                if (suppliers) {
                    const supplierMap = createIdMap(suppliers)
                    setSuppliers(supplierMap)
                } else {
                    toast.error("Failed to fetch suppliers")
                }
            } catch (error) {
                console.log("Error fetching suppliers:", error)
                toast.error("Failed to fetch suppliers")
            }
        }

        const fetchPurchaseQuotation = async () => {
            if (!token) return
            if (!purchase_quotation_id) return

            try {
                const purchase_quotation = await purchaseQuotationsAPIPackage.detail(token, purchase_quotation_id)
                if (purchase_quotation) {
                    populatePurchaseQuotationFields(purchase_quotation)
                } else {
                    toast.error("Failed to fetch purchase quotation.")
                    navigate("/purchase-quotations")
                }
            } catch (error) {
                console.log(error)
                toast.error("Failed to fetch purchase quotation.")
                navigate("/purchase-quotations")
            }
        }

        const init = async () => {
            await Promise.all([
                fetchSuppliers(),
                fetchProducts(),
            ])
            fetchPurchaseQuotation()
        }
        init()
    }, [token, purchase_quotation_id])

    return (
        <div className="min-h-screen bg-background">
            <Sidebar onCollapseChange={setSidebarCollapsed} />
            <div className={`${sidebarCollapsed ? "ml-16" : "ml-64"} transition-all duration-300 flex flex-col`}>
                <Header />

                <main className="flex-1 p-6 space-y-6">
                    {/* Breadcrumb */}
                    <DynamicBreadCrumb />

                    <form onSubmit={handleSubmit(onPurchaseQuotationUpdate)} className="flex flex-col flex-1">
                        <h2 className="text-lg font-semibold mb-6">Update Project Quotation</h2>
                        <div
                            className="flex flex-row gap-12 h-auto"
                        >
                            <div className="flex flex-col flex-wrap flex-1">

                                <div className="flex gap-6 mb-6">
                                    <div className="flex-1 space-y-1">
                                        <Label htmlFor="quotation_no">Quotation Number</Label>
                                        <Input id="quotation_no" type="text" {...register("quotation_no")} />
                                    </div>

                                    <div className="flex-1 space-y-1">
                                        <Label htmlFor="status">Status</Label>
                                        <Controller
                                            name="status"
                                            control={control}
                                            render={({ field }) => (
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                                                    <SelectContent>
                                                        {Object.entries(PQStatusMap).map(([key, value]) => (
                                                            <SelectItem value={key} key={key}>
                                                                {value}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="mb-6 space-y-1">
                                    <Label htmlFor="notes">Notes</Label>
                                    <Textarea
                                        id="notes"
                                        className="min-h-[350px]"
                                        {...register("notes")}
                                        placeholder="Enter notes here"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col flex-wrap flex-1 gap-1">
                                <div className="flex gap-1">
                                    <div className="flex-1 space-y-1">
                                        <Label htmlFor="product">Select Product <span className="text-red-500">*</span></Label>
                                        <Controller
                                            name="product"
                                            control={control}
                                            render={({ field }) => (
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
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
                                        {itemValidationErrors.product && <span className="text-red-500 text-sm">{itemValidationErrors.product}</span>}
                                    </div>

                                    <div className="flex-1 space-y-1">
                                        <Label htmlFor="supplier">Select Supplier <span className="text-red-500">*</span></Label>
                                        <Controller
                                            name="supplier"
                                            control={control}
                                            render={({ field }) => (
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                                                    <SelectContent>
                                                        {suppliers && Object.keys(suppliers).length > 0 && Object.entries(suppliers).map(([key, item]) => (
                                                            <SelectItem key={key} value={key}>
                                                                {item.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                        {itemValidationErrors.supplier && <span className="text-red-500 text-sm">{itemValidationErrors.supplier}</span>}
                                    </div>

                                    <div className="flex-1 space-y-1">
                                        <Label htmlFor="unit_price">Unit Price <span className="text-red-500">*</span></Label>
                                        <Input id="unit_price" type="number" {...register("unit_price")} />
                                        {itemValidationErrors.unit_price && <span className="text-red-500 text-sm">{itemValidationErrors.unit_price}</span>}
                                    </div>

                                    <div className="flex-1 space-y-1">
                                        <Label htmlFor="quantity">Quantity <span className="text-red-500">*</span></Label>
                                        <Input id="quantity" type="number" {...register("quantity")} />
                                        {itemValidationErrors.quantity && <span className="text-red-500 text-sm">{itemValidationErrors.quantity}</span>}
                                    </div>
                                </div>

                                <Button type="button" variant="outline"
                                    onClick={() => addQuotationItem(
                                        watch("product"),
                                        watch("supplier"),
                                        watch("quantity"),
                                        watch("unit_price"),
                                    )}>
                                    <Plus />
                                    Add Quotation Item
                                </Button>

                                <div className="flex flex-col gap-1 h-[380px] overflow-y-auto">
                                    {quotationItems && quotationItems.length > 0 && quotationItems.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="bg-card rounded-lg flex items-center px-4 py-2 border border-border box-border"
                                        >
                                            <div className="flex flex-col gap-1 text-sm flex-1">
                                                <div className="flex-col">
                                                    <div className="flex items-center justify-between">
                                                        <div className="font-medium">{products && products[item.product_id].name} by {suppliers && suppliers[item.supplier_id].name}</div>
                                                        <Button
                                                            type="button"
                                                            variant="unstyled"
                                                            className="p-0 hover:text-red-500 h-[10px]"
                                                            onClick={() => {
                                                                setQuotationItems(prev => prev.filter((_, i) => i !== idx))
                                                            }}>
                                                            <X cursor={'pointer'} />
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div className="text-muted-foreground">{item.quantity} x PKR {item.unit_price}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mt-[20px] flex justify-end">
                            <Button type="submit">
                                <CheckCircle2Icon />
                                Update Purchase Quotation
                            </Button>
                        </div>
                    </form>
                </main>
            </div>
        </div>
    );
}

export default UpdatePurchaseQuotation;