import { BASE_URL } from './api'

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
  "accounting",
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

// Mirrors the payment_status property on the invoice models.
export const derivePaymentStatus = (amountPaid, total) => {
  const paid = Number(amountPaid) || 0;
  const invoiceTotal = Number(total) || 0;

  if (invoiceTotal > 0 && paid >= invoiceTotal) return "P";
  if (paid > 0) return "PP";
  return "PEN";
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

// The business runs on one clock. Pinning it here means a browser set to a
// different timezone still sees and sends the same day the backend does.
export const BUSINESS_TIME_ZONE = "Asia/Karachi";

export const formatDate = (dateString) => {
  const date = new Date(dateString);
  // Format: DD/MM/YYYY
  return date.toLocaleDateString("en-GB", { timeZone: BUSINESS_TIME_ZONE });
};

/**
 * Today as YYYY-MM-DD in the business timezone. Use this for date inputs —
 * `new Date().toISOString()` converts to UTC first, so it reports yesterday
 * for the first five hours of every local day.
 */
export const todayForInput = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return parts; // en-CA already yields YYYY-MM-DD
};

export function transformExpense(data) {
  return {
    id: data.id,
    name: data.name,
    category: ExpenseCategoryMap[data.category] || "-",
    desc: data.desc,
    amount: data.amount,
    created_at: formatDate(data.created_at)
  }
}

export const TransactionTypeMap = {
  sale_payment: "Sale Payment",
  customer_receipt: "Customer Receipt",
  purchase_return_refund: "Purchase Return Refund",
  owner_capital: "Owner Capital",
  loan_received: "Loan Received",
  other_income: "Other Income",
  purchase_payment: "Purchase Payment",
  supplier_payment: "Supplier Payment",
  sales_return_refund: "Sales Return Refund",
  expense: "Expense",
  salary_payment: "Salary Payment",
  owner_drawings: "Owner Drawings",
  loan_repayment: "Loan Repayment",
  other_payment: "Other Payment",
  transfer: "Account Transfer",
  cash_adjustment: "Cash Adjustment",
};

// Grouped for the type picker, mirroring the BRD's catalogue.
export const TransactionTypeGroups = {
  "Money In": [
    "sale_payment", "customer_receipt", "purchase_return_refund",
    "owner_capital", "loan_received", "other_income",
  ],
  "Money Out": [
    "purchase_payment", "supplier_payment", "sales_return_refund",
    "expense", "salary_payment", "owner_drawings",
    "loan_repayment", "other_payment",
  ],
  "Neither": ["transfer", "cash_adjustment"],
};

// Types that name a customer or supplier when paid on account.
export const PartyTransactionTypes = [
  "customer_receipt", "supplier_payment",
  "sales_return_refund", "purchase_return_refund",
];

export const TransactionStatusMap = {
  C: "Cleared",
  PEN: "Pending",
  B: "Bounced",
};

export const AccountTypeMap = {
  cash: "Cash",
  wallet: "Mobile Wallet",
  bank: "Bank",
};

/**
 * How a money account reads in a dropdown, e.g.
 * "Bank Al-Habib (Bank) · PKR 45,000". The balance is what tells the user
 * whether the account can actually cover what they are about to record.
 */
export const formatAccountOption = (account) => {
  const label = `${account.name} (${AccountTypeMap[account.type] || account.type})`;
  if (account.balance === undefined || account.balance === null) return label;
  return `${label} · PKR ${Number(account.balance).toLocaleString()}`;
};

/**
 * True when a stored JWT is missing, unreadable, or past its exp claim.
 *
 * Lets the app send the user back to login on load, rather than rendering the
 * shell and every page coming up empty because each request quietly 401s.
 * A token we cannot read is treated as expired - failing closed is right here.
 */
export const isTokenExpired = (token) => {
  if (!token) return true;

  try {
    const raw = String(token).replace(/^JWT\s+/i, "");
    // JWTs are base64url; atob only understands standard base64.
    const encoded = raw.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(encoded));

    if (!payload?.exp) return false;
    return payload.exp * 1000 <= Date.now();
  } catch (error) {
    console.log("Could not read the token expiry:", error);
    return true;
  }
};

/**
 * WhatsApp text for chasing a party's outstanding balance. Needs only the
 * balance, so it works for users without accounting access.
 */
export const partyReminderText = (name, balance) =>
  encodeURIComponent(
    `Hello ${name || ""}, your outstanding balance is PKR ${Number(balance || 0).toLocaleString()}. ` +
    `Kindly arrange the payment at your earliest. Thank you.`
  );

/**
 * WhatsApp text for a full statement. Built from ledger rows, so it is only
 * ever offered to users who can see the ledger.
 */
export const partyStatementText = (name, ledger) => {
  const lines = (ledger?.rows || []).map(
    (row) =>
      `${formatDate(row.date)}  ${row.description}  ` +
      `${row.naam ? `Debit ${row.naam}` : `Credit ${row.jama}`}  Balance ${row.balance}`
  );
  return encodeURIComponent(
    `Statement - ${name || ""}\n\n${lines.join("\n")}\n\n` +
    `Outstanding: PKR ${Number(ledger?.closing_balance || 0).toLocaleString()}`
  );
};

export const PaymentMethodMap = {
  cash: "Cash",
  wallet: "Wallet",
  bank_transfer: "Bank Transfer",
  cheque: "Cheque",
};

// A payment's method follows the account the money moves through.
export const AccountTypePaymentMethodMap = {
  cash: "cash",
  wallet: "wallet",
  bank: "bank_transfer",
};

export const ExpenseCategoryMap = {
  kiraya: "Rent",
  bijli: "Electricity",
  tankhwa: "Salaries",
  transport: "Transport",
  mutafarriq: "Miscellaneous",
};

export const getTransactionStatusColor = (status) => {
  switch (status) {
    case "C":
      return "bg-green-100 text-green-700";
    case "PEN":
      return "bg-yellow-100 text-yellow-700";
    case "B":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

export const getDirectionColor = (direction) => {
  switch (direction) {
    case "in":
      return "bg-green-100 text-green-700";
    case "out":
      return "bg-red-100 text-red-700";
    default:
      return "bg-blue-100 text-blue-700";
  }
};

export function transformTransaction(data) {
  return {
    id: data.id,
    date: formatDate(data.date),
    type: data.type,
    account: data.account_name,
    amount: data.amount,
    payment_method: PaymentMethodMap[data.payment_method] || data.payment_method,
    status: data.status,
  }
}

export function transformMoneyAccount(data) {
  return {
    id: data.id,
    name: data.name,
    type: AccountTypeMap[data.type] || data.type,
    opening_balance: data.opening_balance,
    balance: data.balance,
    is_active: data.is_active,
  }
}

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

export const getImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${BASE_URL}${url}`;
}