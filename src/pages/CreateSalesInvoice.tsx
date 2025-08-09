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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Form Fields */}
            <div className="lg:col-span-2 space-y-6">
              {/* Invoice Details Card */}
              <Card>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Invoice No */}
                    <div className="space-y-2">
                      <Label htmlFor="invoiceNo">Invoice no. (optional)</Label>
                      <Input
                        id="invoiceNo"
                        value={formData.invoiceNo}
                        onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
                        placeholder="Enter invoice number"
                      />
                    </div>

                    {/* Customer */}
                    <div className="space-y-2">
                      <Label htmlFor="customer">Customer</Label>
                      <Select value={formData.customer} onValueChange={(value) => setFormData({ ...formData, customer: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mohsin">Mohsin Ali & Sons</SelectItem>
                          <SelectItem value="ahmed">Ahmed Trading Co.</SelectItem>
                          <SelectItem value="karachi">Karachi Steel Works</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Date Issued */}
                    <div className="space-y-2">
                      <Label htmlFor="dateIssued">Date Issued</Label>
                      <Input
                        id="dateIssued"
                        type="date"
                        value={formData.dateIssued}
                        onChange={(e) => setFormData({ ...formData, dateIssued: e.target.value })}
                      />
                    </div>

                    {/* Date Due */}
                    <div className="space-y-2">
                      <Label htmlFor="dateDue">Date Due</Label>
                      <Input
                        id="dateDue"
                        type="date"
                        value={formData.dateDue}
                        onChange={(e) => setFormData({ ...formData, dateDue: e.target.value })}
                      />
                    </div>

                    {/* Discount */}
                    <div className="space-y-2">
                      <Label htmlFor="discount">Discount</Label>
                      <div className="relative">
                        <Input
                          id="discount"
                          value={formData.discount}
                          onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                          placeholder="0.0"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                      </div>
                    </div>

                    {/* Tax */}
                    <div className="space-y-2">
                      <Label htmlFor="tax">Tax</Label>
                      <div className="relative">
                        <Input
                          id="tax"
                          value={formData.tax}
                          onChange={(e) => setFormData({ ...formData, tax: e.target.value })}
                          placeholder="0.0"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                      </div>
                    </div>

                    {/* Payment Status */}
                    <div className="space-y-2">
                      <Label htmlFor="paymentStatus">Payment Status</Label>
                      <Select value={formData.paymentStatus} onValueChange={(value) => setFormData({ ...formData, paymentStatus: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Paid">Paid</SelectItem>
                          <SelectItem value="Overdue">Overdue</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Status */}
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Sent">Sent</SelectItem>
                          <SelectItem value="Approved">Approved</SelectItem>
                          <SelectItem value="Cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="mt-4 space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Add any additional notes here..."
                      rows={4}
                      className="resize-none"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Invoice Summary */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Invoice Summary</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden">
                    {/* Table Header */}
                    <div className="bg-muted px-4 py-3 border-b">
                      <div className="grid grid-cols-5 gap-4 text-sm font-medium">
                        <div>id</div>
                        <div>product</div>
                        <div>quantity</div>
                        <div>unit price</div>
                        <div>total</div>
                      </div>
                    </div>

                    {/* Table Body */}
                    <div className="divide-y">
                      {invoiceItems.map((item) => (
                        <div
                          key={item.id}
                          className="px-4 py-3 grid grid-cols-5 gap-4 text-sm hover:bg-accent/50 transition-colors"
                        >
                          <div>{item.id}</div>
                          <div className="font-medium">{item.product}</div>
                          <div>{item.quantity}</div>
                          <div>{item.unitPrice}</div>
                          <div className="font-semibold">{item.total}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Add Invoice Item */}
              <Card>
                <CardHeader>
                  <CardTitle>Add Invoice Item</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="product">Product</Label>
                    <Select value={newItem.product} onValueChange={(value) => setNewItem({ ...newItem, product: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1/2 Inch Nut Bolts">1/2 Inch Nut Bolts</SelectItem>
                        <SelectItem value="Scissors">Scissors</SelectItem>
                        <SelectItem value="Nylon Rope">Nylon Rope</SelectItem>
                        <SelectItem value="Steel Wire">Steel Wire</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>

                  <Button onClick={addItem} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </CardContent>
              </Card>

              {/* Totals */}
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between text-sm">
                    <span>Invoice Subtotal</span>
                    <span className="font-semibold">{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Discount ({formData.discount}%)</span>
                    <span className="font-semibold">-{discountAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax ({formData.tax}%)</span>
                    <span className="font-semibold">+{taxAmount.toLocaleString()}</span>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between">
                      <span className="font-medium">Total Amount</span>
                      <span className="font-bold text-lg">{totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button variant="secondary" onClick={handleSaveDraft} className="w-full">
                  Save Draft
                </Button>
                <Button onClick={handleCreateInvoice} className="w-full">
                  Create Sales Invoice
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default CreateSalesInvoice;