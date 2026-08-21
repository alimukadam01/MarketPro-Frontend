import { useState, useEffect } from "react";
import { toast } from "sonner"
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import {
  PaymentStatusMap,
  PurchaseInvoiceStatusMap,
  createIdMap,
  transformProductVariant,
  derivePaymentStatus,
  getPaymentStatusColor
} from "../../services/utils"
import { useAuth } from "../../services/AuthProvider"
import {
  getProductVariantsList,
  suppliersAPIPackage,
  updatePurchaseInvoiceAndItems,
  getPurchaseInvoiceDetail,
  projectsAPIPackage
} from "../../services/api"
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import Payments from "@/components/ui/payments";

const UpdatePurchaseInvoice = () => {

  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [paymentsOpen, setPaymentsOpen] = useState(false)
  const [invoiceItems, setInvoiceItems] = useState([])
  const [products, setProducts] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [projects, setProjects] = useState([])
  const [amountPaid, setAmountPaid] = useState(0)
  const { token } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const invoice_id = location.state?.invoice_id || null

  // react-hook-form setup
  const { register, handleSubmit, control, watch, reset, setValue } = useForm({
    defaultValues: {
      invoice_number: "",
      supplier: "",
      notes: "",
      delivery: "",
      date_due: "",
      tax: "0.0",
      status: "",
      project: null,
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
  const selectedProduct = products[watch("newItemProduct")]
  const paymentStatus = derivePaymentStatus(amountPaid, totalAmount)

  const onSubmit = async (data) => {

    const { newItemCost, newItemProduct, newItemQuantity, ...rest } = data

    const tax = {
      "value": parseFloat(data.tax),
      "type": taxType
    }

    const items = invoiceItems.map(item => ({
      id: item.id ? item.id : null,
      product_id: item.product.id,
      quantity: item.quantity,
      unit_cost: item.unit_cost,
    }))

    console.log({
      ...rest,
      tax: tax,
      items: items
    })

    try {
      const success = await updatePurchaseInvoiceAndItems(token, invoice_id, {
        ...rest,
        tax: tax,
        items: items
      })

      if (success) {
        toast.success("Purchase invoice updated successfully!")
        navigate(-1);
      } else {
        toast.error("Failed to update purchase invoice.")
      }
    } catch (error) {
      console.log("Error creating purchase invoice:", error)
    }
  }

  const addItem = (product, quantity, unit_cost) => {
    if (product && quantity > 0) {
      const selectedProduct = products[product]
      const newInvoiceItem = {
        product: selectedProduct,
        quantity,
        unit_cost,
        total: quantity * unit_cost,
      }
      setInvoiceItems([...invoiceItems, newInvoiceItem])
      reset({ newItemProduct: "", newItemQuantity: 0 }, { keepValues: true })
    }
  }

  const updateItem = (id, product, quantity, unit_cost) => {
    return
  }

  const handleDeleteItem = (e, target) => {
    e.preventDefault();
    setInvoiceItems(invoiceItems.filter(item => item !== target));
  }

  const populateInvoiceFields = (data) => {
    // fill the main form fields
    reset({
      invoice_number: data.invoice_number || "",
      supplier: data.supplier,
      notes: data.notes || "",
      delivery: data.delivery?.split("T")[0] || "",
      date_due: data.date_due || "",
      tax: data.tax?.value ?? "0.0",
      status: data.status,
      project: data.projects?.length > 0 ? String(data.projects[0].project) : null,
      newItemProduct: "",
      newItemQuantity: 0,
      newItemCost: 0,
    })

    setAmountPaid(data.amount_paid || 0)

    // build your items array for state
    const items = (data.invoice_items || []).map((item) => ({
      id: item.id,
      product: transformProductVariant(item.product),
      quantity: item.quantity,
      unit_cost: item.unit_cost,
      total: (item.quantity * item.unit_cost),
    }))
    setInvoiceItems(items)
    setTaxType(data.tax?.type)
  }

  const fetchPurchaseInvoice = async () => {
    if (!token) return
    try {
      const purchaseInvoice = await getPurchaseInvoiceDetail(token, invoice_id)
      if (purchaseInvoice) {
        populateInvoiceFields(purchaseInvoice)
      } else {
        toast.error("Failed to fetch purchase invoice")
      }
    } catch (error) {
      console.log(error)
      toast.error("Failed to fetch purchase invoice")
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

    const fetchProjects = async () => {
      try {
        const data = await projectsAPIPackage.list(token)
        if (data) {
          setProjects(createIdMap(data))
        } else {
          toast.error("Failed to fetch projects")
        }
      } catch (error) {
        console.log("Error fetching projects:", error)
        toast.error("Failed to fetch projects")
      }
    }

    const init = async () => {
      await Promise.all([
        fetchProducts(),
        fetchSuppliers(),
        fetchProjects(),
      ])

      fetchPurchaseInvoice()
    }

    init()
  }, [token, invoice_id])

  useEffect(() => {
    if (selectedProduct) {
      setValue("newItemCost", selectedProduct.unit_Cost, { shouldDirty: false });
    }
  }, [selectedProduct])

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
                  <Label htmlFor="delivery">Delivery</Label>
                  <Input id="delivery" type="date" {...register("delivery")} />
                </div>
                <div className="flex-1 space-y-1">
                  <Label htmlFor="date_due">Date Due</Label>
                  <Input id="date_due" type="date" {...register("date_due")} />
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
              <div className="flex justify-between items-center mb-0.5">
                <h3 className="text-lg font-semibold">Invoice Items</h3>
              </div>

              {/* Invoice Items */}
              {/* Measured in-browser: 188px puts this row exactly level with Discount/Tax
                  in the left column. */}
              <div className="mb-6">
                <div className="space-y-[10px] h-[188px] overflow-y-auto">
                  {/* Sticky rather than lifted out of the scroll box, so the
                      header can never drift out of step with the rows when a
                      scrollbar appears. */}
                  <div className="sticky top-0 z-10 bg-background flex items-center gap-2">
                    <div className="bg-card rounded-lg border h-[35px] flex flex-1 items-center px-4">
                      <div className="grid grid-cols-[48px_2fr_1fr_1fr_1fr] gap-4 w-full text-sm font-medium text-muted-foreground">
                        <div>#</div>
                        <div>product</div>
                        <div>quantity</div>
                        <div>unit cost</div>
                        <div>total</div>
                      </div>
                    </div>
                    {/* Matches the 16px delete button sitting outside each row. */}
                    <div className="w-4" />
                  </div>

                  {invoiceItems.map((item, idx) => (
                    <div key={`${item.id}-${idx}`} className="flex items-center gap-2">
                      <div className="bg-card rounded-lg h-[35px] flex flex-1 items-center px-4 border border-border">
                        <div className="grid grid-cols-[48px_2fr_1fr_1fr_1fr] gap-4 w-full text-sm">
                          <div>{idx + 1}</div>
                          <div className="font-medium">{
                            item.product.base ?
                              `${item.product.base.name} (${item.product.name})` :
                              item.product.name
                          }</div>
                          <div>{item.quantity}</div>
                          <div>{item.unit_cost}</div>
                          <div className="font-semibold">{item.total}</div>
                        </div>
                      </div>
                      <div className="flex items-center h-7">
                        <Button
                          type="button"
                          variant="unstyled"
                          className="p-0 hover:text-red-500"
                          title="Delete item"
                          onClick={(e) => handleDeleteItem(e, item)}
                        >
                          <Trash2 cursor={'pointer'} />
                        </Button>
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

              <div className="flex gap-6">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="amount_paid">Amount Paid</Label>
                  {/* Driven by the payments dialog, never typed into, so it is
                      disabled rather than readOnly - readOnly still takes focus
                      and reads as an editable field. */}
                  <Input
                    id="amount_paid"
                    className="disabled:opacity-100 disabled:cursor-default"
                    value={`PKR ${Number(amountPaid).toLocaleString()}`}
                    disabled
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label>Payment Status</Label>
                  <div className="flex h-10 items-center">
                    <span
                      className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${getPaymentStatusColor(paymentStatus)}`}
                    >
                      {PaymentStatusMap[paymentStatus]}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 mt-6">
                <div className="flex justify-end gap-3">
                  <Controller
                    name="project"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={(val) => field.onChange(val === "none" ? null : val)} value={field.value ?? "none"}>
                        <SelectTrigger className="w-36">
                          <SelectValue placeholder="Add to project" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No project</SelectItem>
                          {projects && Object.keys(projects).length > 0 && Object.entries(projects).map(([key, project]) => (
                            <SelectItem value={key} key={key}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <Button type="button" variant="outline" className="w-36" onClick={() => setPaymentsOpen(true)}>Add Payment</Button>
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="submit" className="w-36">Update Invoice</Button>
                </div>
              </div>
            </div>
          </form>
          <Payments invoiceId={invoice_id} invoiceTotal={totalAmount} open={paymentsOpen} setOpen={setPaymentsOpen} isSalesPayment={false} onPaymentsChanged={fetchPurchaseInvoice} />
        </main>
      </div>
    </div>
  );
}

export default UpdatePurchaseInvoice;
