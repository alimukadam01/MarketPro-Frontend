import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { Edit, Trash2, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface InvoiceItem {
  id: number;
  product: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

const CreateSalesInvoice = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();
  
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([
    { id: 1, product: "1/2 Half Inch Bolts", quantity: 10, unitPrice: 1000, total: 10000 },
    { id: 2, product: "Scissors", quantity: 12, unitPrice: 234, total: 2808 },
    { id: 3, product: "Nylon Rope", quantity: 15, unitPrice: 150, total: 2250 },
    { id: 4, product: "Scissors", quantity: 12, unitPrice: 234, total: 2808 },
    { id: 5, product: "Nylon Rope", quantity: 15, unitPrice: 150, total: 2250 },
    { id: 6, product: "Scissors", quantity: 12, unitPrice: 234, total: 2808 },
  ]);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);

  const [newItem, setNewItem] = useState({
    product: "",
    quantity: 0
  });
  const [formData, setFormData] = useState({
    invoiceNo: "",
    customer: "",
    dateIssued: "2025-08-09",
    dateDue: "2025-08-09",
    notes: "",
    discount: "0.0",
    tax: "0.0",
    paymentStatus: "Pending",
    status: "Pending"
  });

  const subtotal = invoiceItems.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = (subtotal * parseFloat(formData.discount)) / 100;
  const taxAmount = ((subtotal - discountAmount) * parseFloat(formData.tax)) / 100;
  const totalAmount = subtotal - discountAmount + taxAmount;

  const addItem = () => {
    if (newItem.product && newItem.quantity > 0) {
      const unitPrice = 100; // Default price, should be from product selection
      const newInvoiceItem: InvoiceItem = {
        id: invoiceItems.length + 1,
        product: newItem.product,
        quantity: newItem.quantity,
        unitPrice,
        total: newItem.quantity * unitPrice
      };
      setInvoiceItems([...invoiceItems, newInvoiceItem]);
      setNewItem({ product: "", quantity: 0 });
    }
  };

  const removeItem = (id: number) => {
    setInvoiceItems(invoiceItems.filter(item => item.id !== id));
  };

  const toggleRowSelection = (id: number) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  };

  const handleSaveDraft = () => {
    console.log("Saving draft...", { formData, invoiceItems });
    // Handle save draft logic
  };

  const handleCreateInvoice = () => {
    console.log("Creating invoice...", { formData, invoiceItems });
    // Handle create invoice logic
    navigate("/sales");
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar onCollapseChange={setSidebarCollapsed} />
      
      <div className={`${sidebarCollapsed ? 'ml-16' : 'ml-64'} transition-all duration-300 flex flex-col`}>
        <Header />
        
        <main className="flex-1 p-6 space-y-6">
          {/* Breadcrumb */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              <span className="text-primary cursor-pointer" onClick={() => navigate("/")}>home</span> /
              <span className="text-primary cursor-pointer" onClick={() => navigate("/sales")}> sales</span> /
              <span className="text-primary cursor-pointer"> invoices</span> /
              <span> create</span>
            </p>
            <div>
              <h1 className="text-2xl font-bold">Create Sales Invoice</h1>
              <p className="text-muted-foreground">create a new sales invoice</p>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="flex flex-row gap-12">
            {/* First Column - Invoice Details */}
            <div className="flex flex-col flex-wrap flex-1">
              {/* Invoice Details Heading */}
              <h2 className="text-lg font-semibold mb-6">Invoice Details</h2>
              
              {/* First Row - Invoice No and Customer */}
              <div className="flex gap-6 mb-6">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="invoiceNo">Invoice no. (optional)</Label>
                  <Input
                    id="invoiceNo"
                    value={formData.invoiceNo}
                    onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
                    placeholder="Enter invoice number"
                    className="border-[#ADB5BD]"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label htmlFor="customer">Customer</Label>
                  <Select value={formData.customer} onValueChange={(value) => setFormData({ ...formData, customer: value })}>
                    <SelectTrigger className="border-[#ADB5BD]">
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent className="z-50">
                      <SelectItem value="mohsin">Mohsin Ali & Sons</SelectItem>
                      <SelectItem value="ahmed">Ahmed Trading Co.</SelectItem>
                      <SelectItem value="karachi">Karachi Steel Works</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Notes - Full Width */}
              <div className="mb-6 space-y-1">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add any additional notes here..."
                  rows={4}
                  className="resize-none border-[#ADB5BD]"
                />
              </div>

              {/* Second Row - Date Issued and Date Due */}
              <div className="flex gap-6 mb-6">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="dateIssued">Date Issued</Label>
                  <Input
                    id="dateIssued"
                    type="date"
                    value={formData.dateIssued}
                    onChange={(e) => setFormData({ ...formData, dateIssued: e.target.value })}
                    className="border-[#ADB5BD]"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label htmlFor="dateDue">Date Due</Label>
                  <Input
                    id="dateDue"
                    type="date"
                    value={formData.dateDue}
                    onChange={(e) => setFormData({ ...formData, dateDue: e.target.value })}
                    className="border-[#ADB5BD]"
                  />
                </div>
              </div>

              {/* Third Row - Discount and Tax */}
              <div className="flex gap-6 mb-6">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="discount">Discount</Label>
                  <div className="relative">
                    <Input
                      id="discount"
                      value={formData.discount}
                      onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                      placeholder="0.0"
                      className="border-[#ADB5BD]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                  </div>
                </div>
                <div className="flex-1 space-y-1">
                  <Label htmlFor="tax">Tax</Label>
                  <div className="relative">
                    <Input
                      id="tax"
                      value={formData.tax}
                      onChange={(e) => setFormData({ ...formData, tax: e.target.value })}
                      placeholder="0.0"
                      className="border-[#ADB5BD]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                  </div>
                </div>
              </div>

              {/* Fourth Row - Payment Status and Status */}
              <div className="flex gap-6">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="paymentStatus">Payment Status</Label>
                  <Select value={formData.paymentStatus} onValueChange={(value) => setFormData({ ...formData, paymentStatus: value })}>
                    <SelectTrigger className="border-[#ADB5BD]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-50">
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Paid">Paid</SelectItem>
                      <SelectItem value="Overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 space-y-1">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger className="border-[#ADB5BD]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-50">
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Sent">Sent</SelectItem>
                      <SelectItem value="Approved">Approved</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Second Column - Add Invoice Item and Summary */}
            <div className="flex flex-col flex-wrap flex-1">
              {/* Add Invoice Item Heading */}
              <h2 className="text-lg font-semibold mb-6">Add Invoice Item</h2>
              
              {/* Product Selection Row */}
              <div className="flex gap-6 mb-6">
                <div className="w-[60%] space-y-1">
                  <Label htmlFor="product">Select Product</Label>
                  <Select value={newItem.product} onValueChange={(value) => setNewItem({ ...newItem, product: value })}>
                    <SelectTrigger className="border-[#ADB5BD]">
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent className="z-50">
                      <SelectItem value="1/2 Inch Nut Bolts">1/2 Inch Nut Bolts</SelectItem>
                      <SelectItem value="Scissors">Scissors</SelectItem>
                      <SelectItem value="Nylon Rope">Nylon Rope</SelectItem>
                      <SelectItem value="Steel Wire">Steel Wire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-[20%] space-y-1">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    className="border-[#ADB5BD]"
                  />
                </div>
                <div className="w-[20%] flex items-end">
                  <Button onClick={addItem} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              </div>

              {/* Invoice Summary Table */}
              <div className="mb-6">
                <div className="space-y-[10px]">
                  {/* Header Row */}
                  <div className="bg-card rounded-lg border h-[35px] flex items-center px-4">
                    <div className="grid grid-cols-5 gap-4 w-full text-sm font-medium text-muted-foreground">
                      <div className="min-w-0">id</div>
                      <div className="min-w-0">product</div>
                      <div className="min-w-0">quantity</div>
                      <div className="min-w-0">unit price</div>
                      <div className="min-w-0">total</div>
                    </div>
                  </div>

                  {/* Rows */}
                  {invoiceItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => toggleRowSelection(item.id)}
                      className={`bg-card rounded-lg h-[35px] flex items-center px-4 cursor-pointer transition-colors hover:bg-muted/20 ${
                        selectedRows.includes(item.id) ? 'border-2 border-[#4285F4]' : 'border border-border'
                      }`}
                    >
                      <div className="grid grid-cols-5 gap-4 w-full text-sm">
                        <div className="min-w-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent">{item.id}</div>
                        <div className="font-medium min-w-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent">{item.product}</div>
                        <div className="min-w-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent">{item.quantity}</div>
                        <div className="min-w-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent">{item.unitPrice}</div>
                        <div className="font-semibold min-w-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent">{item.total}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals Row */}
              <div className="flex gap-6 mb-6">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="subtotal">Subtotal</Label>
                  <Input 
                    id="subtotal" 
                    value={subtotal.toLocaleString()} 
                    readOnly 
                    className="border-[#ADB5BD]"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label htmlFor="totalAmount">Total</Label>
                  <Input 
                    id="totalAmount" 
                    value={totalAmount.toLocaleString()} 
                    readOnly 
                    className="font-semibold border-[#ADB5BD]"
                  />
                </div>
              </div>

              {/* Action Buttons - Bottom Right */}
              <div className="flex justify-end gap-3 mt-auto">
                <Button variant="secondary" onClick={handleSaveDraft}>Save as Draft</Button>
                <Button onClick={handleCreateInvoice}>Create Invoice</Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default CreateSalesInvoice;