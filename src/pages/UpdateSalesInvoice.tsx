import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner"
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Ban, Download, ImageIcon, Plus, Send, Trash2, Undo2 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import {
  addOrMergeInvoiceItem,
  createIdMap,
  createNestedIdMap,
  dateInputToDateTime,
  normaliseExtraCharges,
  nullIfBlank,
  todayForInput
} from "../../services/utils"
import { useAuth } from "../../services/AuthProvider"
import {
  applyHeldPayments,
  createCustomerWithBalance,
  createProductWithStock,
  getAvailableProductsList,
  getCustomersList,
  updateSalesInvoiceAndItems,
  getSalesInvoiceDetail,
  getInvoicePDFData,
  cancelSalesInvoice,
  uncancelSalesInvoice,
  projectsAPIPackage
} from "../../services/api"
import ReturnItem from "@/components/ui/return-item";
import Payments, { EMPTY_PENDING_PAYMENTS } from "@/components/ui/payments";
import InvoiceImages from "@/components/ui/invoice-images";
import WalkInCustomer from "@/components/ui/walk-in-customer";
import { useInvoiceActions } from "@/hooks/use-invoice-actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { usePending } from "@/hooks/use-pending";
import { Combobox, useCreateAction } from "@/components/ui/combobox";
import { NewPartyDialog, NewProductDialog } from "@/components/backlog/NewRecordDialogs";
import { InvoiceScreen, InvoiceSection } from "@/components/invoice/InvoiceScreen";
import { InvoiceItemsTable, RowAction } from "@/components/invoice/InvoiceItemsTable";
import { ExtraChargesEditor } from "@/components/invoice/ExtraChargesEditor";
import {
  AmountToggleInput,
  InvoiceSummaryCard,
  PaymentButton,
  SalesStatusPill,
} from "@/components/invoice/InvoiceRail";

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
  // Amounts arrive as numbers from the record and leave the inputs as
  // strings, so both are allowed and normaliseExtraCharges settles it.
  extra_charges: { label: string; amount: string | number }[]
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

  // True until the record arrives, which the spinner beside the title
  // reports. A failure is the only thing that toasts.
  const [detailLoading, setDetailLoading] = useState(true);
  const [returnItemWindowOpen, setReturnItemWindowOpen] = useState(false)
  const [paymentsOpen, setPaymentsOpen] = useState(false)
  // What the payments dialog holds until Update Invoice: payments to add,
  // payments and refunds to delete. Nothing in the dialog reaches the server
  // before then, so it always works against the total this page shows.
  const [heldPayments, setHeldPayments] = useState(EMPTY_PENDING_PAYMENTS)
  const [imagesOpen, setImagesOpen] = useState(false)
  // Not form data: it labels the Images button. Seeded from the record and
  // kept current by the dialog, which never refetches the invoice.
  const [imageCount, setImageCount] = useState(0)
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
      extra_charges: [],
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

  // After the tax and outside the subtotal, matching SalesInvoice.adjust_totals.
  const extraCharges = watch("extra_charges") || []
  const chargesTotal = extraCharges.reduce(
    (sum, charge) => sum + (parseFloat(String(charge?.amount)) || 0), 0)

  const totalAmount = subtotal - discountAmount + taxAmount + chargesTotal

  // Paid, as it will stand after Update: the saved figure, less the cleared
  // payments held for deletion, plus the cleared ones held to add. A cheque
  // pays nothing until it clears, here as on the server.
  const clearedOf = (rows) => rows
    .filter((p) => !p.status || p.status === "C")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0)
  const livePaid = Number(amountPaid || 0)
    - clearedOf(heldPayments.deletes)
    + clearedOf(heldPayments.adds)
  const selectedProduct = products[watch("newItemProduct")]
  // Read from the form so the badge updates when populateInvoiceFields runs
  // and after a cancel refetches the record. It is shown, never submitted.
  const status = watch("status")

  const [statusPending, setStatusPending] = useState(false)

  // Cancelling returns the goods to stock and takes the invoice out of the
  // customer's ledger; reinstating does both in reverse. The record is
  // refetched rather than patched locally, because the server also rewrites
  // the line-level deduction flags.
  const changeCancellation = async (action, request, successMessage) => {
    if (!invoice_id) return
    setStatusPending(true)
    try {
      const success = await request(token, invoice_id)
      if (success) {
        toast.success(successMessage)
        await fetchSalesInvoice()
      } else {
        toast.error(`Failed to ${action} the invoice.`)
      }
    } catch (error) {
      console.log(`Error trying to ${action} the invoice:`, error)
      toast.error(`Failed to ${action} the invoice.`)
    } finally {
      setStatusPending(false)
    }
  }

  const cancelInvoice = () => changeCancellation(
    "cancel", cancelSalesInvoice, "Invoice cancelled. Its items are back in stock.")

  const reinstateInvoice = () => changeCancellation(
    "reinstate", uncancelSalesInvoice, "Invoice reinstated. Its items left stock again.")

  const onSubmit = async (data) => {

    // Before the payload, so a half-filled row is named on screen rather than
    // coming back as a bare failure toast.
    const { charges, error } = normaliseExtraCharges(data.extra_charges)
    if (error) {
      toast.error(error)
      return
    }

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
      // status is deliberately absent. It is derived on the server from the
      // invoice's lines and what is still owed, and posting a value would be
      // ignored - sending one was how this field used to be overwritten.
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
      extra_charges: charges,
      items: (data.items || []).map(item => ({
        id: item.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })),
    }

    try {
      // The dialog's held deletions go first and its new payments last, with
      // the invoice update between - the order the server's refund rule needs.
      const { updated, failures } = await applyHeldPayments(
        token, invoice_id, true, heldPayments,
        () => updateSalesInvoiceAndItems(token, invoice_id, payload))

      if (!updated) {
        toast.error("Failed to update sales invoice.")
        // A held deletion may already have gone through; show what is saved.
        if (heldPayments.deletes.length || heldPayments.refundDeletes.length) {
          setHeldPayments(EMPTY_PENDING_PAYMENTS)
          fetchSalesInvoice()
        }
        return
      }

      setHeldPayments(EMPTY_PENDING_PAYMENTS)
      if (failures) {
        // The invoice is saved; say exactly what was not, and stay here so it
        // can be done again.
        toast.warning(`Invoice updated, but ${failures} payment change${failures > 1 ? "s" : ""} could not be saved. Check the payments and try again.`)
        fetchSalesInvoice()
        return
      }

      toast.success("Sales invoice updated successfully!")
      navigate(-1);
    } catch (error) {
      console.log("Error updating sales invoice:", error)
    }
  }

  const addItem = (product, quantity, unit_price) => {
    if (product && quantity > 0) {
      const selectedProduct = products[product]
      const newInvoiceItem = {
        // Negative, so it can never equal a saved line's id (the update
        // treats a matching id as that line) or repeat after a delete,
        // which length + 1 did - and deleting one then removed both.
        id: -(Date.now() + Math.random()),
        product: selectedProduct.product,
        quantity,
        unit_price,
        total: quantity * unit_price,
      };
      // Same product at a different price is its own line; at the same
      // price it joins the line already there (addOrMergeInvoiceItem).
      const merged = addOrMergeInvoiceItem(invoiceItems, newInvoiceItem);
      if (merged.length === invoiceItems.length) {
        toast.success(`Added ${quantity} to the existing line for this product at this price.`);
      }
      setValue("items", merged);
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
      extra_charges,
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
      extra_charges: extra_charges || [],
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
  const handleReturnClick = (item) => {
    setReturningItem(item);
    setReturnItemWindowOpen(true);
  }

  const handleDeleteItem = (id) => {
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
      label: item.available_quantity > 0
        ? `${item.product.base.name} (${item.product.name}) (available: ${item.available_quantity})`
        : `${item.product.base.name} (${item.product.name}) - out of stock`,
      keywords: [item.product.base.name, item.product.name],
      // Listed but not pickable: a product that has run out is still there,
      // so nobody creates it a second time from the Create button.
      disabled: !(item.available_quantity > 0),
    })),
    [products])

  // A customer or product typed here that MarketPro does not have: the
  // Create button in the picker opens its dialog with the name filled in.
  const [creating, setCreating] = useState<{ kind: "customer" | "product"; text: string } | null>(null)
  const partyCreate = useCreateAction(customerOptions, "customer",
    (text) => setCreating({ kind: "customer", text }))
  const productCreate = useCreateAction(productOptions, "product",
    (text) => setCreating({ kind: "product", text }))

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
        setImageCount(salesInvoice.images?.length || 0)
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

  // Outside the effect so a customer or product created from the pickers
  // can reload its list and be picked straight away.
  const fetchProducts = async () => {
    if (!token) return;

    try {
      // Every product, in stock or not - the ones run out show disabled.
      const products = await getAvailableProductsList(token, businessId, true)
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

  useEffect(() => {

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

  const summaryLines = [
    { label: "Subtotal", value: subtotal },
    ...(discountAmount ? [{ label: "Discount", value: discountAmount, sign: "−" as const }] : []),
    ...(taxAmount ? [{
      label: taxType === "percentage" ? `Tax (${tax}%)` : "Tax",
      value: taxAmount,
      sign: "+" as const,
    }] : []),
    // One line for all of them; each charge is already listed under Extra
    // Charges, so repeating them here only made the card longer.
    ...(chargesTotal ? [{ label: "Extra charges", value: chargesTotal, sign: "+" as const }] : []),
  ]

  const unitCount = invoiceItems
    .filter((item) => !item.is_returned)
    .reduce((sum, item) => sum + Number(item.quantity || 0), 0)

  return (
    <InvoiceScreen
      title="Sales Invoice"
      status={<SalesStatusPill status={status} />}
      loading={detailLoading}
      onSubmit={handleSubmit(run(onSubmit))}
      titleActions={
        <>
          {/* Shown once the PDF data has loaded; both need it. */}
          {pdfData && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => sendOnWhatsApp(invoice_id, pdfData)}
                disabled={isBusy}
              >
                <Send className="w-4 h-4 mr-2" />
                {isSending ? "Preparing…" : "Send on WhatsApp"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => downloadInvoice(invoice_id, pdfData)}
                disabled={isBusy}
              >
                <Download className="w-4 h-4 mr-2" />
                {isDownloading ? "Preparing…" : "Download PDF"}
              </Button>
            </>
          )}
          <Button type="button" variant="outline" onClick={() => setImagesOpen(true)}>
            <ImageIcon className="h-4 w-4 mr-2" />
            Images
            {imageCount > 0 && (
              <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-xs font-semibold text-primary">
                {imageCount}
              </span>
            )}
          </Button>
        </>
      }
      fields={
        <div className="grid grid-cols-4 gap-6">
          <div className="space-y-1">
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
                  onInputChange={partyCreate.onInputChange}
                  createAction={partyCreate.createAction}
                  loading={customersLoading}
                  placeholder="Select customer"
                  emptyText="No customers yet. Add one first."
                  notFoundText="No customer matches that."
                />
              )}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="invoice_number">Invoice no.</Label>
            <Input id="invoice_number" {...register("invoice_number")} placeholder="Enter invoice number" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="date_issued">Date Issued</Label>
            <Input id="date_issued" type="date" {...register("date_issued")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="date_due">Date Due</Label>
            <Input id="date_due" type="date" {...register("date_due")} />
          </div>
        </div>
      }
      rail={
        <>
          <InvoiceSummaryCard lines={summaryLines} total={totalAmount} />
          {/* Typed adjustments sit with the figures they change, between
              the summary and the payment. */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="discount">Discount</Label>
              <AmountToggleInput
                id="discount"
                type={discountType}
                onToggle={() => setValue("discount_type", discountType === "percentage" ? "amount" : "percentage")}
                inputProps={register("discount")}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tax">Tax</Label>
              <AmountToggleInput
                id="tax"
                type={taxType}
                onToggle={() => setValue("tax_type", taxType === "percentage" ? "amount" : "percentage")}
                inputProps={register("tax")}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="Add any additional notes here..."
              rows={2}
              className="[@media(max-height:820px)]:min-h-[60px]"
            />
          </div>
          <PaymentButton total={totalAmount} paid={livePaid} onClick={() => setPaymentsOpen(true)} />
          <Controller
            name="project"
            control={control}
            render={({ field }) => (
              <Combobox
                id="project"
                className="w-full"
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
          <SubmitButton type="submit" className="w-full" pending={pending} pendingLabel="Updating…">Update Invoice</SubmitButton>
          {/* Cancelling is the one status a person sets; everything else is
              derived from the invoice. It returns the goods to stock. */}
          {status === "X" ? (
            <Button type="button" variant="outline" className="w-full" disabled={statusPending} onClick={reinstateInvoice}>
              <Undo2 className="w-4 h-4 mr-2" />
              Reinstate Invoice
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full text-destructive hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
              disabled={statusPending || detailLoading}
              onClick={cancelInvoice}
            >
              <Ban className="w-4 h-4 mr-2" />
              Cancel Invoice
            </Button>
          )}
        </>
      }
      side={
        <Controller
          name="extra_charges"
          control={control}
          render={({ field }) => (
            <ExtraChargesEditor charges={field.value} onChange={field.onChange} />
          )}
        />
      }
      dialogs={
        <>
          <Payments
            invoiceId={invoice_id}
            invoiceTotal={totalAmount}
            isSalesPayment={true}
            open={paymentsOpen}
            setOpen={setPaymentsOpen}
            pending={heldPayments}
            onPendingChange={setHeldPayments}
            // A sale with no lines is a draft, and a draft bills nothing.
            billsTotal={invoiceItems.length > 0}
          />
          <NewPartyDialog
            open={creating?.kind === "customer"}
            setOpen={(open) => { if (!open) setCreating(null) }}
            kind="customer"
            initialName={creating?.text || ""}
            create={(data) => createCustomerWithBalance(token, data)}
            asOf={watch("date_issued")}
            onCreated={async (item) => {
              await fetchCustomers()
              setValue("customer", String(item.id))
            }}
          />
          <NewProductDialog
            open={creating?.kind === "product"}
            setOpen={(open) => { if (!open) setCreating(null) }}
            initialName={creating?.text || ""}
            create={(data) => createProductWithStock(token, data)}
            // Only products in stock are listed for a sale.
            requireQuantity
            onCreated={async (variants) => {
              await fetchProducts()
              if (variants[0]) setValue("newItemProduct", String(variants[0].id))
            }}
          />
          <InvoiceImages
            invoiceId={invoice_id}
            isSalesInvoice={true}
            open={imagesOpen}
            setOpen={setImagesOpen}
            onCountChange={setImageCount}
          />
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
        </>
      }
    >
      <InvoiceSection
        title="Invoice Items"
        first
        pinned={
          <>
            <div className="flex gap-4 items-end">
              <div className="flex-1 min-w-0 space-y-1">
                <Label htmlFor="newItemProduct">Product</Label>
                <Controller
                  name="newItemProduct"
                  control={control}
                  render={({ field }) => (
                    <Combobox
                      id="newItemProduct"
                      options={productOptions}
                      value={field.value}
                      onChange={field.onChange}
                      onInputChange={productCreate.onInputChange}
                      createAction={productCreate.createAction}
                      loading={productsLoading}
                      placeholder="Select product"
                      emptyText="No stocked products yet."
                      notFoundText="No product matches that."
                    />
                  )}
                />
              </div>
              <div className="w-28 space-y-1">
                <Label htmlFor="newItemQuantity">Quantity</Label>
                <Input id="newItemQuantity" type="number" {...register("newItemQuantity")} />
              </div>
              <div className="w-32 space-y-1">
                <Label htmlFor="newItemPrice">Unit Price</Label>
                <Input id="newItemPrice" type="number" {...register("newItemPrice")} />
              </div>
              <Button
                type="button"
                onClick={() =>
                  addItem(watch("newItemProduct"), parseInt(String(watch("newItemQuantity") || 0)), parseFloat(String(watch("newItemPrice") || 0.0)))
                }
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
            <InvoiceItemsTable columns={["Product", "Quantity", "Unit Price", "Total"]} actionCount={2} rows={[]} headerOnly />
          </>
        }
        aside={invoiceItems.length > 0 ? `${invoiceItems.length} items · ${unitCount} units` : undefined}
      >
        <InvoiceItemsTable
          rowsOnly
          columns={["Product", "Quantity", "Unit Price", "Total"]}
          actionCount={2}
          emptyText="No items on this invoice."
          rows={invoiceItems.map((item, idx) => ({
            key: `${item.id}-${idx}`,
            dimmed: item.is_returned,
            cells: [
              `${item.product.base.name} (${item.product.name})`,
              item.quantity,
              Number(item.unit_price).toLocaleString(),
              Number(item.total).toLocaleString(),
            ],
            actions: (
              <>
                <RowAction label="Return item" tone="primary" disabled={item.is_returned} onClick={() => handleReturnClick(item)}>
                  <Undo2 className="h-5 w-5" />
                </RowAction>
                <RowAction label="Delete item" disabled={item.is_returned} onClick={() => handleDeleteItem(item.id)}>
                  <Trash2 className="h-5 w-5" />
                </RowAction>
              </>
            ),
          }))}
        />
      </InvoiceSection>
    </InvoiceScreen>
  );
}

export default UpdateSalesInvoice;
