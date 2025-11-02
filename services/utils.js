export const SalesInvoiceStatusMap = {
  "D": "Draft",
  "S": "Sent",
  "O": "Overdue",
  "X": "Cancelled",
  "C": "Completed",
  "PC": "Partially Completed",
  "R": "Received",
  "PR": "Partially Received"
}

export const PurchaseInvoiceStatusMap = {
  "D": "Draft",
  "S": "Sent",
  "O": "Overdue",
  "X": "Cancelled",
  "R": "Received",
  "PR": "Partially Received"
}

export const PaymentStatusMap = {
  "P": "Paid",
  "PP": "Partially Paid",
  "PEN": "Pending",
  "C": "Cancelled",
  "RF": "Refunded"
}

export const getStatusColor = (status) => {
  switch (status) {
    case "C":
      return "bg-green-100 text-green-700"
    case "D":
    case "PC":
    case "S":
      return "bg-yellow-100 text-yellow-700"
    case "X":
    case "O":
      return "bg-red-100 text-red-700"
    default:
      return "bg-gray-100 text-gray-700"
  }
}

export const getPaymentStatusColor = (paymentStatus) =>{
  switch (paymentStatus) {
    case "P":
      return "bg-green-100 text-green-700"
    case "PP":
    case "PEN":
      return "bg-yellow-100 text-yellow-700"
    case "C":
    case "RF":
      return "bg-red-100 text-red-700"
    default:
      return "bg-gray-100 text-gray-700"
  }
}

export function transformSalesInvoice(data) {

  // Helper to format date as DD/MM/YYYY
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB"); // Format: DD/MM/YYYY
  }

  // Helper to format currency as "PKR X,XXX"
  const formatCurrency = (amount) => {
    return `PKR ${Number(amount).toLocaleString()}`;
  }

  return {
    id: data.id,
    invoice_no: data.invoice_number, 
    status: data.status,
    date_issued: formatDate(data.date_issued),
    date_due: formatDate(data.date_due),
    payment_status: data.payment_status,
    tax: data.tax?.type === "percentage" ? `${data.tax.value}%` : formatCurrency(data.tax.value),
    discount: (data.discount && Object.keys(data.discount).length > 0) ? (data.discount?.type === "percentage" ? `${data.discount.value}%` : formatCurrency(data.discount.value)) : "none",
    total_items: String(data.total_items),
    sub_total: formatCurrency(data.sub_total),
    total: formatCurrency(data.total),
  }
}

export function transformPurchaseInvoice(data) {

  // Helper to format date as DD/MM/YYYY
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB"); // Format: DD/MM/YYYY
  }

  // Helper to format currency as "PKR X,XXX"
  const formatCurrency = (amount) => {
    return `PKR ${Number(amount).toLocaleString()}`;
  }

  return {
    id: data.id,
    invoice_no: data.invoice_number, 
    status: data.status,
    supplier: data.supplier.name,
    delivery: formatDate(data.delivery),
    date_due: formatDate(data.date_due),
    payment_status: data.payment_status,
    tax: data.tax?.type === "percentage" ? `${data.tax.value}%` : formatCurrency(data.tax.value),
    total_items: String(data.total_items),
    sub_total: formatCurrency(data.sub_total),
    total: formatCurrency(data.total),
    amount_paid: data.amount_paid
  }
}

export function transformInventoryItem(data) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC"
    })
  }

  // Helper to format currency as "PKR X,XXX"
  const formatCurrency = (amount) => {
    return `PKR ${Number(amount).toLocaleString()}`;
  }

  return {
    id: data.id,
    product: data.product.name,
    quantity: data.quantity,
    quantity_on_hand: data.quantity_on_hand,
    quantity_reserved: data.quantity_reserved,
    unit_cost: formatCurrency(data.unit_cost),
    unit_price: formatCurrency(data.unit_price),
    reorder_level: data.reorder_level,
    last_updated: formatDate(data.last_updated)
  }
}

export function transformProduct(data) {
  return {
    id: data.id,
    name: data.name,
    unit: `${data.unit.name} (${data.unit.abv})`,
    desc: data.desc || ""
  }
}

export function createIdMap(arr, field = null) {
  return arr.reduce((acc, item) => {
    if (!item.id) {
      throw new Error("Each object must have an id property");
    }
    acc[item.id] = field ? item[field] : item;
    return acc;
  }, {});
}

export function createNestedIdMap(arr, keyPath, valueField = null) {
  const keys = keyPath.split(".");
  return arr.reduce((acc, item) => {
    // Walk down the path to get the key
    let keyValue = item;
    for (const k of keys) {
      if (keyValue == null) break;
      keyValue = keyValue[k];
    }
    if (keyValue == null) {
      throw new Error(`Could not find ${keyPath} on item`);
    }

    acc[keyValue] = valueField ? item[valueField] : item;
    return acc;
  }, {});
}

export const formatSearchQuery = (searchInput) => {
  if (!searchInput || searchInput.trim() === "") return null;
  
  const encoded = encodeURIComponent(searchInput.trim());
  return `?search=${encoded}`;
}

export const formatFilterQuery = (filters = {}) => {
  const params = Object.entries(filters)
    .filter(([_, value]) => value !== undefined && value !== "" && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");

  return params ? `?${params}` : "";
}

