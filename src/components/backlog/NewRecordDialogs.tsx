import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import * as DialogUI from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { LookupCombobox } from "./LookupCombobox";

/**
 * How a dialog saves: the page decides - a backlog page through its work
 * endpoints (tied to the page), an invoice create screen through the
 * standard ones. Answers as backlogCall does: { ok, data, error }.
 */
export type CreateRecord = (data: Record<string, unknown>) => Promise<{ ok: boolean; data: any; error: string | null }>; // eslint-disable-line @typescript-eslint/no-explicit-any
import { todayForInput } from "../../../services/utils";

type Picked = { id: number | string; label: string } | null;

function Segmented({ options, value, onChange }: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="inline-flex rounded-md bg-muted p-1 gap-1" role="group">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`h-8 px-3 rounded text-sm font-medium whitespace-nowrap ${value === option.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// -- A customer or a supplier ------------------------------------------------

const DIRECTIONS = {
  // PartyOpeningBalance: positive means the customer owes the shop, or the
  // shop owes the supplier.
  customer: [
    { value: "owes_shop", label: "Owes the shop", sign: 1 },
    { value: "shop_owes", label: "Shop owes them", sign: -1 },
  ],
  supplier: [
    { value: "shop_owes", label: "Shop owes them", sign: 1 },
    { value: "owes_shop", label: "Owes the shop", sign: -1 },
  ],
};

/**
 * A customer or supplier the bill names that MarketPro does not have. Added
 * for the whole shop and picked on the bill straight away. On the invoice
 * screens, what they owed - or were owed - before this bill can come with
 * them, as the opening balance of their khaata; a backlog page does not ask
 * (withBalance false): a money figure typed from an old bill is a guess.
 */
export function NewPartyDialog({
  open,
  setOpen,
  kind,
  initialName,
  create,
  asOf,
  withBalance = true,
  onCreated,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  kind: "customer" | "supplier";
  initialName: string;
  create: CreateRecord;
  /** The day the opening balance stands at: the bill's date, if it has one. */
  asOf?: string;
  withBalance?: boolean;
  onCreated: (item: { id: number; label: string }) => void;
}) {
  const isCustomer = kind === "customer";
  const directions = DIRECTIONS[kind];
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState<Picked>(null);
  const [balance, setBalance] = useState("");
  const [direction, setDirection] = useState(directions[0].value);
  const [asOfDate, setAsOfDate] = useState(todayForInput());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initialName);
    setPhone("");
    setAddress("");
    setBusinessName("");
    setCity(null);
    setBalance("");
    setDirection(directions[0].value);
    setAsOfDate(asOf || todayForInput());
    // On opening only: what the user types afterwards stays.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!name.trim()) {
      toast.error(`Enter the ${kind}'s name.`);
      return;
    }
    if (isCustomer && !city) {
      toast.error("Pick the customer's city.");
      return;
    }
    const amount = withBalance ? Math.round(parseFloat(balance) || 0) : 0;
    if (amount < 0) {
      toast.error("Enter the balance without a sign, and pick who owes whom.");
      return;
    }
    if (amount && !asOfDate) {
      toast.error("Enter the date the balance stood at.");
      return;
    }
    const sign = directions.find((d) => d.value === direction)?.sign ?? 1;
    const opening_balance = amount ? { amount: amount * sign, as_of_date: asOfDate } : null;

    setSaving(true);
    try {
      const res = isCustomer
        ? await create({ name: name.trim(), phone, address, city: Number(city.id), opening_balance })
        : await create({ name: name.trim(), phone, business_name: businessName, opening_balance });
      if (!res.ok) {
        if (res.error) toast.error(res.error);
        return;
      }
      toast.success(`${isCustomer ? "Customer" : "Supplier"} "${res.data.label}" added.`);
      onCreated(res.data);
      setOpen(false);
    } catch (error) {
      console.log(`Error creating the ${kind}:`, error);
      toast.error(`Failed to add the ${kind}.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogUI.Dialog open={open} onOpenChange={setOpen}>
      <DialogUI.DialogContent className="max-w-lg">
        <form onSubmit={submit} className="space-y-5">
          <DialogUI.DialogHeader>
            <DialogUI.DialogTitle>New {kind}</DialogUI.DialogTitle>
            <DialogUI.DialogDescription>
              Added to MarketPro for the whole shop, and picked on this bill.
            </DialogUI.DialogDescription>
          </DialogUI.DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="party_name">Name</Label>
              <Input id="party_name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </div>
            <div className="space-y-1">
              <Label htmlFor="party_phone">Phone (optional)</Label>
              <Input id="party_phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            {isCustomer ? (
              <>
                <div className="space-y-1">
                  <Label htmlFor="party_city">City</Label>
                  <LookupCombobox
                    id="party_city"
                    kind="cities"
                    value={city?.id ?? ""}
                    selectedLabel={city?.label}
                    onChange={(item) => setCity(item ? { id: item.id, label: item.label } : null)}
                    placeholder="Select city"
                    notFoundText="No city matches that."
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="party_address">Address (optional)</Label>
                  <Input id="party_address" value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
              </>
            ) : (
              <div className="space-y-1 col-span-2">
                <Label htmlFor="party_business">Business name (optional)</Label>
                <Input id="party_business" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
              </div>
            )}
          </div>

          {withBalance && <div className="space-y-3 rounded-lg border p-4">
            <div>
              <Label>Outstanding balance (optional)</Label>
              <p className="text-xs text-muted-foreground">
                What their khaata showed before this bill, if the book says. Leave it empty if nothing was owed.
              </p>
            </div>
            <Segmented options={directions} value={direction} onChange={setDirection} />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="party_balance">Amount (PKR)</Label>
                <Input id="party_balance" type="number" min="0" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="party_as_of">As of</Label>
                <Input id="party_as_of" type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} />
              </div>
            </div>
          </div>}

          <DialogUI.DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <SubmitButton type="submit" pending={saving} pendingLabel="Adding…">Add {kind}</SubmitButton>
          </DialogUI.DialogFooter>
        </form>
      </DialogUI.DialogContent>
    </DialogUI.Dialog>
  );
}
