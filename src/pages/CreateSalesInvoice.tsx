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
import CustomFilter from "../components/layout/CustomFilter"
import {
  PaymentStatusMap,
  SalesInvoiceStatusMap,
  createIdMap,
  createNestedIdMap
} from "../../services/utils"
import { useAuth } from "../../services/AuthProvider"
import {
  getAvailableProductsList,
  getCustomersList,
  postSalesInvoiceAndItems,
  projectsAPIPackage
} from "../../services/api"
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";

const CreateSalesInvoice = () => {

  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [invoiceItems, setInvoiceItems] = useState([])
  const [selectedRows, setSelectedRows] = useState([])
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [projects, setProjects] = useState([])
  const { token } = useAuth()
  const businessId = localStorage.getItem("mp-business-id")
  const navigate = useNavigate()
  const location = useLocation()
  const project_id = location.state?.project_id || null

  // react-hook-form setup
  const { register, handleSubmit, control, watch, reset, setValue } = useForm({
    defaultValues: {
      invoice_number: "",
      customer: "",
      notes: "",
      date_issued: new Date().toISOString().split("T")[0],
      date_due: new Date().toISOString().split("T")[0],
      discount: "0.0",
      tax: "0.0",
      payment_status: "P",
      status: "C",
      project: project_id ? String(project_id) : null,
      newItemProduct: "",
      newItemQuantity: 0,
      newItemPrice: 0
    },
  })

  const discount = parseFloat(watch("discount") || 0)
  const tax = parseFloat(watch("tax") || 0)

  const subtotal = invoiceItems.reduce((sum, item) => sum + item.total, 0)
  const [discountType, setDiscountType] = useState("percentage")
  const [taxType, setTaxType] = useState("percentage")
  const discountAmount = discountType === "percentage" ? (subtotal * discount) / 100 : discount
  const taxAmount = taxType === "percentage" ? (subtotal * tax) / 100 : tax
  const totalAmount = subtotal - discountAmount + taxAmount
  const selectedProduct = products[watch("newItemProduct")]

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

    try {
      const success = await postSalesInvoiceAndItems(token, {
        ...rest,
        tax: tax,
        discount: discount,
        items: items
      })

      if (success) {
        toast.success("Sales invoice created successfully!")
        navigate(-1);
      } else {
        toast.error("Failed to create sales invoice.")
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
      setInvoiceItems([...invoiceItems, newInvoiceItem]);
      reset({ newItemProduct: "", newItemQuantity: 0 }, { keepValues: true });
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
        const products = await getAvailableProductsList(token, businessId)
        if (products) {
          const productMap = createNestedIdMap(products, 'product.id')
          setProducts(productMap)
        } else {
          toast.error("Failed to fetch products")
        }
      } catch (error) {
        console.log("Error fetching products:", error)
        toast.error("Failed to fetch products")
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

    fetchProducts()
    fetchCustomers()
    fetchProjects()
  }, [token])

  useEffect(() => {
    if (selectedProduct) {
      setValue("newItemPrice", selectedProduct.unit_price, { shouldDirty: false });
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
                  <Label htmlFor="customer">Customer</Label>
                  <Controller
                    name="customer"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select customer"></SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {customers && Object.keys(customers).length > 0 && Object.entries(customers).map(([key, customer]) => (
                            <SelectItem value={key} key={key}>
                              {customer.name}
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
                      {discountType === "percentage" ? <Button type="button" variant="outline" onClick={() => setDiscountType("amount")}>%</Button> : <Button type="button" variant="outline" onClick={() => setDiscountType("percentage")}>PKR</Button>}
                    </span>
                  </div>
                </div>
                <div className="flex-1 space-y-1">
                  <Label htmlFor="tax">Tax</Label>
                  <div className="relative">
                    <Input id="tax" {...register("tax")} placeholder="0.0" />
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {taxType === "percentage" ? <Button type="button" variant="outline" onClick={() => setTaxType("amount")}>%</Button> : <Button type="button" variant="outline" onClick={() => setTaxType("percentage")}>PKR</Button>}
                    </span>
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
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment status" />
                        </SelectTrigger>
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                        <SelectContent>
                          {products && Object.keys(products).length > 0 && Object.entries(products).map(([key, item]) => (
                            <SelectItem key={key} value={key}>
                              {item.product.base.name} ({item.product.name}) (available: {item.available_quantity})
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
                  <Label htmlFor="newItemPrice">Unit Price</Label>
                  <Input id="newItemPrice" type="number" {...register("newItemPrice")} />
                </div>
                <div className="w-[20%] flex items-end">
                  <Button
                    type="button"
                    onClick={() =>
                      addItem(watch("newItemProduct"), parseInt(watch("newItemQuantity") || 0), parseFloat(watch("newItemPrice") || 0.0))
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
                      <div>unit price</div>
                      <div>total</div>
                    </div>
                  </div>

                  {invoiceItems && invoiceItems.map((item, idx) => (
                    <div
                      key={item.id}
                      onClick={() => toggleRowSelection(item.id)}
                      className={`bg-card rounded-lg h-[35px] flex items-center px-4 cursor-pointer hover:bg-muted/20 ${selectedRows.includes(item.id) ? "border-2 border-[#4285F4]" : "border border-border"
                        }`}
                    >
                      <div className="grid grid-cols-[48px_2fr_1fr_1fr_1fr] gap-4 w-full text-sm">
                        <div>{idx + 1}</div>
                        <div className="font-medium">{item.product.base.name} ({item.product.name})</div>
                        <div>{item.quantity}</div>
                        <div>{item.unit_price}</div>
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
                <Controller
                  name="project"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={(val) => field.onChange(val === "none" ? null : val)} value={field.value ?? "none"}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Add to project" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select Project</SelectItem>
                        {projects && Object.keys(projects).length > 0 && Object.entries(projects).map(([key, project]) => (
                          <SelectItem value={key} key={key}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <Button type="submit">Create Invoice</Button>
              </div>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}

export default CreateSalesInvoice;
