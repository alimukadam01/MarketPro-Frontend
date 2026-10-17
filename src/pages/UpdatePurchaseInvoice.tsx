import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner"
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageIcon, Plus, Trash2 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import {
  addOrMergeInvoiceItem,
  formatPartyLabel,
  createIdMap,
  transformProductVariant,
  dateInputToDateTime,
  nullIfBlank
} from "../../services/utils"
import { useAuth } from "../../services/AuthProvider"
import {
  applyHeldPayments,
  getProductVariantsList,
  suppliersAPIPackage,
  updatePurchaseInvoiceAndItems,
  getPurchaseInvoiceDetail,
  projectsAPIPackage
} from "../../services/api"
import Payments, { EMPTY_PENDING_PAYMENTS } from "@/components/ui/payments";
import InvoiceImages from "@/components/ui/invoice-images";
import { SubmitButton } from "@/components/ui/submit-button";
import { usePending } from "@/hooks/use-pending";
import { Combobox } from "@/components/ui/combobox";
import { InvoiceScreen, InvoiceSection } from "@/components/invoice/InvoiceScreen";
import { InvoiceItemsTable, RowAction } from "@/components/invoice/InvoiceItemsTable";
import {
  AmountToggleInput,
  InvoiceSummaryCard,
  PaymentButton,
  PurchaseStatusSelect,
} from "@/components/invoice/InvoiceRail";

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

const ITEM_COLUMNS = ["Product", "Quantity", "Unit Cost", "Total"]

const productLabel = (product) =>
  product?.base ? `${product.base.name} (${product.name})` : product?.name

const UpdatePurchaseInvoice = () => {
  const { pending, run } = usePending();

  // True until the record arrives, which the spinner beside the title
  // reports. A failure is the only thing that toasts.
  const [detailLoading, setDetailLoading] = useState(true);
  const [paymentsOpen, setPaymentsOpen] = useState(false)
  // What the payments dialog holds until Update Invoice: payments to add,
  // payments and refunds to delete. Nothing in the dialog reaches the server
  // before then, so it always works against the total this page shows.
  const [heldPayments, setHeldPayments] = useState(EMPTY_PENDING_PAYMENTS)
  const [imagesOpen, setImagesOpen] = useState(false)
  // Not form data: it labels the Images button. Seeded from the record and
  // kept current by the dialog, which never refetches the invoice.
  const [imageCount, setImageCount] = useState(0)
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

  // Paid, as it will stand after Update: the saved figure, less the cleared
  // payments held for deletion, plus the cleared ones held to add.
  const clearedOf = (rows) => rows
    .filter((p) => !p.status || p.status === "C")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0)
  const livePaid = Number(amountPaid || 0)
    - clearedOf(heldPayments.deletes)
    + clearedOf(heldPayments.adds)
  const status = watch("status")

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
      // The dialog's held deletions go first and its new payments last, with
      // the invoice update between - the order the server's refund rule needs.
      const { updated, failures } = await applyHeldPayments(
        token, invoice_id, false, heldPayments,
        () => updatePurchaseInvoiceAndItems(token, invoice_id, payload))

      if (!updated) {
        toast.error("Failed to update purchase invoice.")
        // A held deletion may already have gone through; show what is saved.
        if (heldPayments.deletes.length || heldPayments.refundDeletes.length) {
          setHeldPayments(EMPTY_PENDING_PAYMENTS)
          fetchPurchaseInvoice()
        }
        return
      }

      setHeldPayments(EMPTY_PENDING_PAYMENTS)
      if (failures) {
        toast.warning(`Invoice updated, but ${failures} payment change${failures > 1 ? "s" : ""} could not be saved. Check the payments and try again.`)
        fetchPurchaseInvoice()
        return
      }

      toast.success("Purchase invoice updated successfully!")
      navigate(-1);
    } catch (error) {
      console.log("Error updating purchase invoice:", error)
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
      // Same product at a different price is its own line; at the same
      // price it joins the line already there (addOrMergeInvoiceItem).
      const merged = addOrMergeInvoiceItem(invoiceItems, newInvoiceItem, "unit_cost")
      if (merged.length === invoiceItems.length) {
        toast.success(`Added ${quantity} to the existing line for this product at this cost.`)
      }
      setValue("items", merged)
      setValue("newItemProduct", "")
      setValue("newItemQuantity", 0)
    }
  }

  const handleDeleteItem = (target) => {
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
        setImageCount(purchaseInvoice.images?.length || 0)
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

  // There used to be an effect here pre-filling Unit Cost from
  // selectedProduct.unit_Cost. A variant carries no cost field at all, so it
  // only ever blanked whatever cost had been typed; it is gone.

  const summaryLines = [
    { label: "Subtotal", value: subtotal },
    ...(taxAmount ? [{
      label: taxType === "percentage" ? `Tax (${tax}%)` : "Tax",
      value: taxAmount,
      sign: "+" as const,
    }] : []),
  ]

  const unitCount = invoiceItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0)

  return (
    <InvoiceScreen
      title="Purchase Invoice"
      // Purchase status is chosen, not derived - it decides whether the goods
      // are restocked - so the pill beside the title is the picker. Cancelling
      // is one of its options, which is why there is no Cancel button here.
      status={
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <PurchaseStatusSelect value={field.value} onChange={field.onChange} />
          )}
        />
      }
      loading={detailLoading}
      onSubmit={handleSubmit(run(onSubmit))}
      titleActions={
        <Button type="button" variant="outline" onClick={() => setImagesOpen(true)}>
          <ImageIcon className="h-4 w-4 mr-2" />
          Images
          {imageCount > 0 && (
            <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-xs font-semibold text-primary">
              {imageCount}
            </span>
          )}
        </Button>
      }
      fields={
        <div className="grid grid-cols-5 gap-6">
          <div className="space-y-1">
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
          <div className="space-y-1">
            <Label htmlFor="invoice_number">Invoice no. (optional)</Label>
            <Input id="invoice_number" {...register("invoice_number")} placeholder="Enter invoice number" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="date_issued">Invoice Date</Label>
            <Input id="date_issued" type="date" {...register("date_issued")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="date_due">Date Due</Label>
            <Input id="date_due" type="date" {...register("date_due")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="delivery">Delivery Date</Label>
            <Input id="delivery" type="date" {...register("delivery")} />
          </div>
        </div>
      }
      rail={
        <>
          <InvoiceSummaryCard lines={summaryLines} total={totalAmount} />
          {/* A purchase has tax and no discount. */}
          <div className="space-y-1">
            <Label htmlFor="tax">Tax</Label>
            <AmountToggleInput
              id="tax"
              type={taxType}
              onToggle={() => setValue("tax_type", taxType === "percentage" ? "amount" : "percentage")}
              inputProps={register("tax")}
            />
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
        </>
      }
      dialogs={
        <>
          <Payments
            invoiceId={invoice_id}
            invoiceTotal={totalAmount}
            isSalesPayment={false}
            open={paymentsOpen}
            setOpen={setPaymentsOpen}
            pending={heldPayments}
            onPendingChange={setHeldPayments}
            // A purchase in Draft or Cancelled - the status picked above -
            // bills nothing.
            billsTotal={!["D", "C"].includes(status)}
          />
          <InvoiceImages
            invoiceId={invoice_id}
            isSalesInvoice={false}
            open={imagesOpen}
            setOpen={setImagesOpen}
            onCountChange={setImageCount}
          />
        </>
      }
    >
      <InvoiceSection
        title="Invoice Items"
        first
        aside={invoiceItems.length > 0 ? `${invoiceItems.length} items · ${unitCount} units` : undefined}
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
                      loading={productsLoading}
                      placeholder="Select product"
                      emptyText="No products yet."
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
                <Label htmlFor="newItemCost">Unit Cost</Label>
                <Input id="newItemCost" type="number" {...register("newItemCost")} />
              </div>
              <Button
                type="button"
                onClick={() =>
                  addItem(watch("newItemProduct"), parseInt(String(watch("newItemQuantity") || 0)), parseFloat(String(watch("newItemCost") || 0.0)))
                }
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
            <InvoiceItemsTable columns={ITEM_COLUMNS} rows={[]} headerOnly />
          </>
        }
      >
        <InvoiceItemsTable
          rowsOnly
          columns={ITEM_COLUMNS}
          emptyText="No items on this invoice."
          rows={invoiceItems.map((item, idx) => ({
            key: `${item.id}-${idx}`,
            cells: [
              productLabel(item.product),
              item.quantity,
              Number(item.unit_cost).toLocaleString(),
              Number(item.total).toLocaleString(),
            ],
            actions: (
              <RowAction label="Delete item" onClick={() => handleDeleteItem(item)}>
                <Trash2 className="h-5 w-5" />
              </RowAction>
            ),
          }))}
        />
      </InvoiceSection>
    </InvoiceScreen>
  );
}

export default UpdatePurchaseInvoice;
