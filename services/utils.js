export const SalesInvoiceStatusMap = {
  D: "Draft",
  S: "Sent",
  O: "Overdue",
  X: "Cancelled",
  C: "Completed",
  PC: "Partially Completed",
};

export const PurchaseInvoiceStatusMap = {
  D: "Draft",
  S: "Sent",
  O: "Overdue",
  X: "Cancelled",
  R: "Received",
  PR: "Partially Received",
};

export const PaymentStatusMap = {
  P: "Paid",
  PP: "Partially Paid",
  PEN: "Pending",
  C: "Cancelled",
  RF: "Refunded",
};

export const ReturnTypeMap = {
  to_invoice: "To Invoice",
  to_inventory: "To Inventory",
};

export const ProjectStatusMap = {
  P: "Planned",
  IP: "In Progress",
  C: "Completed",
  X: "Cancelled",
};

export const PQStatusMap = {
  D: "Draft",
  S: "Sent",
  A: "Accepted",
  R: "Rejected",
  X: "Cancelled",
};

const ConfigKeys = [
  "sales",
  "purchases",
  "projects",
  "inventory",
  "returned_items",
  "quotations",
  "products",
  "customers",
  "suppliers",
  "locations",
  "expenses",
];

export const getStatusColor = (status) => {
  console.log(status);

  switch (status) {
    case "C":
    case "R":
      return "bg-green-100 text-green-700";
    case "D":
    case "PC":
    case "S":
      return "bg-yellow-100 text-yellow-700";
    case "X":
    case "O":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

export const getPaymentStatusColor = (paymentStatus) => {
  switch (paymentStatus) {
    case "P":
      return "bg-green-100 text-green-700";
    case "PP":
    case "PEN":
      return "bg-yellow-100 text-yellow-700";
    case "C":
    case "RF":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB"); // Format: DD/MM/YYYY
};

export function transformSalesInvoice(data) {
  // Helper to format currency as "PKR X,XXX"
  const formatCurrency = (amount) => {
    return `PKR ${Number(amount).toLocaleString()}`;
  };

  return {
    id: data.id,
    invoice_no: data.invoice_number ? data.invoice_number : "N/A",
    status: data.status,
    date_issued: formatDate(data.date_issued),
    date_due: formatDate(data.date_due),
    payment_status: data.payment_status,
    tax:
      data.tax?.type === "percentage"
        ? `${data.tax.value}%`
        : formatCurrency(data.tax.value),
    discount:
      data.discount && Object.keys(data.discount).length > 0
        ? data.discount?.type === "percentage"
          ? `${data.discount.value}%`
          : formatCurrency(data.discount.value)
        : "none",
    total_items: String(data.total_items),
    sub_total: formatCurrency(data.sub_total),
    total: formatCurrency(data.total),
  };
}

export function transformPurchaseInvoice(data) {
  // Helper to format currency as "PKR X,XXX"
  const formatCurrency = (amount) => {
    return `PKR ${Number(amount).toLocaleString()}`;
  };

  return {
    id: data.id,
    invoice_no: data.invoice_number ? data.invoice_number : "N/A",
    status: data.status,
    supplier: data.supplier.name,
    delivery: formatDate(data.delivery),
    date_due: formatDate(data.date_due),
    payment_status: data.payment_status,
    tax:
      data.tax?.type === "percentage"
        ? `${data.tax.value}%`
        : formatCurrency(data.tax.value),
    total_items: String(data.total_items),
    sub_total: formatCurrency(data.sub_total),
    total: formatCurrency(data.total),
    amount_paid: data.amount_paid,
  };
}

export function transformInventoryItem(data) {
  // Helper to format currency as "PKR X,XXX"
  const formatCurrency = (amount) => {
    return `PKR ${Number(amount).toLocaleString()}`;
  };

  return {
    id: data.id,
    product: data.product && `${data.product.base.name} (${data.product.name})`,
    quantity: data.quantity,
    quantity_on_hand: data.quantity_on_hand,
    quantity_reserved: data.quantity_reserved,
    unit_cost: formatCurrency(data.unit_cost),
    unit_price: formatCurrency(data.unit_price),
    reorder_level: data.reorder_level,
    last_updated: formatDate(data.updated_at),
  };
}

export function transformProduct(data) {
  return {
    id: data.id,
    name: data.name,
    unit: `${data.unit.name} (${data.unit.abv})`,
    desc: data.desc || "",
  };
}

export function transformProductVariant(data) {
  return {
    id: data.id,
    name: `${data.base.name} (${data.name})`,
    unit: `${data.base.unit.name} (${data.base.unit.abv})`,
    desc: data.base.desc || "",
  };
}

export function transformCustomer(data) {
  return {
    id: data.id,
    name: data.name,
    phone: data.phone || "N/A",
    email: data.email || "N/A",
    address: data.address || "N/A",
    city: data.city.name,
  };
}

export function transformReturnedItem(data) {
  const invoice_no = data.invoice_item.sales_invoice.invoice_number;
  const sales_invoice = data.invoice_item.sales_invoice.id;

  return {
    id: data.id,
    sales_invoice: invoice_no ? invoice_no : `Sales Invoice (${sales_invoice})`,
    invoice_no: data.invoice_item.sales_invoice.invoice_no,
    invoice_date: formatDate(data.invoice_item.sales_invoice.date_issued),
    product: `${data.invoice_item.product.base.name} (${data.invoice_item.product.name})`,
    quantity: data.quantity,
    returned_at: formatDate(data.created_at),
    return_type: data.return_type ? ReturnTypeMap[data.return_type] : "None",
  };
}

export function transformProject(data) {
  return {
    id: data.id,
    name: data.name,
    customer: data.customer?.name || "None",
    status: ProjectStatusMap[data.status],
    purchase_invoices: data.num_purchase_inv,
    sales_invoices: data.num_sales_inv,
    tasks: data.num_tasks,
  };
}

export function transformPurchaseQuotation(data) {
  return {
    id: data.id,
    quotation_no: data.quotation_no,
    status: PQStatusMap[data.status],
    items: data.items.length,
    created_at: formatDate(data.created_at),
    // created_by: data.created_by.name,
    notes: data.notes,
  };
}

export function formatConfig(config, role) {
  const formattedConfig = {}

  ConfigKeys.forEach((key) => {
    formattedConfig[key] = key in config ? config[key] : true;
  })

  formattedConfig.employees = role === "admin"

  return formattedConfig
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
  const keyParts = keyPath.split(".");
  const valueParts = valueField ? valueField.split(".") : null;

  return arr.reduce((acc, item) => {
    // Walk down the path to get the key
    let keyValue = item;
    for (const k of keyParts) {
      if (keyValue == null) break;
      keyValue = keyValue[k];
    }
    if (keyValue == null) {
      throw new Error(`Could not find ${keyPath} on item`);
    }

    // Walk down the path to get the value (if valueField is specified)
    let value = item;
    if (valueField) {
      value = item;
      for (const v of valueParts) {
        if (value == null) break;
        value = value[v];
      }
      if (value == null) {
        throw new Error(`Could not find ${valueField} on item`);
      }
    }

    acc[keyValue] = value;
    return acc;
  }, {});
}

export const formatSearchQuery = (searchInput) => {
  if (!searchInput || searchInput.trim() === "") return null;

  const encoded = encodeURIComponent(searchInput.trim());
  return `?search=${encoded}`;
};

export const formatFilterQuery = (filters = {}) => {
  const params = Object.entries(filters)
    .filter(
      ([_, value]) => value !== undefined && value !== "" && value !== null,
    )
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
    )
    .join("&");

  return params ? `?${params}` : "";
};
