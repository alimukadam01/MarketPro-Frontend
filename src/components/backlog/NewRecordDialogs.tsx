import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Plus, RefreshCcw, RotateCcw, Trash2, X } from "lucide-react";
import * as DialogUI from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import { Spinner } from "@/components/ui/spinner";
import { SearchField } from "@/components/ui/search-field";
import { RowAction } from "@/components/invoice/InvoiceItemsTable";
import { LookupCombobox, type LookupItem } from "./LookupCombobox";

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

// -- A product, from a stock page ---------------------------------------------

// With an id it is one the product already has; without, a new one.
type Variant = { id?: number; attributes: Record<string, string> };

const variantLabel = (variant: Variant) => Object.values(variant.attributes).join(" / ") || "default";

/**
 * A product a stock page counts that MarketPro does not have, in two steps:
 *
 *  1. the product - name, unit, description;
 *  2. its variants, built as on Create Product: pick attributes, type their
 *     values, Create Variant; click a variant to load it back and Update
 *     it, reset to start over. Only the variant list scrolls.
 *
 * No stock step: the page is the count, so the stock line entered after
 * this makes the variant's stock row (backlog/new_products.py). Only a
 * stock page offers this - an invoice never creates a product.
 *
 * A product that exists (loadExisting) opens on step 2 to add variants to
 * it: its details and its own variants are shown, not changed.
 */
export function NewProductDialog({
  open,
  setOpen,
  initialName,
  create,
  loadExisting,
  onCreated,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  initialName: string;
  /** A new product: { name, unit, desc, variants }. New variants: { variants }. */
  create: CreateRecord;
  /** Adding variants to a product the typed name matched: its details and variants. */
  loadExisting?: () => Promise<{ ok: boolean; data: any; error: string | null }>; // eslint-disable-line @typescript-eslint/no-explicit-any
  /** The new product's variants (or the variants just added), first to last. */
  onCreated: (variants: { id: number; label: string }[]) => void;
}) {
  const extending = !!loadExisting;
  const [existingName, setExistingName] = useState("");
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<Picked>(null);
  const [desc, setDesc] = useState("");
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  const [variants, setVariants] = useState<Variant[]>([]);
  // The variant loaded back into the configuration for updating, by position.
  const [selected, setSelected] = useState<number | null>(null);
  const [variantSearch, setVariantSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    // Adding variants goes straight to them.
    setStep(loadExisting ? 2 : 1);
    setName(initialName);
    setUnit(null);
    setDesc("");
    setAttributes({});
    setVariants([]);
    setSelected(null);
    setVariantSearch("");
    setExistingName("");
    if (!loadExisting) return;
    const fetchExisting = async () => {
      setLoadingExisting(true);
      try {
        const res = await loadExisting();
        if (!res.ok) {
          if (res.error) toast.error(res.error);
          setOpen(false);
          return;
        }
        const product = res.data;
        setExistingName(product.name);
        setName(product.name);
        setUnit(product.unit ? { id: product.unit.id, label: product.unit.label } : null);
        setDesc(product.desc || "");
        setVariants(product.variants.map((v) => ({ id: v.id, attributes: v.attributes || {} })));
      } catch (error) {
        console.log("Error loading the product:", error);
        toast.error("Failed to load the product.");
      } finally {
        setLoadingExisting(false);
      }
    };
    fetchExisting();
    // On opening only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const attributeCount = Object.keys(attributes).length;
  const variantReady = attributeCount > 0
    && Object.values(attributes).every((value) => String(value ?? "").trim() !== "");
  const newVariants = variants.filter((variant) => !variant.id);

  const addAttribute = (item: LookupItem | null) => {
    if (!item || attributeCount >= 3) return;
    setAttributes((prev) => ({ ...prev, [item.label]: prev[item.label] ?? "" }));
  };

  // Keeps the attribute names and wipes their values, so the next variant is
  // typed without picking the attributes again - as on Create Product.
  const clearAttributeValues = () =>
    setAttributes((prev) => Object.fromEntries(Object.keys(prev).map((key) => [key, ""])));

  const deselect = () => {
    setSelected(null);
    clearAttributeValues();
  };

  const createOrUpdateVariant = () => {
    if (selected !== null) {
      // Replaced in place, so an updated variant keeps its number.
      setVariants((prev) => prev.map((variant, i) => (i === selected ? { ...variant, attributes: { ...attributes } } : variant)));
      deselect();
      return;
    }
    setVariants((prev) => [...prev, { attributes: { ...attributes } }]);
    clearAttributeValues();
  };

  // A variant the product already has is shown, not changed.
  const pickVariant = (index: number) => {
    if (variants[index]?.id) return;
    setSelected(index);
    setAttributes({ ...variants[index].attributes });
  };

  const deleteVariant = (index: number) => {
    if (variants[index]?.id) return;
    if (selected === index) deselect();
    else if (selected !== null && selected > index) setSelected(selected - 1);
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  // The original position travels with each variant, so the number shown and
  // the one picked or deleted still match while the list is filtered.
  const visibleVariants = variants
    .map((variant, index) => ({ variant, index }))
    .filter(({ variant }) => {
      const query = variantSearch.trim().toLowerCase();
      return !query || variantLabel(variant).toLowerCase().includes(query);
    });

  const detailsReady = () => {
    if (!name.trim()) {
      toast.error("Enter the product's name.");
      return false;
    }
    if (!unit) {
      toast.error("Pick the unit.");
      return false;
    }
    return true;
  };

  const toVariants = () => {
    if (detailsReady()) setStep(2);
  };

  const save = async () => {
    if (!extending && !detailsReady()) return;
    if (selected !== null) {
      toast.error("Update the variant you are editing first, or press Esc.");
      return;
    }
    if (attributeCount > 0 && variantReady) {
      toast.error("Create the variant you are typing first, or reset it.");
      return;
    }
    if (extending && newVariants.length === 0) {
      toast.error("Create the new variant first.");
      return;
    }
    setSaving(true);
    try {
      const res = await create(extending
        ? { variants: newVariants.map((variant) => ({ attributes: variant.attributes })) }
        : {
          name: name.trim(),
          unit: Number(unit.id),
          desc,
          variants: variants.map((variant) => ({ attributes: variant.attributes })),
        });
      if (!res.ok) {
        if (res.error) toast.error(res.error);
        return;
      }
      const made = res.data.variants;
      const several = made.length > 1 ? " Pick the one on the page." : "";
      toast.success(extending
        ? `${made.length} variant${made.length > 1 ? "s" : ""} added to "${res.data.product.label}".${several}`
        : `"${res.data.product.label}" added${made.length > 1 ? ` with ${made.length} variants` : ""}.${several}`);
      onCreated(made);
      setOpen(false);
    } catch (error) {
      console.log("Error creating the product:", error);
      toast.error(extending ? "Failed to add the variants." : "Failed to add the product.");
    } finally {
      setSaving(false);
    }
  };

  const stepTabs = (
    <div className="flex items-center gap-2 text-sm">
      {[{ n: 1, label: "Product" }, { n: 2, label: "Variants" }].map(({ n, label }, i) => (
        <span key={n} className="flex items-center gap-2">
          {i > 0 && <span className="w-6 h-px bg-border" />}
          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${step === n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{n}</span>
          <span className={step === n ? "font-medium" : "text-muted-foreground"}>{label}</span>
        </span>
      ))}
    </div>
  );

  return (
    <DialogUI.Dialog open={open} onOpenChange={setOpen}>
      <DialogUI.DialogContent
        className="max-w-2xl max-h-[90vh] flex flex-col"
        // Esc first lets go of a variant being edited, as on Create Product;
        // only with nothing selected does it close the dialog.
        onEscapeKeyDown={(event) => {
          if (step === 2 && selected !== null) {
            event.preventDefault();
            deselect();
          }
        }}
      >
        <DialogUI.DialogHeader className="shrink-0 space-y-3">
          <DialogUI.DialogTitle>
            {extending ? `Add variants to "${existingName || initialName}"` : "New product"}
            {loadingExisting && <span className="inline-block ml-2 align-middle"><Spinner size={16} /></span>}
          </DialogUI.DialogTitle>
          {stepTabs}
          <DialogUI.DialogDescription>
            {step === 1
              ? extending
                ? "Already in MarketPro: its details are shown here, not changed."
                : "Name, unit and description, as on Create Product."
              : extending
                ? "Add the variants the page counts that it does not have. Its own variants are not changed here."
                : "Variants are optional: without any, the product has one. Its stock is the line you enter next."}
          </DialogUI.DialogDescription>
        </DialogUI.DialogHeader>

        {step === 1 ? (
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar -mx-1 px-1 py-1 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="new_product_name">Name</Label>
                <Input id="new_product_name" value={name} onChange={(e) => setName(e.target.value)}
                  disabled={extending} autoFocus={!extending} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new_product_unit">Unit</Label>
                <LookupCombobox
                  id="new_product_unit"
                  kind="units"
                  value={unit?.id ?? ""}
                  selectedLabel={unit?.label}
                  onChange={(item) => setUnit(item ? { id: item.id, label: item.label } : null)}
                  disabled={extending}
                  placeholder="Select Unit"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="new_product_desc">Description (optional)</Label>
              <Textarea id="new_product_desc" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)}
                disabled={extending} />
            </div>
          </div>
        ) : (
          // The variant controls stay put; only the list below them scrolls.
          <div className="flex-1 min-h-0 flex flex-col gap-4">
            <div className="shrink-0 space-y-4">
              <h3 className="text-base font-semibold">
                {extending ? `Variants of "${existingName || name}"` : "Add Product Variants (Optional)"}
              </h3>
              {attributeCount > 0 && (
                <div className="space-y-1">
                  <Label className="font-semibold">Variant Configuration</Label>
                  <div className="flex flex-col gap-2">
                    {Object.entries(attributes).map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <Input value={key} disabled className="w-1/2 bg-muted disabled:opacity-100 disabled:text-foreground" />
                        <Input
                          value={value}
                          className="w-1/2"
                          onChange={(e) => setAttributes((prev) => ({ ...prev, [key]: e.target.value }))}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="shrink-0"
                          aria-label={`Remove ${key}`}
                          onClick={() => setAttributes((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => k !== key)))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Pick, build and reset on one row, as on Create Product. */}
              <div className="flex gap-2 items-end">
                <div className="w-1/2 space-y-1">
                  <Label htmlFor="new_product_attr">Add Attribute</Label>
                  <LookupCombobox
                    id="new_product_attr"
                    kind="attributes"
                    value=""
                    onChange={addAttribute}
                    disabled={attributeCount >= 3}
                    placeholder={attributeCount >= 3 ? "Max. 3 attributes allowed" : "Select Attribute"}
                  />
                </div>
                <Button type="button" className="flex-1" disabled={!variantReady} onClick={createOrUpdateVariant}>
                  {selected !== null
                    ? <><RefreshCcw className="h-4 w-4 mr-2" />Update Variant</>
                    : <><Plus className="h-4 w-4 mr-2" />Create Variant</>}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  aria-label="Reset the variant"
                  onClick={() => { setSelected(null); setAttributes({}); }}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
              {variants.length > 0 && (
                <SearchField
                  id="new_product_variant_search"
                  placeholder="Search variants"
                  value={variantSearch}
                  onChange={setVariantSearch}
                  className="w-full"
                  wrapperClassName="w-full"
                />
              )}
              {selected !== null && (
                <p className="text-xs text-muted-foreground -mt-2">
                  Editing variant {selected + 1}. Esc lets go of it.
                </p>
              )}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar -mx-1 px-1 py-1">
              <div className="flex flex-col gap-[2px]">
                {visibleVariants.map(({ variant, index }) => (
                  <div key={index} className="flex gap-2 items-center">
                    <div
                      onClick={() => pickVariant(index)}
                      className={`flex-1 bg-card rounded-lg min-h-[35px] py-0.5 flex items-center px-4 gap-4 text-sm ${variant.id ? "" : "cursor-pointer"} ${selected === index ? "border-2 border-[#4285F4]" : "border border-border"}`}
                    >
                      <span>{index + 1}.</span>
                      <span className="flex-1">{variantLabel(variant)}</span>
                      {variant.id && <span className="text-xs text-muted-foreground">In MarketPro</span>}
                    </div>
                    <RowAction
                      label={variant.id ? "Already in MarketPro - change it on Products" : "Delete variant"}
                      disabled={!!variant.id}
                      onClick={() => deleteVariant(index)}
                    >
                      <Trash2 className="h-5 w-5" />
                    </RowAction>
                  </div>
                ))}
                {variants.length > 0 && visibleVariants.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-3">No variant matches that.</p>
                )}
              </div>
            </div>
          </div>
        )}

        <DialogUI.DialogFooter className="shrink-0">
          {step === 1 ? (
            <>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="button" onClick={toVariants} disabled={loadingExisting}>
                Next: variants
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                {extending ? "Product details" : "Back"}
              </Button>
              <SubmitButton type="button" pending={saving} pendingLabel="Adding…" onClick={save}
                disabled={loadingExisting}>
                {extending ? "Add variants" : "Add product"}
              </SubmitButton>
            </>
          )}
        </DialogUI.DialogFooter>
      </DialogUI.DialogContent>
    </DialogUI.Dialog>
  );
}
