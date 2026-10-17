import { useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RowAction } from "./InvoiceItemsTable";
import { InvoiceSection } from "./InvoiceScreen";

export type ExtraCharge = { label: string; amount: string | number };

// S.no as in the items table, then the name, then the amount at the right.
const GRID = "grid grid-cols-[40px_minmax(0,1fr)_112px] items-center gap-4 w-full";

interface ExtraChargesEditorProps {
  charges: ExtraCharge[];
  onChange: (charges: ExtraCharge[]) => void;
}

/**
 * Delivery, labour, a cutting fee - built the way product variants are on
 * CreateProduct: type the charge, add it, and it joins the table below as a
 * numbered row.
 *
 * A charge is checked as it is added, so the list only ever holds rows the
 * API will accept. normaliseExtraCharges still runs on submit, because an
 * update screen loads charges it did not add itself.
 */
export function ExtraChargesEditor({ charges, onChange }: ExtraChargesEditorProps) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");

  const addCharge = () => {
    const name = label.trim();
    const value = parseFloat(amount);
    if (!name) {
      toast.error("Give the charge a name.");
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Enter an amount above zero.");
      return;
    }
    onChange([...(charges || []), { label: name, amount: Math.round(value * 100) / 100 }]);
    setLabel("");
    setAmount("");
  };

  // Enter adds the charge. Left alone it would submit the whole invoice.
  const addOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addCharge();
  };

  const removeCharge = (index: number) =>
    onChange((charges || []).filter((_, position) => position !== index));

  const list = charges || [];

  // The heading, the add row and the table header stay pinned at the top of
  // the column while the rows scroll under them - the items table beside it
  // does the same, so the two headers stay level.
  return (
    <InvoiceSection
      title="Extra Charges"
      first
      pinned={
        <>
          {/* The charge, its amount and the button on one row. */}
          <div className="flex gap-2 items-end">
            <div className="flex-1 min-w-0 space-y-1">
              <Label htmlFor="charge_label">Charge</Label>
              <Input
                id="charge_label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onKeyDown={addOnEnter}
                placeholder="Delivery"
              />
            </div>
            <div className="w-24 shrink-0 space-y-1">
              <Label htmlFor="charge_amount">Amount</Label>
              <Input
                id="charge_amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={addOnEnter}
                placeholder="0"
              />
            </div>
            <Button type="button" className="shrink-0" onClick={addCharge}>
              <Plus className="h-4 w-4 mr-2" />
              Add Charge
            </Button>
          </div>

          {/* The same table as the items beside it: a header card, then a
              card per row on the same column grid, the delete icon outside. */}
          <div className="flex items-center gap-2">
            <div className="bg-card rounded-lg border h-[35px] flex flex-1 min-w-0 items-center px-4">
              <div className={`${GRID} text-sm font-medium text-muted-foreground`}>
                <div>S.no</div>
                <div>Charge</div>
                <div className="text-right">Amount</div>
              </div>
            </div>
            <div className="w-5 shrink-0" />
          </div>
        </>
      }
    >
      <div className="space-y-[10px]">
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No charges yet.</p>
        ) : (
          list.map((charge, index) => (
            <div key={`${charge.label}-${index}`} className="flex items-center gap-2">
              <div className="bg-card rounded-lg border border-border h-[35px] flex flex-1 min-w-0 items-center px-4">
                <div className={`${GRID} text-sm`}>
                  <div>{index + 1}</div>
                  {/* title: the full name, since a narrow column truncates it */}
                  <div className="min-w-0 truncate font-medium" title={charge.label}>{charge.label}</div>
                  <div className="text-right font-semibold tabular-nums truncate">
                    PKR {Number(charge.amount || 0).toLocaleString()}
                  </div>
                </div>
              </div>
              <RowAction label={`Remove ${charge.label}`} onClick={() => removeCharge(index)}>
                <Trash2 className="h-5 w-5" />
              </RowAction>
            </div>
          ))
        )}
      </div>
    </InvoiceSection>
  );
}
