import { useNavigate } from "react-router-dom";
import { Package, Truck, UserPlus } from "lucide-react";
import type { NewRecord, OwnerEntry } from "./meta";

const KINDS = {
  customer: { label: "Customer", icon: UserPlus, path: "/customers/view-customer", stateKey: "customer_id" },
  supplier: { label: "Supplier", icon: Truck, path: "/suppliers/view-supplier", stateKey: "supplier_id" },
  product: { label: "Product", icon: Package, path: "/products/update-product", stateKey: "product_id" },
  // A variant opens its product.
  variant: { label: "Variant", icon: Package, path: "/products/update-product", stateKey: "product_id" },
};

// PartyOpeningBalance's sign: positive means the customer owes the shop, or
// the shop owes the supplier.
const balanceText = (row: NewRecord) => {
  const amount = row.opening_balance;
  if (!amount) return null;
  const owesShop = row.kind === "customer" ? amount > 0 : amount < 0;
  return `${owesShop ? "owes the shop" : "shop owes them"} PKR ${Math.abs(amount).toLocaleString()}`;
};

/**
 * For the owner reviewing a page: the customers, suppliers, products and
 * variants the
 * entry person added to MarketPro because the page named them and they were
 * not there - with the balance a party came with - so a new name can be
 * checked before the page is approved. Each opens its own page.
 */
export function NewRecordsNote({ review }: { review?: OwnerEntry | null }) {
  const navigate = useNavigate();
  const rows = review?.new_records || [];
  if (rows.length === 0) return null;

  // One wrapping line rather than a list: it sits above the invoice's
  // fields, and every line it takes comes out of the items list below.
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
      <span className="font-semibold">Added to MarketPro from this page:</span>
      {rows.map((row) => {
        const kind = KINDS[row.kind];
        const Icon = kind.icon;
        const extra = [row.detail, balanceText(row)].filter(Boolean).join(" · ");
        return (
          <span key={row.id} className="inline-flex items-center gap-1.5 min-w-0" title={kind.label}>
            <Icon className="h-4 w-4 shrink-0" aria-label={kind.label} />
            <button
              type="button"
              className="font-medium underline-offset-2 hover:underline"
              onClick={() => navigate(kind.path, { state: { [kind.stateKey]: row.record_id } })}
            >
              {row.label}
            </button>
            {extra && <span className="text-blue-800/80">({extra})</span>}
          </span>
        );
      })}
    </div>
  );
}

export default NewRecordsNote;
