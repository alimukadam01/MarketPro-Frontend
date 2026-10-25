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
  createIdMap,
  createNestedIdMap,
  generateInvoiceNumber,
  normaliseExtraCharges,
  todayForInput,
} from "../../services/utils"
import { useAuth } from "../../services/AuthProvider"
import {
  attachStagedToInvoice,
  createCustomerWithBalance,
  getActiveBusiness,
  getAvailableProductsList,
  getCustomersList,
  postSalesInvoiceAndItems,
  projectsAPIPackage
} from "../../services/api"
import { SubmitButton } from "@/components/ui/submit-button";
import { usePending } from "@/hooks/use-pending";
import { Combobox, useCreateAction } from "@/components/ui/combobox";
import { NewPartyDialog } from "@/components/backlog/NewRecordDialogs";
import Payments from "@/components/ui/payments";
import InvoiceImages from "@/components/ui/invoice-images";
import { InvoiceScreen, InvoiceSection } from "@/components/invoice/InvoiceScreen";
import { InvoiceItemsTable, RowAction } from "@/components/invoice/InvoiceItemsTable";
import { ExtraChargesEditor, type ExtraCharge } from "@/components/invoice/ExtraChargesEditor";
import {
  AmountToggleInput,
  InvoiceSummaryCard,
  PaymentButton,
  SalesStatusPill,
} from "@/components/invoice/InvoiceRail";

// What the payments dialog holds for an invoice that does not exist yet.
type StagedPayment = { id: string; amount: number; status: string; fields: object; imageFile?: File | null }
type StagedImage = { id: string; file: File; caption: string; preview: string }

const CreateSalesInvoice = () => {
  const { pending, run } = usePending();

  const [invoiceItems, setInvoiceItems] = useState([])
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [projects, setProjects] = useState([])
  // One flag per list, not one for the page: three independent requests feeding
  // three independent pickers.
  const [productsLoading, setProductsLoading] = useState(true)
  const [customersLoading, setCustomersLoading] = useState(true)
  const [projectsLoading, setProjectsLoading] = useState(true)
  // Payments and images are added before the invoice exists, so they are held
  // here and sent once it has been created.
  const [stagedPayments, setStagedPayments] = useState<StagedPayment[]>([])
  const [stagedImages, setStagedImages] = useState<StagedImage[]>([])
  const [paymentsOpen, setPaymentsOpen] = useState(false)
  const [imagesOpen, setImagesOpen] = useState(false)
  const { token } = useAuth()
  const businessId = localStorage.getItem("mp-business-id")
  const navigate = useNavigate()
  const location = useLocation()
  const project_id = location.state?.project_id || null

  // Cached at login. Sessions that predate that caching fall back to a fetch
  // below, so nobody has to sign in again to get an invoice number.
  const [businessName, setBusinessName] = useState(
    () => localStorage.getItem("mp-business-name") || ""
  )

  // amount_paid is gone from here: a payment is added through the payments
  // dialog, with its account, method and date, rather than posted as a bare
  // figure that became a receipt with none of those.
  const { register, handleSubmit, control, watch, reset, setValue, getValues } = useForm({
    defaultValues: {
      invoice_number: businessName
        ? generateInvoiceNumber(businessName)
        : "",
      customer: "",
      notes: "",
      date_issued: todayForInput(),
      date_due: todayForInput(),
      discount: "0.0",
      tax: "0.0",
      extra_charges: [] as ExtraCharge[],
      project: project_id ? String(project_id) : null,
      newItemProduct: "",
      newItemQuantity: 0,
      newItemPrice: 0
    },
  })

  useEffect(() => {
    if (businessName || !token) return

    const fetchBusinessName = async () => {
      try {
        const business = await getActiveBusiness(token)
        if (business?.name) {
          localStorage.setItem("mp-business-name", business.name)
          setBusinessName(business.name)
        }
      } catch (error) {
        console.log("Error fetching business name:", error)
      }
    }
    fetchBusinessName()
  }, [token, businessName])

  // Only reached by a session that predates the name being cached at login:
  // defaultValues above already covers the normal case. Keeps anything the user
  // has typed, so the draft number can never overwrite a real one.
  useEffect(() => {
    if (!businessName) return
    if (getValues("invoice_number")) return
    // Spread the current values: reset() replaces the whole form, so passing
    // only the number would blank every other field.
    reset({ ...getValues(), invoice_number: generateInvoiceNumber(businessName) })
  }, [businessName, getValues, reset])

  const discount = parseFloat(String(watch("discount") || 0))
  const tax = parseFloat(String(watch("tax") || 0))

  const subtotal = invoiceItems.reduce((sum, item) => sum + item.total, 0)
  const [discountType, setDiscountType] = useState("percentage")
  const [taxType, setTaxType] = useState("percentage")
  const discountAmount = discountType === "percentage" ? (subtotal * discount) / 100 : discount
  const taxAmount = taxType === "percentage" ? (subtotal * tax) / 100 : tax

  // Charges are added after the tax and are not part of the subtotal, matching
  // SalesInvoice.adjust_totals - so a percentage tax is never charged on a
  // delivery fee.
  const extraCharges: ExtraCharge[] = watch("extra_charges") || []
  const chargesTotal = extraCharges.reduce(
    (sum, charge) => sum + (parseFloat(String(charge?.amount)) || 0), 0)

  const totalAmount = subtotal - discountAmount + taxAmount + chargesTotal
  const selectedProduct = products[watch("newItemProduct")]

  // Only cleared money pays the invoice; a staged cheque stays pending.
  const stagedPaid = stagedPayments
    .filter((payment) => payment.status === "C")
    .reduce((sum, payment) => sum + Number(payment.amount), 0)

  // A preview of what the server will derive once it is saved: no lines is a
  // draft, lines are completed, and a balance past the due date is overdue.
  const dateDue = watch("date_due")
  const previewStatus = invoiceItems.length === 0
    ? "D"
    : dateDue && dateDue < todayForInput() && totalAmount - stagedPaid > 0.005
      ? "O"
      : "C"

  const onSubmit = async (data) => {

    const { newItemPrice, newItemProduct, newItemQuantity, ...rest } = data

    const tax = {
      "value": parseFloat(data.tax),
      "type": taxType
    }

    const discount = {
      "value": parseFloat(data.discount),
      "type": discountType
    }

    const items = invoiceItems.map(item => ({
      product_id: item.product.id,
      quantity: item.quantity,
      unit_price: item.unit_price,
    }))

    // Cleaned here rather than posted raw, so a malformed row is named on
    // screen instead of coming back as a bare failure.
    const { charges, error } = normaliseExtraCharges(data.extra_charges)
    if (error) {
      toast.error(error)
      return
    }

    try {
      const created = await postSalesInvoiceAndItems(token, {
        ...rest,
        tax: tax,
        discount: discount,
        extra_charges: charges,
        items: items
      })

      if (!created) {
        toast.error("Failed to create sales invoice.")
        return
      }

      // The invoice exists from here on. A payment or image that fails now is
      // reported as exactly that, and the new invoice is opened so it can be
      // added again - not reported as a failed create.
      const { paymentFailures, imageFailures } = await attachStagedToInvoice(
        token, created.id, true, { payments: stagedPayments, images: stagedImages })

      if (paymentFailures || imageFailures) {
        const missed = [
          paymentFailures && `${paymentFailures} payment${paymentFailures > 1 ? "s" : ""}`,
          imageFailures && `${imageFailures} image${imageFailures > 1 ? "s" : ""}`,
        ].filter(Boolean).join(" and ")
        toast.warning(`Invoice created, but ${missed} could not be saved. Add ${paymentFailures + imageFailures > 1 ? "them" : "it"} again here.`)
        navigate("/sales/update-invoice", { state: { invoice_id: created.id }, replace: true })
        return
      }

      toast.success("Sales invoice created successfully!")
      navigate(-1);
    } catch (error) {
      console.log("Error creating sales invoice:", error)
      toast.error("Failed to create sales invoice.")
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
      setInvoiceItems(merged);
      reset({ newItemProduct: "", newItemQuantity: 0 }, { keepValues: true });
    }
  }

  const handleDeleteItem = (id) => {
    setInvoiceItems(invoiceItems.filter(item => item.id !== id));
  }

  // Outside the effect so a product or customer created from the pickers
  // can reload its list and be picked straight away.
  const fetchProducts = async () => {
    if (!token) return;

    try {
      // Every product, in stock or not - the ones run out show disabled.
      const products = await getAvailableProductsList(token, businessId, true)
      if (products) {
        const productMap = createNestedIdMap(products, 'product.id')
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

    fetchProducts()
    fetchCustomers()
    fetchProjects()
  }, [token])

  // The pickers take a flat {value, label} list, so each map runs once per fetch
  // rather than on every keystroke in the search box.
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
      // the bare names too, so a search for "shirt" is not defeated by the
      // quantity and variant the label carries
      keywords: [item.product.base.name, item.product.name],
      // Listed but not pickable: a product that has run out is still there,
      // so it is not taken for missing - restocked on Inventory, not here.
      disabled: !(item.available_quantity > 0),
    })),
    [products])

  // A customer typed here that MarketPro does not have: the Create button
  // in the picker opens its dialog with the name filled in. Products are
  // not created from an invoice - they and their stock come from the
  // Products and Inventory screens (docs/INVOICE-WORKFLOWS.md).
  const [creating, setCreating] = useState<{ kind: "customer"; text: string } | null>(null)
  const customerCreate = useCreateAction(customerOptions, "customer",
    (text) => setCreating({ kind: "customer", text }))

  const projectOptions = useMemo(
    () => Object.entries(projects).map(([value, project]) => ({
      value,
      label: project.name,
    })),
    [projects])

  useEffect(() => {
    if (selectedProduct) {
      setValue("newItemPrice", selectedProduct.unit_price, { shouldDirty: false });
    }
  }, [selectedProduct])

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

  const unitCount = invoiceItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0)

  return (
    <InvoiceScreen
      title="New Sales Invoice"
      status={<SalesStatusPill status={previewStatus} />}
      onSubmit={handleSubmit(run(onSubmit))}
      titleActions={
        <Button type="button" variant="outline" onClick={() => setImagesOpen(true)}>
          <ImageIcon className="h-4 w-4 mr-2" />
          Images
          {stagedImages.length > 0 && (
            <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-xs font-semibold text-primary">
              {stagedImages.length}
            </span>
          )}
        </Button>
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
                  onInputChange={customerCreate.onInputChange}
                  createAction={customerCreate.createAction}
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
            <Input
              id="invoice_number"
              title="Generated automatically — edit it if you number invoices differently."
              {...register("invoice_number")}
              placeholder="Enter invoice number"
            />
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
                onToggle={() => setDiscountType(discountType === "percentage" ? "amount" : "percentage")}
                inputProps={register("discount")}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tax">Tax</Label>
              <AmountToggleInput
                id="tax"
                type={taxType}
                onToggle={() => setTaxType(taxType === "percentage" ? "amount" : "percentage")}
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
          <PaymentButton total={totalAmount} paid={stagedPaid} onClick={() => setPaymentsOpen(true)} />
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
          <SubmitButton type="submit" className="w-full" pending={pending} pendingLabel="Creating…">Create Invoice</SubmitButton>
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
            invoiceId={null}
            invoiceTotal={totalAmount}
            isSalesPayment={true}
            open={paymentsOpen}
            setOpen={setPaymentsOpen}
            stagedPayments={stagedPayments}
            onStagedChange={setStagedPayments}
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
              setValue("customer", String(item.id) as never)
            }}
          />
          <InvoiceImages
            invoiceId={null}
            isSalesInvoice={true}
            open={imagesOpen}
            setOpen={setImagesOpen}
            staged={stagedImages}
            onStagedChange={setStagedImages}
          />
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
            <InvoiceItemsTable columns={["Product", "Quantity", "Unit Price", "Total"]} rows={[]} headerOnly />
          </>
        }
        aside={invoiceItems.length > 0 ? `${invoiceItems.length} items · ${unitCount} units` : undefined}
      >
        <InvoiceItemsTable
          rowsOnly
          columns={["Product", "Quantity", "Unit Price", "Total"]}
          emptyText="No items yet. Pick a product above to add the first one."
          rows={invoiceItems.map((item) => ({
            key: item.id,
            cells: [
              `${item.product.base.name} (${item.product.name})`,
              item.quantity,
              Number(item.unit_price).toLocaleString(),
              Number(item.total).toLocaleString(),
            ],
            actions: (
              <RowAction label="Delete item" onClick={() => handleDeleteItem(item.id)}>
                <Trash2 className="h-5 w-5" />
              </RowAction>
            ),
          }))}
        />
      </InvoiceSection>
    </InvoiceScreen>
  );
}

export default CreateSalesInvoice;
