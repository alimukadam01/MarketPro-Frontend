import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PeriodSwitch } from "@/components/ui/period-switch";

/**
 * "Asked on invoices" on the product form (plans/product-extra-fields.md).
 *
 * The business's extra fields - Urban Paints' "Colour code" - are made in
 * Django admin. Here the shop ticks the ones this product's invoice lines ask
 * for, on sales, purchases or both, and whether each is required.
 *
 * Renders nothing when the business has no extra fields, so the form is
 * unchanged for every other shop.
 */

export type ProductFieldOption = { id: number; label: string; field_type: string; is_active?: boolean };
export type FieldLink = { field: number; applies_to: "sale" | "purchase" | "both"; required: boolean };

const SIDES = [
  { key: "sale", label: "Sales" },
  { key: "purchase", label: "Purchases" },
  { key: "both", label: "Both" },
];

export function ProductFieldLinks({
  fields, value, onChange,
}: {
  fields: ProductFieldOption[];
  value: FieldLink[];
  onChange: (links: FieldLink[]) => void;
}) {
  if (!fields?.length) return null;

  const linkOf = (id: number) => value.find((link) => link.field === id);
  const set = (id: number, change: Partial<FieldLink> | null) => {
    if (change === null) {
      onChange(value.filter((link) => link.field !== id));
      return;
    }
    const existing = linkOf(id);
    onChange(existing
      ? value.map((link) => (link.field === id ? { ...link, ...change } : link))
      : [...value, { field: id, applies_to: "sale", required: false, ...change }]);
  };

  return (
    <div className="mb-6 space-y-2">
      <div>
        <Label className="font-semibold">Asked on invoices</Label>
        <p className="text-xs text-muted-foreground">
          Details typed on each invoice line of this product, such as a colour code. They do not change its stock.
        </p>
      </div>
      <div className="space-y-2">
        {fields.map((field) => {
          const link = linkOf(field.id);
          return (
            <div key={field.id} className="flex flex-wrap items-center gap-3 min-h-8">
              <label className="flex items-center gap-2 w-44 cursor-pointer">
                <Checkbox
                  checked={!!link}
                  onCheckedChange={(checked) => set(field.id, checked ? {} : null)}
                />
                <span className="text-sm font-medium truncate" title={field.label}>{field.label}</span>
                <span className="text-xs text-muted-foreground">
                  {field.field_type === "number" ? "number" : "text"}
                  {field.is_active === false ? " · retired" : ""}
                </span>
              </label>
              {link && (
                <>
                  <span className="text-xs text-muted-foreground">Ask on</span>
                  <PeriodSwitch
                    size="card"
                    label={`Where ${field.label} is asked`}
                    options={SIDES}
                    value={{ key: link.applies_to }}
                    onChange={(choice) => set(field.id, { applies_to: choice.key as FieldLink["applies_to"] })}
                  />
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={link.required}
                      onCheckedChange={(checked) => set(field.id, { required: !!checked })}
                    />
                    Required
                  </label>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
