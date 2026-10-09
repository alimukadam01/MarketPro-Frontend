import { useState, useEffect, useMemo } from "react";
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
  formatPartyLabel,
  PaymentStatusMap,
  PurchaseInvoiceStatusMap,
  createIdMap,
  transformProductVariant,
  dateInputToDateTime,
  derivePaymentStatus,
  getPaymentStatusColor,
  nullIfBlank
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
import { SubmitButton } from "@/components/ui/submit-button";
import { usePending } from "@/hooks/use-pending";
import { Combobox } from "@/components/ui/combobox";
import { Spinner } from "@/components/ui/spinner";

type PurchaseInvoiceFormItem = {
  // Absent on a row added in this session; the API assigns it on save.
  id?: number
  // Either shape, which is why the row renders it defensively. A row loaded
  // from the record goes through transformProductVariant and is flat, with
  // name already "Base (Variant)"; a row added here keeps the raw variant
  // off the products list, which still has its nested base.
  product: { id: number, name: string, base?: { name: string } }
  quantity: number
  unit_cost: number
  total: number
}

/**
 * Everything the form holds, which is the whole invoice.
 *
 * Stated explicitly because react-hook-form otherwise infers the shape from
 * defaultValues, and that inference collapses once items is in there - paths
 * resolve to `never` and setValue stops typechecking on valid fields.
 *
 * The `string | number` members are not laziness: an <Input> reads back as a
 * string while the API sends a number, and these fields genuinely hold either
 * depending on whether the user has touched them since the record loaded.
 */
type PurchaseInvoiceFormValues = {
  invoice_number: string
  supplier: string | number
  notes: string
  date_issued: string
  delivery: string
  date_due: string
  tax: string | number
  tax_type: string
  status: string
  project: string | null
  items: PurchaseInvoiceFormItem[]
  amount_paid: number
  newItemProduct: string
  newItemQuantity: string | number
  newItemCost: string | number
}

const UpdatePurchaseInvoice = () => {
  const { pending, run } = usePending();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  // True until the record arrives, which the spinner beside the title
  // reports. A failure is the only thing that toasts.
  const [detailLoading, setDetailLoading] = useState(true);
  const [paymentsOpen, setPaymentsOpen] = useState(false)
  const [products, setProducts] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [projects, setProjects] = useState([])
  // One flag per list - see the note on UpdateSalesInvoice: reset() lands before
  // the options do.
  const [productsLoading, setProductsLoading] = useState(true)
  const [suppliersLoading, setSuppliersLoading] = useState(true)
  const [projectsLoading, setProjectsLoading] = useState(true)
  const { token } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const invoice_id = location.state?.invoice_id || null

  // react-hook-form setup.
  //
  // The whole invoice lives here, including the line items, the
  // percentage/amount toggle and the paid figure. Nothing about the record is
  // kept in a useState beside it, so populateInvoiceFields is a single reset()
  // and there is only one place a field can come from. See UpdateSalesInvoice,
  // where a second home for the same value is what made it arrive undefined.
  const { register, handleSubmit, control, watch, reset, setValue } = useForm<PurchaseInvoiceFormValues>({
    defaultValues: {
      invoice_number: "",
      supplier: "",
      notes: "",
      date_issued: "",
      delivery: "",
      date_due: "",
      tax: "0.0",
      // Whether tax is a percentage or a flat amount. Part of the record, so
      // it belongs in the form rather than in useState.
      tax_type: "percentage",
      status: "",
      project: null,
      items: [],
      // Derived server-side from the payments recorded against the invoice.
      // Shown, never typed into, and never submitted.
      amount_paid: 0,
      newItemProduct: "",
      newItemQuantity: 0,
      newItemCost: 0
    },
  })

  const tax = parseFloat(String(watch("tax") || 0))
  const taxType = watch("tax_type")
  const invoiceItems = watch("items") || []
  const amountPaid = watch("amount_paid") || 0

  const subtotal = invoiceItems.reduce((sum, item) => sum + item.total, 0)
  const taxAmount = taxType === "percentage" ? (subtotal * tax) / 100 : tax
  const totalAmount = subtotal + taxAmount
  const selectedProduct = products[watch("newItemProduct")]
  const paymentStatus = derivePaymentStatus(amountPaid, totalAmount)

  const onSubmit = async (data) => {

    // Named field by field rather than spread from the form. The form now
    // holds everything about the invoice, including the toggle and the paid
    // figure, and a spread would post all of it - so listing the payload is
    // what keeps a new form field from silently becoming a new API field.
    const payload = {
      invoice_number: data.invoice_number,
      supplier: data.supplier,
      notes: data.notes,
      // date_issued is a DateTimeField; date_due and delivery are both
      // nullable, and an empty date input posts "" which the API rejects.
      date_issued: dateInputToDateTime(data.date_issued),
      delivery: nullIfBlank(data.delivery),
      date_due: nullIfBlank(data.date_due),
      status: data.status,
      project: data.project,
      // The type comes from the record through the form and is never
      // defaulted here: an absent one is dropped by JSON.stringify and then
      // raises KeyError('type') in adjust_totals on the server.
      tax: {
        "value": parseFloat(String(data.tax)) || 0,
        "type": data.tax_type
      },
      items: (data.items || []).map(item => ({
        id: item.id ? item.id : null,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
      })),
    }

    try {
      const success = await updatePurchaseInvoiceAndItems(token, invoice_id, payload)

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
      setValue("items", [...invoiceItems, newInvoiceItem])
      setValue("newItemProduct", "")
      setValue("newItemQuantity", 0)
    }
  }

  const updateItem = (id, product, quantity, unit_cost) => {
    return
  }

  const handleDeleteItem = (e, target) => {
    e.preventDefault();
    // Matched by identity rather than id, because a row added in this session
    // has no id yet.
    setValue("items", invoiceItems.filter(item => item !== target));
  }

  // The whole record in, the whole form out, in one write.
  //
  // Every key of defaultValues appears below. That is the point: the form is
  // the only store, so anything missing here would be left over from the
  // previous invoice rather than quietly defaulted, and reset() replaces the
  // lot atomically. There is deliberately no setX() beside it.
  const populateInvoiceFields = (data) => {
    const {
      invoice_number,
      supplier,
      notes,
      date_issued,
      delivery,
      date_due,
      tax,
      status,
      projects,
      amount_paid,
      invoice_items,
    } = data

    reset({
      invoice_number: invoice_number || "",
      supplier: supplier,
      notes: notes || "",
      // A DateTimeField, and an <Input type="date"> rejects a full ISO datetime.
      date_issued: date_issued?.split("T")[0] || "",
      delivery: delivery?.split("T")[0] || "",
      date_due: date_due || "",
      tax: tax?.value ?? "0.0",
      // Falling back rather than taking the stored value as-is: an undefined
      // type is dropped by JSON.stringify, and the API rejects a tax with no
      // type at all.
      tax_type: tax?.type || "percentage",
      status: status,
      project: projects?.length > 0 ? String(projects[0].project) : null,
      items: (invoice_items || []).map((item) => ({
        id: item.id,
        product: transformProductVariant(item.product),
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        total: (item.quantity * item.unit_cost),
      })),
      amount_paid: amount_paid || 0,
      newItemProduct: "",
      newItemQuantity: 0,
      newItemCost: 0,
    })
  }

  const supplierOptions = useMemo(
    () => Object.entries(suppliers).map(([value, supplier]) => ({
      value,
      label: formatPartyLabel(supplier),
      keywords: [supplier.name, supplier.business_name].filter(Boolean),
    })),
    [suppliers])

  const productOptions = useMemo(
    () => Object.entries(products).map(([value, item]) => ({
      value,
      label: item.name,
    })),
    [products])

  const projectOptions = useMemo(
    () => Object.entries(projects).map(([value, project]) => ({
      value,
      label: project.name,
    })),
    [projects])

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
      } finally {
        setProductsLoading(false)
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
      } finally {
        setSuppliersLoading(false)
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
      } finally {
        setProjectsLoading(false)
      }
    }

    const init = async () => {
      await Promise.all([
        fetchProducts(),
        fetchSuppliers(),
        fetchProjects(),
      ])

      fetchPurchaseInvoice().finally(() => setDetailLoading(false));
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

          <form onSubmit={handleSubmit(run(onSubmit))} className="flex flex-row gap-12">
            {/* First Column */}
            <div className="flex flex-col flex-wrap flex-1">
              <h2 className="flex items-center gap-3 text-lg font-semibold mb-6">Invoice Details{detailLoading && <Spinner size={18} label="Loading" color="hsl(var(--spinner))" />}</h2>

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
                      <Combobox
                        id="supplier"
                        options={supplierOptions}
                        value={field.value}
                        onChange={field.onChange}
                        loading={suppliersLoading}
                        placeholder="Select supplier"
                        emptyText="No suppliers yet. Add one first."
                        notFoundText="No supplier matches that."
                      />
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
                  <Label htmlFor="date_issued">Invoice Date</Label>
                  <Input id="date_issued" type="date" {...register("date_issued")} />
                </div>
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
                      {taxType === "percentage" ? <Button type="button" variant="outline" onClick={() => setValue("tax_type", "amount")}>%</Button> : <Button type="button" variant="outline" onClick={() => setValue("tax_type", "percentage")}>PKR</Button>}
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
                      <Combobox
                        id="newItemProduct"
                        options={productOptions}
                        value={field.value}
                        onChange={field.onChange}
                        loading={productsLoading}
                        placeholder="Select product"
                        emptyText="No products yet."
                        notFoundText="No product matches that."
                      />
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
                      addItem(watch("newItemProduct"), parseInt(String(watch("newItemQuantity") || 0)), parseFloat(String(watch("newItemCost") || 0.0)))
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
                    <div className="bg-card rounded-lg border min-h-[35px] py-0.5 flex flex-1 items-center px-4">
                      <div className="grid grid-cols-[48px_2fr_1fr_1fr_1fr] items-center gap-4 w-full text-sm font-medium text-muted-foreground">
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
                      <div className="bg-card rounded-lg min-h-[35px] py-0.5 flex flex-1 items-center px-4 border border-border">
                        <div className="grid grid-cols-[48px_2fr_1fr_1fr_1fr] items-center gap-4 w-full text-sm">
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
                      <Combobox
                        id="project"
                        className="w-36"
                        options={projectOptions}
                        value={field.value ?? ""}
                        onChange={(val) => field.onChange(val || null)}
                        loading={projectsLoading}
                        placeholder="Add to project"
                        emptyText="No projects yet."
                        notFoundText="No project matches that."
                        clearable
                      />
                    )}
                  />
                  <Button type="button" variant="outline" className="w-36" onClick={() => setPaymentsOpen(true)}>Add Payment</Button>
                </div>
                <div className="flex justify-end gap-3">
                  <SubmitButton type="submit" className="w-36" pending={pending} pendingLabel="Updating…">Update Invoice</SubmitButton>
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
