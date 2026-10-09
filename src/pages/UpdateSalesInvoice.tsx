import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner"
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Send, Trash2, Undo2 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import {
  PaymentStatusMap,
  SalesInvoiceStatusMap,
  createIdMap,
  createNestedIdMap,
  dateInputToDateTime,
  derivePaymentStatus,
  getPaymentStatusColor,
  nullIfBlank,
  todayForInput
} from "../../services/utils"
import { useAuth } from "../../services/AuthProvider"
import {
  getAvailableProductsList,
  getCustomersList,
  updateSalesInvoiceAndItems,
  getSalesInvoiceDetail,
  getInvoicePDFData,
  projectsAPIPackage
} from "../../services/api"
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import ReturnItem from "@/components/ui/return-item";
import Payments from "@/components/ui/payments";
import WalkInCustomer from "@/components/ui/walk-in-customer";
import { useInvoiceActions } from "@/hooks/use-invoice-actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { usePending } from "@/hooks/use-pending";
import { Combobox } from "@/components/ui/combobox";
import { Spinner } from "@/components/ui/spinner";

type SalesInvoiceFormItem = {
  id: number
  product: { id: number, name: string, base: { name: string } }
  quantity: number
  unit_price: number
  total: number
  is_returned?: boolean
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
type SalesInvoiceFormValues = {
  invoice_number: string
  customer: string | number
  notes: string
  date_issued: string
  date_due: string
  discount: string | number
  discount_type: string
  tax: string | number
  tax_type: string
  status: string
  project: string | null
  items: SalesInvoiceFormItem[]
  amount_paid: number
  newItemProduct: string
  newItemQuantity: string | number
  newItemPrice: string | number
}

const UpdateSalesInvoice = () => {
  const { pending, run } = usePending();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  // True until the record arrives, which the spinner beside the title
  // reports. A failure is the only thing that toasts.
  const [detailLoading, setDetailLoading] = useState(true);
  const [returnItemWindowOpen, setReturnItemWindowOpen] = useState(false)
  const [paymentsOpen, setPaymentsOpen] = useState(false)
  const [itemReturned, setItemReturned] = useState(false)
  const [returningItem, setReturningItem] = useState(null)
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [projects, setProjects] = useState([])
  // One flag per list. They matter more here than on the Create pages: the form
  // is reset() from the invoice fetch while the options arrive from their own
  // requests, so for a moment every picker holds an id it cannot yet name.
  const [productsLoading, setProductsLoading] = useState(true)
  const [customersLoading, setCustomersLoading] = useState(true)
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [pdfData, setPdfData] = useState(null)
  const { token } = useAuth()
  const businessId = localStorage.getItem("mp-business-id")
  const navigate = useNavigate()
  const location = useLocation()
  const invoice_id = location.state?.invoice_id || null

  // Download never prompts. Sending prompts only for a counter sale; the
  // capture returns the reassigned invoice, so the page refreshes from it
  // without another round trip.
  const {
    downloadInvoice, sendOnWhatsApp, isDownloading, isSending, isBusy,
    walkInDialogProps,
  } = useInvoiceActions({
    onInvoiceUpdated: (invoice) => {
      setPdfData(invoice)
      setCustomers((prev) => ({ ...prev, [invoice.customer.id]: invoice.customer }))
      setValue("customer", invoice.customer.id)
      fetchSalesInvoice()
    },
  })

  // react-hook-form setup.
  //
  // The whole invoice lives here, including the line items, the two
  // percentage/amount toggles and the paid figure. Nothing about the record is
  // kept in a useState beside it: a second home for form data is what let
  // discount_type be written twice and end up undefined, which the API then
  // rejected. One store means populateInvoiceFields is a single reset() and a
  // field it forgets is impossible rather than merely unlikely.
  const { register, handleSubmit, control, watch, reset, setValue } = useForm<SalesInvoiceFormValues>({
    defaultValues: {
      invoice_number: "",
      customer: "",
      notes: "",
      // Only ever seen if the detail fetch fails. These used to be a
      // hardcoded 2025 date, which a submit would then have saved.
      date_issued: todayForInput(),
      date_due: "",
      discount: "0.0",
      // Whether discount/tax are a percentage or a flat amount. Part of the
      // record, so it belongs in the form rather than in useState.
      discount_type: "percentage",
      tax: "0.0",
      tax_type: "percentage",
      status: "",
      project: null,
      items: [],
      // Derived server-side from the payments recorded against the invoice.
      // Shown, never typed into, and never submitted.
      amount_paid: 0,
      newItemProduct: "",
      newItemQuantity: 0,
      newItemPrice: 0
    },
  })

  const discount = parseFloat(String(watch("discount") || 0))
  const tax = parseFloat(String(watch("tax") || 0))
  const discountType = watch("discount_type")
  const taxType = watch("tax_type")
  const invoiceItems = watch("items") || []
  const amountPaid = watch("amount_paid") || 0

  const subtotal = invoiceItems
    .filter(item => !item.is_returned)
    .reduce((sum, item) => sum + item.total, 0)
  const discountAmount = discountType === "percentage" ? (subtotal * discount) / 100 : discount
  const taxAmount = taxType === "percentage" ? (subtotal * tax) / 100 : tax
  const totalAmount = subtotal - discountAmount + taxAmount
  const selectedProduct = products[watch("newItemProduct")]
  const paymentStatus = derivePaymentStatus(amountPaid, totalAmount)

  const onSubmit = async (data) => {

    // Named field by field rather than spread from the form. The form now
    // holds everything about the invoice, including the toggles and the paid
    // figure, and a spread would post all of it - so listing the payload is
    // what keeps a new form field from silently becoming a new API field.
    const payload = {
      invoice_number: data.invoice_number,
      customer: data.customer,
      notes: data.notes,
      // date_issued is a DateTimeField, so a bare date would be stored as
      // midnight and read back a day early; date_due is nullable, and an
      // empty input posts "" which the API rejects outright.
      date_issued: dateInputToDateTime(data.date_issued),
      date_due: nullIfBlank(data.date_due),
      status: data.status,
      project: data.project,
      // The type is never defaulted here. It comes from the record through
      // the form, and an absent one would be dropped by JSON.stringify and
      // then raise KeyError('type') in adjust_totals on the server.
      discount: {
        "value": parseFloat(String(data.discount)) || 0,
        "type": data.discount_type
      },
      tax: {
        "value": parseFloat(String(data.tax)) || 0,
        "type": data.tax_type
      },
      items: (data.items || []).map(item => ({
        id: item.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })),
    }

    try {
      const success = await updateSalesInvoiceAndItems(token, invoice_id, payload)

      if (success) {
        toast.success("Sales invoice updated successfully!")
        navigate(-1);
      } else {
        toast.error("Failed to update sales invoice.")
      }
    } catch (error) {
      console.log("Error creating sales invoice:", error)
    }
  }

  const addItem = (product, quantity, unit_price) => {
    if (product && quantity > 0) {
      const selectedProduct = products[product]
      const newInvoiceItem = {
        id: invoiceItems.length + 1,
        product: selectedProduct.product,
        quantity,
        unit_price,
        total: quantity * unit_price,
      };
      setValue("items", [...invoiceItems, newInvoiceItem]);
      setValue("newItemProduct", "");
      setValue("newItemQuantity", 0);
    }
  }

  // The whole record in, the whole form out, in one write.
  //
  // Every key of defaultValues appears below. That is the point: the form is
  // the only store, so anything missing here would be left over from the
  // previous invoice rather than quietly defaulted, and reset() replaces the
  // lot atomically. There is deliberately no setX() beside it - a second
  // write to the same value is what caused discount_type to arrive undefined.
  const populateInvoiceFields = (data) => {
    const {
      invoice_number,
      customer,
      notes,
      date_issued,
      date_due,
      discount,
      tax,
      status,
      projects,
      amount_paid,
      invoice_items,
    } = data

    reset({
      invoice_number: invoice_number || "",
      customer: customer?.id || "",
      notes: notes || "",
      // A DateTimeField, and an <Input type="date"> rejects a full ISO datetime.
      date_issued: date_issued?.split("T")[0] || "",
      date_due: date_due || "",
      discount: discount?.value ?? "0.0",
      // Falling back rather than taking the stored value as-is: an undefined
      // type is dropped by JSON.stringify, and the API rejects a
      // tax/discount with no type at all. Taking "percentage" for an amount
      // would also reinterpret it - a 6000 discount as 6000% of the subtotal.
      discount_type: discount?.type || "percentage",
      tax: tax?.value ?? "0.0",
      tax_type: tax?.type || "percentage",
      status: status || "",
      project: projects?.length > 0 ? String(projects[0].project) : null,
      items: (invoice_items || []).map((item) => ({
        id: item.id,
        product: item.product,
        quantity: item.net_quantity,
        unit_price: item.unit_price,
        total: (item.net_quantity * item.unit_price) || 0,
        is_returned: item.is_returned
      })),
      amount_paid: amount_paid || 0,
      newItemProduct: "",
      newItemQuantity: 0,
      newItemPrice: 0,
    })
  }

  // Returns are one item at a time, so the row being returned is held here
  // rather than derived from a selection.
  const handleReturnClick = (e, item) => {
    e.preventDefault();
    setReturningItem(item);
    setReturnItemWindowOpen(true);
  }

  const handleDeleteItem = (e, id) => {
    e.preventDefault();
    setValue("items", invoiceItems.filter(item => item.id !== id));
  }

  const customerOptions = useMemo(
    () => Object.entries(customers).map(([value, customer]) => ({
      value,
      label: customer.name,
      keywords: [customer.phone_number, customer.city?.name].filter(Boolean),
    })),
    [customers])

  const productOptions = useMemo(
    () => Object.entries(products).map(([value, item]) => ({
      value,
      label: `${item.product.base.name} (${item.product.name}) (available: ${item.available_quantity})`,
      keywords: [item.product.base.name, item.product.name],
    })),
    [products])

  const projectOptions = useMemo(
    () => Object.entries(projects).map(([value, project]) => ({
      value,
      label: project.name,
    })),
    [projects])

  const fetchSalesInvoice = async () => {
    if (!token) return
    try {
      const salesInvoice = await getSalesInvoiceDetail(token, invoice_id)
      if (salesInvoice) {
        populateInvoiceFields(salesInvoice)
      } else {
        toast.error("Failed to fetch sales invoice")
      }
    } catch (error) {
      console.log(error)
      toast.error("Failed to fetch sales invoice")
    } finally {
      setDetailLoading(false)
    }
  }

  useEffect(() => {

    const fetchProducts = async () => {
      if (!token) return;

      try {
        const products = await getAvailableProductsList(token, businessId)
        if (products) {
          const productMap = createNestedIdMap(products, "product.id")
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

    const fetchCustomers = async () => {
      try {
        const customers = await getCustomersList(token)
        if (customers) {
          const customerMap = createIdMap(customers)
          setCustomers(customerMap)
        } else {
          toast.error("Failed to fetch customers")
        }
      } catch (error) {
        console.log("Error fetching customers:", error)
        toast.error("Failed to fetch customers")
      } finally {
        setCustomersLoading(false)
      }
    }

    const fetchSalesInvoicePDFData = async () => {
      try {
        const res = await getInvoicePDFData(token, invoice_id);
        if (!res) {
          toast.error("Error fetching invoice PDF. Please reload.")
        }
        setPdfData(res)
      } catch (error) {
        console.log(error)
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
        fetchCustomers(),
        fetchSalesInvoicePDFData(),
        fetchProjects(),
      ])
      fetchSalesInvoice()
    }
    init()
  }, [token, invoice_id])

  useEffect(() => {
    if (selectedProduct) {
      setValue("newItemPrice", selectedProduct.unit_price, { shouldDirty: false });
    }
  }, [selectedProduct])

  useEffect(() => {
    fetchSalesInvoice()
    setItemReturned(false)
    setReturningItem(null)
  }, [itemReturned == true])

  {
    console.log(watch("project"))
  }

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
                  <Label htmlFor="customer">Customer</Label>
                  <Controller
                    name="customer"
                    control={control}
                    render={({ field }) => (
                      <Combobox
                        id="customer"
                        options={customerOptions}
                        value={field.value}
                        onChange={field.onChange}
                        loading={customersLoading}
                        placeholder="Select customer"
                        emptyText="No customers yet. Add one first."
                        notFoundText="No customer matches that."
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
                  <Label htmlFor="date_issued">Date Issued</Label>
                  <Input id="date_issued" type="date" {...register("date_issued")} />
                </div>
                <div className="flex-1 space-y-1">
                  <Label htmlFor="date_due">Date Due</Label>
                  <Input id="date_due" type="date" {...register("date_due")} />
                </div>
              </div>

              <div className="flex gap-6 mb-6">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="discount">Discount</Label>
                  <div className="relative">
                    <Input id="discount" {...register("discount")} placeholder="0.0" />
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {discountType === "percentage" ? <Button type="button" variant="outline" onClick={() => setValue("discount_type", "amount")}>%</Button> : <Button type="button" variant="outline" onClick={() => setValue("discount_type", "percentage")}>PKR</Button>}
                    </span>
                  </div>
                </div>
                <div className="flex-1 space-y-1">
                  <Label htmlFor="tax">Tax</Label>
                  <div className="relative">
                    <Input id="tax" {...register("tax")} placeholder="0.0" />
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {taxType === "percentage" ? <Button type="button" variant="outline" onClick={() => setValue("tax_type", "amount")}>%</Button> : <Button type="button" variant="outline" onClick={() => setValue("tax_type", "percentage")}>PKR</Button>}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="status">Status</Label>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(SalesInvoiceStatusMap).map(([key, value]) => (
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
                        emptyText="No stocked products yet."
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
                  <Label htmlFor="newItemPrice">Unit Price</Label>
                  <Input id="newItemPrice" type="number" {...register("newItemPrice")} />
                </div>
                <div className="w-[20%] flex items-end">
                  <Button
                    type="button"
                    onClick={() =>
                      addItem(watch("newItemProduct"), parseInt(String(watch("newItemQuantity") || 0)), parseFloat(String(watch("newItemPrice") || 0.0)))
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
                        <div>id</div>
                        <div>product</div>
                        <div>quantity</div>
                        <div>unit price</div>
                        <div>total</div>
                      </div>
                    </div>
                    {/* Keeps the header aligned with rows, which carry two
                        16px action buttons outside the card. */}
                    <div className="w-4" />
                    <div className="w-4" />
                  </div>

                  {invoiceItems && invoiceItems.map((item, idx) => {
                    const isReturned = item.is_returned;
                    return (
                      <div key={item.id} className="flex items-center gap-2">
                        <div
                          className={`bg-card rounded-lg min-h-[35px] py-0.5 flex flex-1 items-center px-4 border border-border ${isReturned ? "opacity-50" : ""}`}
                        >
                          <div className="grid grid-cols-[48px_2fr_1fr_1fr_1fr] items-center gap-4 w-full text-sm">
                            <div>{idx + 1}</div>
                            <div className="font-medium">
                              {item.product.base.name} ({item.product.name})
                            </div>
                            <div>{item.quantity}</div>
                            <div>{item.unit_price}</div>
                            <div className="font-semibold">{item.total}</div>
                          </div>
                        </div>
                        <div className="flex items-center h-7">
                          <Button
                            type="button"
                            variant="unstyled"
                            className="p-0 hover:text-primary"
                            title="Return item"
                            disabled={isReturned}
                            onClick={(e) => handleReturnClick(e, item)}
                          >
                            <Undo2 cursor={'pointer'} />
                          </Button>
                        </div>
                        <div className="flex items-center h-7">
                          <Button
                            type="button"
                            variant="unstyled"
                            className="p-0 hover:text-red-500"
                            title="Delete item"
                            disabled={isReturned}
                            onClick={(e) => handleDeleteItem(e, item.id)}
                          >
                            <Trash2 cursor={'pointer'} />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
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
                  {
                    pdfData &&
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-44"
                        onClick={() => sendOnWhatsApp(invoice_id, pdfData)}
                        disabled={isBusy}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {isSending ? "Preparing…" : "Send on WhatsApp"}
                      </Button>
                      <Button
                        type="button"
                        className="w-36"
                        onClick={() => downloadInvoice(invoice_id, pdfData)}
                        disabled={isBusy}
                      >
                        {isDownloading ? "Preparing…" : "Download PDF"}
                      </Button>
                    </>
                  }
                  <SubmitButton type="submit" className="w-36" pending={pending} pendingLabel="Updating…">Update Invoice</SubmitButton>
                </div>
              </div>
            </div>
          </form>

          <Payments invoiceId={invoice_id} invoiceTotal={totalAmount} isSalesPayment={true} open={paymentsOpen} setOpen={setPaymentsOpen} onPaymentsChanged={fetchSalesInvoice} />

          {returningItem && <ReturnItem
            invoiceId={invoice_id}
            invoiceItem={returningItem}
            open={returnItemWindowOpen}
            setOpen={(open) => {
              setReturnItemWindowOpen(open)
              if (!open) setReturningItem(null)
            }}
            setItemReturned={setItemReturned}
          />}

          <WalkInCustomer {...walkInDialogProps} />

        </main>
      </div>
    </div>
  );
}

export default UpdateSalesInvoice;
