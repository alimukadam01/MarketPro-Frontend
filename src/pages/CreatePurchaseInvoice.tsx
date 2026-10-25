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
  todayForInput,
} from "../../services/utils"
import { useAuth } from "../../services/AuthProvider"
import {
  attachStagedToInvoice,
  createSupplierWithBalance,
  getProductVariantsList,
  suppliersAPIPackage,
  postPurchaseInvoiceAndItems,
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
import {
  AmountToggleInput,
  InvoiceSummaryCard,
  PaymentButton,
  PurchaseStatusSelect,
} from "@/components/invoice/InvoiceRail";

// What the payments and images dialogs hold for an invoice that does not
// exist yet.
type StagedPayment = { id: string; amount: number; status: string; fields: object; imageFile?: File | null }
type StagedImage = { id: string; file: File; caption: string; preview: string }

// A row added here keeps the raw variant off the products list, which carries
// its nested base; show "Base (Variant)" when it is there.
const productLabel = (product) =>
  product?.base ? `${product.base.name} (${product.name})` : product?.name

const ITEM_COLUMNS = ["Product", "Quantity", "Unit Cost", "Total"]

const CreatePurchaseInvoice = () => {
  const { pending, run } = usePending();

  const [invoiceItems, setInvoiceItems] = useState([])
  const [products, setProducts] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [projects, setProjects] = useState([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [suppliersLoading, setSuppliersLoading] = useState(true)
  const [projectsLoading, setProjectsLoading] = useState(true)
  // Payments and images are added before the invoice exists, so they are held
  // here and sent once it has been created.
  const [stagedPayments, setStagedPayments] = useState<StagedPayment[]>([])
  const [stagedImages, setStagedImages] = useState<StagedImage[]>([])
  const [paymentsOpen, setPaymentsOpen] = useState(false)
  const [imagesOpen, setImagesOpen] = useState(false)
  const { token } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const project_id = location.state?.project_id || null

  // amount_paid is gone from here: a payment is added through the payments
  // dialog, with its account, method and date, rather than posted as a bare
  // figure that became a receipt with none of those.
  const { register, handleSubmit, control, watch, reset, setValue } = useForm({
    defaultValues: {
      invoice_number: "",
      supplier: "",
      notes: "",
      date_issued: todayForInput(),
      delivery: todayForInput(),
      date_due: todayForInput(),
      tax: "0.0",
      status: "R",
      project: project_id ? String(project_id) : null,
      newItemProduct: "",
      newItemQuantity: 0,
      newItemCost: 0
    },
  })

  const tax = parseFloat(String(watch("tax") || 0))

  const subtotal = invoiceItems.reduce((sum, item) => sum + item.total, 0)
  const [taxType, setTaxType] = useState("percentage")
  const taxAmount = taxType === "percentage" ? (subtotal * tax) / 100 : tax
  const totalAmount = subtotal + taxAmount

  // Only cleared money pays the invoice; a staged cheque stays pending.
  const stagedPaid = stagedPayments
    .filter((payment) => payment.status === "C")
    .reduce((sum, payment) => sum + Number(payment.amount), 0)

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

    try {
      const created = await postPurchaseInvoiceAndItems(token, {
        ...rest,
        tax: tax,
        items: items
      })

      if (!created) {
        toast.error("Failed to create purchase invoice.")
        return
      }

      // The invoice exists from here on. A payment or image that fails now is
      // reported as exactly that, and the new invoice is opened so it can be
      // added again - not reported as a failed create.
      const { paymentFailures, imageFailures } = await attachStagedToInvoice(
        token, created.id, false, { payments: stagedPayments, images: stagedImages })

      if (paymentFailures || imageFailures) {
        const missed = [
          paymentFailures && `${paymentFailures} payment${paymentFailures > 1 ? "s" : ""}`,
          imageFailures && `${imageFailures} image${imageFailures > 1 ? "s" : ""}`,
        ].filter(Boolean).join(" and ")
        toast.warning(`Invoice created, but ${missed} could not be saved. Add ${paymentFailures + imageFailures > 1 ? "them" : "it"} again here.`)
        navigate("/purchases/update-invoice", { state: { invoice_id: created.id }, replace: true })
        return
      }

      toast.success("Purchase invoice created successfully!")
      navigate("/purchases");
    } catch (error) {
      console.log("Error creating purchase invoice:", error)
      toast.error("Failed to create purchase invoice.")
    }
  }

  const addItem = (product, quantity, unit_cost) => {
    if (product && quantity > 0) {
      const selectedProduct = products[product]
      const newInvoiceItem = {
        // Negative, so it can never equal a saved line's id (the update
        // treats a matching id as that line) or repeat after a delete,
        // which length + 1 did - and deleting one then removed both.
        id: -(Date.now() + Math.random()),
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
      setInvoiceItems(merged)
      reset({ newItemProduct: "", newItemQuantity: 0 }, { keepValues: true })
    }
  }

  const handleDeleteItem = (id) => {
    setInvoiceItems(invoiceItems.filter(item => item.id !== id));
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

  // A supplier typed here that MarketPro does not have: the Create button
  // in the picker opens its dialog with the name filled in. Products are
  // not created from an invoice - they and their stock come from the
  // Products and Inventory screens (docs/INVOICE-WORKFLOWS.md).
  const [creating, setCreating] = useState<{ kind: "supplier"; text: string } | null>(null)
  const supplierCreate = useCreateAction(supplierOptions, "supplier",
    (text) => setCreating({ kind: "supplier", text }))

  const projectOptions = useMemo(
    () => Object.entries(projects).map(([value, project]) => ({ value, label: project.name })),
    [projects])

  // Outside the effect so a product or supplier created from the pickers
  // can reload its list and be picked straight away.
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
    fetchSuppliers()
    fetchProjects()
  }, [token])

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
      title="New Purchase Invoice"
      // Purchase status is chosen, not derived - it decides whether the goods
      // are restocked - so the pill beside the title is the picker.
      status={
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <PurchaseStatusSelect value={field.value} onChange={field.onChange} />
          )}
        />
      }
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
                  onInputChange={supplierCreate.onInputChange}
                  createAction={supplierCreate.createAction}
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
            {/* The day the purchase happened, which is what a purchase
                target counts on. Editable, so an invoice entered late
                still lands in the right period. */}
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
          {/* Typed adjustments sit with the figures they change, between the
              summary and the payment. A purchase has tax and no discount. */}
          <div className="space-y-1">
            <Label htmlFor="tax">Tax</Label>
            <AmountToggleInput
              id="tax"
              type={taxType}
              onToggle={() => setTaxType(taxType === "percentage" ? "amount" : "percentage")}
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
      dialogs={
        <>
          <Payments
            invoiceId={null}
            invoiceTotal={totalAmount}
            isSalesPayment={false}
            open={paymentsOpen}
            setOpen={setPaymentsOpen}
            stagedPayments={stagedPayments}
            onStagedChange={setStagedPayments}
          />
          <NewPartyDialog
            open={creating?.kind === "supplier"}
            setOpen={(open) => { if (!open) setCreating(null) }}
            kind="supplier"
            initialName={creating?.text || ""}
            create={(data) => createSupplierWithBalance(token, data)}
            asOf={watch("date_issued")}
            onCreated={async (item) => {
              await fetchSuppliers()
              setValue("supplier", String(item.id) as never)
            }}
          />
          <InvoiceImages
            invoiceId={null}
            isSalesInvoice={false}
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
          emptyText="No items yet. Pick a product above to add the first one."
          rows={invoiceItems.map((item) => ({
            key: item.id,
            cells: [
              productLabel(item.product),
              item.quantity,
              Number(item.unit_cost).toLocaleString(),
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

export default CreatePurchaseInvoice;
