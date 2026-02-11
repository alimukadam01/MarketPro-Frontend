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
import {
  PaymentStatusMap,
  PurchaseInvoiceStatusMap,
  createIdMap
} from "../../services/utils"
import { useAuth } from "../../services/AuthProvider"
import {
  getProductsList,
  getSuppliersList,
  postPurchaseInvoiceAndItems
} from "../../services/api"
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";

const CreatePurchaseInvoice = () => {

  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [invoiceItems, setInvoiceItems] = useState([])
  const [selectedRows, setSelectedRows] = useState([])
  const [products, setProducts] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const { token } = useAuth()
  const navigate = useNavigate()

  // react-hook-form setup
  const { register, handleSubmit, control, watch, reset, setValue } = useForm({
    defaultValues: {
      invoice_number: "",
      amount_paid: "0.0",
      supplier: "",
      notes: "",
      delivery: new Date().toISOString().split("T")[0],
      date_due: new Date().toISOString().split("T")[0],
      tax: "0.0",
      payment_status: "P",
      status: "R",
      newItemProduct: "",
      newItemQuantity: 0,
      newItemCost: 0
    },
  })

  const tax = parseFloat(watch("tax") || 0)

  const subtotal = invoiceItems.reduce((sum, item) => sum + item.total, 0)
  const [taxType, setTaxType] = useState("percentage")
  const taxAmount = taxType === "percentage" ? (subtotal * tax) / 100 : tax
  const totalAmount = subtotal + taxAmount

  const onSubmit = async (data) => {

    const { newItemCost, newItemProduct, newItemQuantity, ...rest } = data

    const tax = {
      "value": parseFloat(data.tax),
      "type": taxType
    }

    const items = invoiceItems.map(item => ({
      product_id: item.product.id,
      quantity: item.quantity,
      unit_cost: item.unit_cost
    }))

    console.log("Form Data without item fields:", {
      ...rest,
      tax: tax,
      items: items
    })

    try {
      const success = await postPurchaseInvoiceAndItems(token, {
        ...rest,
        tax: tax,
        items: items
      })

      if (success) {
        toast.success("Purchase invoice created successfully!")
        navigate("/purchases");
      } else {
        toast.error("Failed to create purchase invoice.")
      }
    } catch (error) {
      console.log("Error creating purchase invoice:", error)
    }
  }

  const addItem = (product, quantity, unit_cost) => {
    if (product && quantity > 0) {
      const selectedProduct = products[product]
      const newInvoiceItem = {
        id: invoiceItems.length + 1,
        product: selectedProduct,
        quantity,
        unit_cost,
        total: quantity * unit_cost,
      }
      setInvoiceItems([...invoiceItems, newInvoiceItem])
      reset({ newItemProduct: "", newItemQuantity: 0 }, { keepValues: true })
    }
  }

  const toggleRowSelection = (id) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    )
  }

  useEffect(() => {
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

    const fetchSuppliers = async () => {
      try {
        const suppliers = await getSuppliersList(token)
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

    fetchProducts()
    fetchSuppliers()
  }, [token])

  return (
    <div className="min-h-screen bg-background">
      <Sidebar onCollapseChange={setSidebarCollapsed} />
      <div className={`${sidebarCollapsed ? "ml-16" : "ml-64"} transition-all duration-300 flex flex-col`}>
        <Header />

        <main className="flex-1 p-6 space-y-6">
          {/* Breadcrumb */}
          <DynamicBreadCrumb />

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-row gap-12">
            {/* First Column */}
            <div className="flex flex-col flex-wrap flex-1">
              <h2 className="text-lg font-semibold mb-6">Invoice Details</h2>

              <div className="flex gap-6 mb-6">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="invoice_number">Invoice no. (optional)</Label>
                  <Input id="invoice_number" {...register("invoice_number")} placeholder="Enter invoice number" />
                </div>
                <div className="flex-1 space-y-1">
                  <Label htmlFor="supplier">Supplier</Label>
                  <Controller
                    name="supplier"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select supplier"></SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers && Object.keys(suppliers).length > 0 && Object.entries(suppliers).map(([key, supplier]) => (
                            <SelectItem value={key} key={key}>
                              {supplier.name}
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
                <Textarea id="notes" {...register("notes")} placeholder="Add any additional notes here..." rows={4} />
              </div>

              <div className="flex gap-6 mb-6">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="date_due">Date Due</Label>
                  <Input id="date_due" type="date" {...register("date_due")} />
                </div>
                <div className="flex-1 space-y-1">
                  <Label htmlFor="delivery">Delivery Date</Label>
                  <Input id="delivery" type="date" {...register("delivery")} />
                </div>
              </div>

              <div className="flex gap-6 mb-6">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="tax">Tax</Label>
                  <div className="relative">
                    <Input id="tax" {...register("tax")} placeholder="0.0" />
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {taxType === "percentage" ? <Button type="button" variant="outline" onClick={() => setTaxType("amount")}>%</Button> : <Button type="button" variant="outline" onClick={() => setTaxType("percentage")}>PKR</Button>}
                    </span>
                  </div>
                </div>
                <div className="flex-1 space-y-1">
                  <Label htmlFor="amount_paid">Amount Paid</Label>
                  <div className="relative">
                    <Input id="amount_paid" {...register("amount_paid")} placeholder="0.0" />
                  </div>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="payment_status">Payment Status</Label>
                  <Controller
                    name="payment_status"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger><SelectValue placeholder="Select payment status" /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(PaymentStatusMap).map(([key, value]) => (
                            <SelectItem value={key} key={key}>
                              {value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
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
                          {Object.entries(PurchaseInvoiceStatusMap).map(([key, value]) => (
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
            </div>

            {/* Second Column */}
            <div className="flex flex-col flex-wrap flex-1">
              <h2 className="text-lg font-semibold mb-6">Add Invoice Item</h2>

              <div className="flex gap-6 mb-6">
                <div className="w-[60%] space-y-1">
                  <Label htmlFor="newItemProduct">Select Product</Label>
                  <Controller
                    name="newItemProduct"
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
                </div>
                <div className="w-[20%] space-y-1">
                  <Label htmlFor="newItemQuantity">Quantity</Label>
                  <Input id="newItemQuantity" type="number" {...register("newItemQuantity")} />
                </div>
                <div className="w-[20%] space-y-1">
                  <Label htmlFor="newItemCost">Unit Cost</Label>
                  <Input id="newItemCost" type="number" {...register("newItemCost")} />
                </div>
                <div className="w-[20%] flex items-end">
                  <Button
                    type="button"
                    onClick={() =>
                      addItem(watch("newItemProduct"), parseInt(watch("newItemQuantity") || 0), parseFloat(watch("newItemCost") || 0.0))
                    }
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              </div>

              {/* Invoice Items Header */}
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">Invoice Items</h3>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setInvoiceItems(invoiceItems.filter(item => !selectedRows.includes(item.id)));
                    setSelectedRows([]);
                  }}
                  disabled={selectedRows.length === 0}
                >
                  <Trash2 className="w-4 mr-2" />
                  Delete Selected
                </Button>
              </div>

              {/* Invoice Items */}
              <div className="mb-6">
                <div className="space-y-[10px] h-[174px] overflow-y-auto">
                  <div className="bg-card rounded-lg border h-[35px] flex items-center px-4">
                    <div className="grid grid-cols-[48px_2fr_1fr_1fr_1fr] gap-4 w-full text-sm font-medium text-muted-foreground">
                      <div>id</div>
                      <div>product</div>
                      <div>quantity</div>
                      <div>unit cost</div>
                      <div>total</div>
                    </div>
                  </div>

                  {invoiceItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => toggleRowSelection(item.id)}
                      className={`bg-card rounded-lg h-[35px] flex items-center px-4 cursor-pointer hover:bg-muted/20 ${selectedRows.includes(item.id) ? "border-2 border-[#4285F4]" : "border border-border"
                        }`}
                    >
                      <div className="grid grid-cols-[48px_2fr_1fr_1fr_1fr] gap-4 w-full text-sm">
                        <div>{item.id}</div>
                        <div className="font-medium">{item.product.name}</div>
                        <div>{item.quantity}</div>
                        <div>{item.unit_cost}</div>
                        <div className="font-semibold">{item.total}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-6 mb-6">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="subtotal">Subtotal</Label>
                  <Input id="subtotal" value={subtotal.toLocaleString()} readOnly />
                </div>
                <div className="flex-1 space-y-1">
                  <Label htmlFor="totalAmount">Total</Label>
                  <Input id="totalAmount" value={totalAmount.toLocaleString()} readOnly className="font-semibold" />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-auto">
                <Button type="submit">Create Invoice</Button>
              </div>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}

export default CreatePurchaseInvoice;
