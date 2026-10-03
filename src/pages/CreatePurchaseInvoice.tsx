import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner"
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartNoAxesColumnDecreasing, Plus, Trash2 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import {
  formatPartyLabel,
  PaymentStatusMap,
  PurchaseInvoiceStatusMap,
  createIdMap,
  derivePaymentStatus,
  getPaymentStatusColor,
  todayForInput,
} from "../../services/utils"
import { useAuth } from "../../services/AuthProvider"
import {
  getProductVariantsList,
  suppliersAPIPackage,
  postPurchaseInvoiceAndItems,
  projectsAPIPackage
} from "../../services/api"
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import { SubmitButton } from "@/components/ui/submit-button";
import { usePending } from "@/hooks/use-pending";
import { Combobox } from "@/components/ui/combobox";

const CreatePurchaseInvoice = () => {
  const { pending, run } = usePending();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [invoiceItems, setInvoiceItems] = useState([])
  const [products, setProducts] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [projects, setProjects] = useState([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [suppliersLoading, setSuppliersLoading] = useState(true)
  const [projectsLoading, setProjectsLoading] = useState(true)
  const { token } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const project_id = location.state?.project_id || null

  // react-hook-form setup
  const { register, handleSubmit, control, watch, reset, setValue } = useForm({
    defaultValues: {
      invoice_number: "",
      amount_paid: "0.0",
      supplier: "",
      notes: "",
      date_issued: todayForInput(),
      delivery: todayForInput(),
      date_due: todayForInput(),
      tax: 0.0,
      status: "R",
      project: project_id ? String(project_id) : null,
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
  const paymentStatus = derivePaymentStatus(watch("amount_paid"), totalAmount)

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

  const handleDeleteItem = (e, id) => {
    e.preventDefault();
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
    () => Object.entries(products).map(([value, item]) => ({ value, label: item.name })),
    [products])

  const projectOptions = useMemo(
    () => Object.entries(projects).map(([value, project]) => ({ value, label: project.name })),
    [projects])

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

    fetchProducts()
    fetchSuppliers()
    fetchProjects()
  }, [token])

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
                  {/* The day the purchase happened, which is what a purchase
                      target counts on. Editable, so an invoice entered late
                      still lands in the right period. */}
                  <Label htmlFor="date_issued">Invoice Date</Label>
                  <Input id="date_issued" type="date" {...register("date_issued")} />
                </div>
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
                        <div>id</div>
                        <div>product</div>
                        <div>quantity</div>
                        <div>unit cost</div>
                        <div>total</div>
                      </div>
                    </div>
                    {/* Matches the 16px delete button sitting outside each row. */}
                    <div className="w-4" />
                  </div>

                  {invoiceItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <div className="bg-card rounded-lg h-[35px] flex flex-1 items-center px-4 border border-border">
                        <div className="grid grid-cols-[48px_2fr_1fr_1fr_1fr] gap-4 w-full text-sm">
                          <div>{item.id}</div>
                          <div className="font-medium">{item.product.name}</div>
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
                          onClick={(e) => handleDeleteItem(e, item.id)}
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
                  <div className="relative">
                    <Input id="amount_paid" {...register("amount_paid")} placeholder="0.0" />
                  </div>
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

              <div className="flex justify-end gap-3 mt-6">
                <Controller
                  name="project"
                  control={control}
                  render={({ field }) => (
                    <Combobox
                      id="project"
                      className="w-48"
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
                <SubmitButton type="submit" pending={pending} pendingLabel="Creating…">Create Invoice</SubmitButton>
              </div>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}

export default CreatePurchaseInvoice;
