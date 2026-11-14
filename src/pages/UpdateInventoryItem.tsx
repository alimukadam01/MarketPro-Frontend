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
    createIdMap,
    formatDate,
    todayForInput
} from "../../services/utils"
import { useAuth } from "../../services/AuthProvider"
import {
    getLocationsList,
    updateInventoryItem,
    getInventoryItemDetail,
    getInventoryMovementsAfter
} from "../../services/api"
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import { SubmitButton } from "@/components/ui/submit-button";
import { usePending } from "@/hooks/use-pending";
import { Spinner } from "@/components/ui/spinner";

const UpdateInventoryItem = () => {
  const { pending, run } = usePending();

    const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
    // True until the record arrives, which the spinner beside the title
    // reports. A failure is the only thing that toasts.
    const [detailLoading, setDetailLoading] = useState(true);
    const [productName, setProductName] = useState("")
    const [countedAt, setCountedAt] = useState<string | null>(null)
    // The quantity as loaded. Only a change to it is a new count, and only a
    // new count may carry a date (the server enforces the same). On hand and
    // reserved are not edited here: the server keeps on hand = quantity -
    // reserved (inventory/serializers.py, DERIVED_STOCK_FIELDS).
    const [loadedQuantity, setLoadedQuantity] = useState(0)
    const [countDate, setCountDate] = useState("")
    const [movements, setMovements] = useState(null)
    const [carryForward, setCarryForward] = useState(false)
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
    const { register, handleSubmit, control, reset, watch } = useForm({
        defaultValues: {
            track_code: "",
            notes: "",
            location: null,
            quantity: 0,
            unit_cost: 0.0,
            unit_price: 0.0,
            reorder_level: 0,
        },
    })

    const populateFields = (data) => {
        const product = data.product
        setProductName(`${product.base.name} (${product.name})`)
        setCountedAt(data.stock_counted_at || null)
        setLoadedQuantity(data.quantity || 0)
        reset({
            track_code: data.track_code || "",
            notes: data.notes || "",
            location: data.location || 0,
            quantity: data.quantity || 0,
            unit_cost: data.unit_cost || 0.0,
            unit_price: data.unit_price || 0.0,
            reorder_level: data.reorder_level || 0,
        })
    }

    const today = todayForInput()
    // Number inputs hand back strings once typed into; the defaults are numbers.
    const typedQuantity = parseInt(String(watch("quantity")))
    const quantityChanged = typedQuantity !== loadedQuantity

    // A new quantity is a count, dated today unless the user picks an earlier
    // day (counted at closing, typed in next morning). Undoing the change
    // undoes the date with it.
    useEffect(() => {
        if (quantityChanged) {
            setCountDate((current) => current || today)
        } else {
            setCountDate("")
            setCarryForward(false)
        }
    }, [quantityChanged, today])

    const isBackdated = quantityChanged && countDate !== "" && countDate < today
    const isFuture = quantityChanged && countDate > today

    // What has already moved this stock since the chosen day, so the user can
    // decide whether to carry it onto the count. A preview only: the save
    // recomputes it.
    useEffect(() => {
        if (!isBackdated || !token) {
            setMovements(null)
            return
        }
        const delay = setTimeout(async () => {
            try {
                const res = await getInventoryMovementsAfter(token, businessId, item_id, countDate)
                if (res) {
                    setMovements(res)
                } else {
                    setMovements(null)
                    toast.error("Failed to fetch what has moved since that date.")
                }
            } catch (error) {
                console.log("Error fetching stock movements:", error)
                toast.error("Failed to fetch what has moved since that date.")
            }
        }, 300)
        return () => clearTimeout(delay)
    }, [isBackdated, countDate, token, businessId, item_id])

    const hasMovements = isBackdated && movements
        && (movements.sold || movements.received || movements.returned)
    const applyCarry = hasMovements && carryForward

    // Mirrors the server: the net is added to the typed quantity, and on hand
    // follows it.
    const savedQuantity = applyCarry ? typedQuantity + movements.net : typedQuantity

    const onInventoryItemUpdate = async (data) => {

        if (isFuture) {
            toast.error("A stock count cannot be dated in the future.")
            return
        }

        const ReqData: Record<string, unknown> = {
            location: parseInt(data.location),
            quantity: parseInt(data.quantity),
            unit_cost: parseFloat(data.unit_cost),
            unit_price: parseFloat(data.unit_price),
            reorder_level: parseInt(data.reorder_level),
            notes: data.notes
        }

        // The date travels only with a new count; the server refuses it
        // otherwise.
        if (quantityChanged) {
            ReqData.stock_counted_at = countDate || today
            ReqData.carry_forward = Boolean(applyCarry)
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

        const fetchInventoryItem = async () => {
            if (!token) return
            try {
                const inventoryItem = await getInventoryItemDetail(token, businessId, item_id)
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

        const init = async () => {
            await fetchLocations()
            fetchInventoryItem().finally(() => setDetailLoading(false));
        }
        init()
    }, [token, item_id])

    return (
        <div className="min-h-screen bg-background">
            <Sidebar onCollapseChange={setSidebarCollapsed} />
            <div className={`${sidebarCollapsed ? "ml-16" : "ml-64"} transition-all duration-300 flex flex-col`}>
                <Header />

                <main className="flex-1 p-6 space-y-6">
                    {/* Breadcrumb */}
                    <DynamicBreadCrumb />

                    <div className="flex items-center justify-between">

                        <form onSubmit={handleSubmit(run(onInventoryItemUpdate))} className="flex flex-row w-[48%] gap-12">

                            {/* Second Column */}
                            <div className="flex flex-col flex-wrap flex-1">
                                <h2 className="flex items-center gap-3 text-lg font-semibold mb-6">Update Inventory Item{detailLoading && <Spinner size={18} label="Loading" color="hsl(var(--spinner))" />}</h2>

                                {/* One 4-column grid for every row, so the fields line up: product and
                                    location take two columns each, the numbers one each, the count
                                    date two. */}
                                <div className="grid grid-cols-4 gap-6 mb-6">
                                    <div className="col-span-2 space-y-1">
                                        <Label htmlFor="product">Product</Label>
                                        <Input
                                            id="product"
                                            disabled={true}
                                            value={productName}
                                        />
                                    </div>

                                    <div className="col-span-2 space-y-1">
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
                                                                {item.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                    </div>

                                </div>

                                <div className="grid grid-cols-4 gap-6 mb-6">
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


                                {/* Editable only with a new quantity: the date says when that
                                    figure was counted. Today or earlier, never later. */}
                                <div className="grid grid-cols-4 gap-6 mb-6">
                                    <div className="col-span-2 space-y-1">
                                        <Label htmlFor="stock_counted_at">Stock counted at</Label>
                                        {quantityChanged ? (
                                            <Input id="stock_counted_at" type="date" max={today}
                                                value={countDate}
                                                onChange={(e) => setCountDate(e.target.value)} />
                                        ) : (
                                            <Input id="stock_counted_at" type="text" disabled
                                                value={countedAt ? formatDate(countedAt) : "Not counted yet"}
                                                className="bg-muted disabled:opacity-100 disabled:text-foreground" />
                                        )}
                                        {isFuture ? (
                                            <p className="text-xs text-red-700">
                                                A stock count cannot be dated in the future.
                                            </p>
                                        ) : (
                                            <p className="text-xs text-muted-foreground">
                                                {quantityChanged
                                                    ? "The day you counted this figure. Sales and purchases dated on or before it do not move this stock."
                                                    : "Change the quantity to record a new count and set its date. Sales and purchases dated on or before it do not move this stock."}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {isBackdated && movements && (
                                    <div className="mb-6 space-y-2 rounded-md border bg-card px-4 py-3">
                                        {hasMovements ? (
                                            <>
                                                <p className="text-sm">
                                                    Recorded after {formatDate(countDate)}: {movements.sold} sold, {movements.received} received, {movements.returned} returned.
                                                </p>
                                                <label className="flex cursor-pointer items-start gap-2 text-sm">
                                                    <input type="checkbox" className="mt-0.5 h-4 w-4 accent-primary"
                                                        checked={carryForward}
                                                        onChange={(e) => setCarryForward(e.target.checked)} />
                                                    <span>
                                                        <span className="font-medium">Include these in the stock</span>
                                                        <span className="block text-xs text-muted-foreground">
                                                            Tick if you counted on {formatDate(countDate)} and these happened after your count. Leave unticked if your figure already reflects them.
                                                        </span>
                                                    </span>
                                                </label>
                                                <p className="text-sm text-muted-foreground">
                                                    Quantity will be saved as{" "}
                                                    <span className="font-semibold text-foreground">
                                                        {savedQuantity}
                                                    </span>.
                                                </p>
                                            </>
                                        ) : (
                                            <p className="text-sm text-muted-foreground">
                                                Nothing has moved this stock since {formatDate(countDate)}.
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div className="flex gap-6 mb-6">
                                    <div className="flex-1 space-y-1">
                                        <Label htmlFor="notes">Notes</Label>
                                        <Textarea id="notes" {...register("notes")} placeholder="Add notes here." rows={6} />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-auto">
                                    <SubmitButton type="submit" pending={pending} pendingLabel="Updating…">Update Inventory Item</SubmitButton>
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
