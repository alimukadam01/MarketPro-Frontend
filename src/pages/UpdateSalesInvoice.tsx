import { useState, useEffect } from "react";
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
  derivePaymentStatus,
  getPaymentStatusColor
} from "../../services/utils"
import { useAuth } from "../../services/AuthProvider"
import {
  getAvailableProductsList,
  getCustomersList,
  updateSalesInvoiceAndItems,
  getSalesInvoiceDetail,
  getInvoicePDFData,
  projectsAPIPackage,
  getInvoiceWhatsAppMessage
} from "../../services/api"
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import ReturnItem from "@/components/ui/return-item";
import Payments from "@/components/ui/payments";
import { PDFDownloadLink, pdf } from "@react-pdf/renderer";
import Invoice from "@/pages/Invoice";

const UpdateSalesInvoice = () => {

  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [returnItemWindowOpen, setReturnItemWindowOpen] = useState(false)
  const [paymentsOpen, setPaymentsOpen] = useState(false)
  const [itemReturned, setItemReturned] = useState(false)
  const [invoiceItems, setInvoiceItems] = useState([])
  const [returningItem, setReturningItem] = useState(null)
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [projects, setProjects] = useState([])
  const [pdfData, setPdfData] = useState(null)
  const [amountPaid, setAmountPaid] = useState(0)
  const { token } = useAuth()
  const businessId = localStorage.getItem("mp-business-id")
  const navigate = useNavigate()
  const location = useLocation()
  const invoice_id = location.state?.invoice_id || null

  // react-hook-form setup
  const { register, handleSubmit, control, watch, reset, setValue } = useForm({
    defaultValues: {
      invoice_number: "",
      customer: "",
      notes: "",
      date_issued: "2025-08-09",
      date_due: "2025-08-09",
      discount: "0.0",
      tax: "0.0",
      status: "",
      project: null,
      newItemProduct: "",
      newItemQuantity: 0,
      newItemPrice: 0
    },
  })

  const discount = parseFloat(watch("discount") || 0)
  const tax = parseFloat(watch("tax") || 0)

  const subtotal = invoiceItems
    .filter(item => !item.is_returned)
    .reduce((sum, item) => sum + item.total, 0)
  const [discountType, setDiscountType] = useState("percentage")
  const [taxType, setTaxType] = useState("percentage")
  const discountAmount = discountType === "percentage" ? (subtotal * discount) / 100 : discount
  const taxAmount = taxType === "percentage" ? (subtotal * tax) / 100 : tax
  const totalAmount = subtotal - discountAmount + taxAmount
  const selectedProduct = products[watch("newItemProduct")]
  const paymentStatus = derivePaymentStatus(amountPaid, totalAmount)

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
      id: item.id,
      product_id: item.product.id,
      quantity: item.quantity,
      unit_price: item.unit_price,
    }))

    try {
      const success = await updateSalesInvoiceAndItems(token, invoice_id, {
        ...rest,
        tax: tax,
        discount: discount,
        items: items
      })

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
      setInvoiceItems([...invoiceItems, newInvoiceItem]);
      reset({ newItemProduct: "", newItemQuantity: 0 }, { keepValues: true });
    }
  }

  const populateInvoiceFields = (data) => {
    reset({
      invoice_number: data.invoice_number || "",
      customer: data.customer?.id || "",
      notes: data.notes || "",
      date_issued: data.date_issued?.split("T")[0] || "",
      date_due: data.date_due || "",
      discount: data.discount?.value ?? "0.0",
      tax: data.tax?.value ?? "0.0",
      status: data.status || "",
      project: data.projects?.length > 0 ? String(data.projects[0].project) : null,
      newItemProduct: "",
      newItemQuantity: 0,
      newItemPrice: 0,
    })

    setAmountPaid(data.amount_paid || 0)

    // build your items array for state
    const items = (data.invoice_items || []).map((item) => ({
      id: item.id,
      product: item.product,
      quantity: item.net_quantity,
      unit_price: item.unit_price,
      total: (item.net_quantity * item.unit_price) || 0,
      is_returned: item.is_returned
    }))
    setInvoiceItems(items)

    setDiscountType(data.discount?.type)
    setTaxType(data.tax?.type)
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
    setInvoiceItems(invoiceItems.filter(item => item.id !== id));
  }

  const handleSendWhatsApp = async () => {
    if (!pdfData) return

    try {
      const payload = await getInvoiceWhatsAppMessage(token, invoice_id)
      if (!payload) {
        toast.error("Could not prepare the message. Check the customer's phone number.")
        return
      }

      // Rendered from data already in hand — the component's own fetch would
      // not have resolved by the time the document is generated.
      const blob = await pdf(<Invoice invoice={pdfData} />).toBlob()
      const fileName = `Invoice-${pdfData.invoice_number || invoice_id}.pdf`
      const file = new File([blob], fileName, { type: "application/pdf" })

      // The share sheet is the only route that carries the PDF into WhatsApp;
      // a wa.me link can only ever take text.
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text: payload.message })
        return
      }

      // Otherwise hand over the PDF and open the chat with the message ready,
      // so the invoice is one attach away.
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = fileName
      link.click()
      URL.revokeObjectURL(url)

      window.open(payload.whatsapp_url, "_blank")
      toast.info("Invoice downloaded — attach it in the WhatsApp chat.")
    } catch (error) {
      // Dismissing the share sheet is a cancel, not a failure.
      if (error?.name === "AbortError") return
      console.log("Error sending invoice:", error)
      toast.error("Failed to send the invoice.")
    }
  }

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
                          className={`bg-card rounded-lg h-[35px] flex flex-1 items-center px-4 border border-border ${isReturned ? "opacity-50" : ""}`}
                        >
                          <div className="grid grid-cols-[48px_2fr_1fr_1fr_1fr] gap-4 w-full text-sm">
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
                  {
                    pdfData &&
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-44"
                        onClick={handleSendWhatsApp}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Send on WhatsApp
                      </Button>
                      <PDFDownloadLink
                        document={<Invoice invoice={pdfData} />}
                        fileName={`Invoice-${pdfData.invoice_number || invoice_id}.pdf`}
                      >
                        <Button type="button" className="w-36">Download PDF</Button>
                      </PDFDownloadLink>
                    </>
                  }
                  <Button type="submit" className="w-36">Update Invoice</Button>
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

        </main>
      </div>
    </div>
  );
}

export default UpdateSalesInvoice;
