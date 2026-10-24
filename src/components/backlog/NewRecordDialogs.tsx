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
import { useAuth } from "../../../services/AuthProvider";
import { workLookup } from "../../../services/api";

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
 * for the whole shop and picked on the bill straight away. What they owed -
 * or were owed - before this bill can come with them, as the opening balance
 * of their khaata.
 */
export function NewPartyDialog({
  open,
  setOpen,
  kind,
  initialName,
  create,
  asOf,
  onCreated,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  kind: "customer" | "supplier";
  initialName: string;
  create: CreateRecord;
  /** The day the opening balance stands at: the bill's date, if it has one. */
  asOf?: string;
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
    const amount = Math.round(parseFloat(balance) || 0);
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

          <div className="space-y-3 rounded-lg border p-4">
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
          </div>

          <DialogUI.DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <SubmitButton type="submit" pending={saving} pendingLabel="Adding…">Add {kind}</SubmitButton>
          </DialogUI.DialogFooter>
        </form>
      </DialogUI.DialogContent>
    </DialogUI.Dialog>
  );
}

// -- A product, then its stock -----------------------------------------------

// With an id it is one the product already has (adding variants to an
// existing product); without, a new one.
type Variant = { id?: number; attributes: Record<string, string> };
type StockRow = { location: Picked; quantity: string; unitPrice: string; unitCost: string };

const variantLabel = (variant: Variant) => Object.values(variant.attributes).join(" / ") || "default";
const emptyRow = (location: Picked): StockRow => ({ location, quantity: "", unitPrice: "", unitCost: "" });

/**
 * A product the page names that MarketPro does not have, in two steps:
 *
 *  1. the product - name, unit, description and its variants, built as on
 *     Create Product: pick attributes, type their values, Create Variant;
 *     click a variant to load it back and Update it, reset to start over.
 *     Only the variant list scrolls; the form above it stays put.
 *  2. its stock - a row for each variant, because a product goes on a bill
 *     from its stock row: where it is kept, and, if the page says, how many,
 *     the price and the cost.
 *
 * Nothing is saved until the second step: the product and its rows are
 * created together, so a product never exists without them.
 */
export function NewProductDialog({
  open,
  setOpen,
  initialName,
  create,
  loadExisting,
  requireQuantity = false,
  onCreated,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  initialName: string;
  create: CreateRecord;
  /**
   * Adding variants to a product the typed name matched: loads its details
   * and variants into the dialog. Every change in the dialog applies to it -
   * details, variants updated, new ones added with their stock; none of its
   * variants can be deleted here (they may be on invoices).
   */
  loadExisting?: () => Promise<{ ok: boolean; data: any; error: string | null }>; // eslint-disable-line @typescript-eslint/no-explicit-any
  /**
   * New Sales Invoice lists only products in stock, so a product created
   * there needs a quantity to go on the bill.
   */
  requireQuantity?: boolean;
  /** The new product's variants (or the variants just added), first to last. */
  onCreated: (variants: { id: number; label: string }[]) => void;
}) {
  const { token } = useAuth();
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
  const [rows, setRows] = useState<StockRow[]>([]);
  const [defaultLocation, setDefaultLocation] = useState<Picked>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setName(initialName);
    setUnit(null);
    setDesc("");
    setAttributes({});
    setVariants([]);
    setSelected(null);
    setVariantSearch("");
    setRows([]);
    setExistingName("");
    if (loadExisting) {
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
    }
    const fetchDefault = async () => {
      try {
        const found = await workLookup(token, "locations", "");
        const preferred = found.find((row) => row.is_default) || found[0];
        setDefaultLocation(preferred ? { id: preferred.id, label: preferred.label } : null);
      } catch (error) {
        console.log("Error looking up locations:", error);
      }
    };
    fetchDefault();
    // On opening only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const attributeCount = Object.keys(attributes).length;
  const variantReady = attributeCount > 0
    && Object.values(attributes).every((value) => String(value ?? "").trim() !== "");

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

  const pickVariant = (index: number) => {
    setSelected(index);
    setAttributes({ ...variants[index].attributes });
  };

  // The variants that get a stock row: all of them for a new product (one
  // row for a product without variants), only the new ones when adding to
  // an existing product - its own already have rows.
  const stockTargets = extending ? variants.filter((variant) => !variant.id) : variants;

  const deleteVariant = (index: number) => {
    if (variants[index]?.id) return;   // an existing variant stays (see loadExisting)
    // The stock rows follow the stock targets by position.
    const rowIndex = stockTargets.indexOf(variants[index]);
    if (selected === index) deselect();
    else if (selected !== null && selected > index) setSelected(selected - 1);
    setVariants((prev) => prev.filter((_, i) => i !== index));
    if (rowIndex >= 0) setRows((prev) => prev.filter((_, i) => i !== rowIndex));
  };

  // The original position travels with each variant, so the number shown and
  // the one picked or deleted still match while the list is filtered.
  const visibleVariants = variants
    .map((variant, index) => ({ variant, index }))
    .filter(({ variant }) => {
      const query = variantSearch.trim().toLowerCase();
      return !query || variantLabel(variant).toLowerCase().includes(query);
    });

  // One stock row per variant, or one for a product without variants. Rows
  // already filled in keep their values when the user comes back to step 1.
  const toStock = () => {
    if (!name.trim()) {
      toast.error("Enter the product's name.");
      return;
    }
    if (!unit) {
      toast.error("Pick the unit.");
      return;
    }
    if (selected !== null) {
      toast.error("Update the variant you are editing first, or press Esc.");
      return;
    }
    if (attributeCount > 0 && variantReady) {
      toast.error("Create the variant you are typing first, or reset it.");
      return;
    }
    if (extending && stockTargets.length === 0) {
      // Nothing new to stock: the changes to the product are saved as they are.
      addProduct([]);
      return;
    }
    const wanted = extending ? stockTargets.length : Math.max(variants.length, 1);
    setRows((prev) => Array.from({ length: wanted }, (_, i) => prev[i] ?? emptyRow(defaultLocation)));
    setStep(2);
  };

  const setRow = (index: number, change: Partial<StockRow>) =>
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...change } : row)));

  const number = (value: string, parse: (v: string) => number) =>
    value.trim() === "" ? null : parse(value);

  const addProduct = async (stockRows: StockRow[] = rows) => {
    setSaving(true);
    try {
      if (requireQuantity && stockRows.some((row) => !(parseInt(row.quantity, 10) > 0))) {
        toast.error("Enter the quantity in stock for each variant: only products in stock can go on a sale.");
        return;
      }
      const res = await create({
        name: name.trim(),
        unit: Number(unit.id),
        desc,
        variants: variants.map((variant) => (variant.id
          ? { id: variant.id, attributes: variant.attributes }
          : { attributes: variant.attributes })),
        stock: stockRows.map((row) => ({
          location: row.location ? Number(row.location.id) : null,
          quantity: number(row.quantity, (v) => parseInt(v, 10)),
          unit_price: number(row.unitPrice, parseFloat),
          unit_cost: number(row.unitCost, parseFloat),
        })),
      });
      if (!res.ok) {
        if (res.error) toast.error(res.error);
        return;
      }
      const made = res.data.variants;
      if (extending) {
        toast.success(made.length === 0
          ? `"${res.data.product.label}" saved.`
          : `${made.length} variant${made.length > 1 ? "s" : ""} added to "${res.data.product.label}".`
            + (made.length > 1 ? " Pick the one on the bill." : ""));
      } else {
        toast.success(made.length > 1
          ? `"${res.data.product.label}" added with ${made.length} variants. Pick the one on the bill.`
          : `"${res.data.product.label}" added.`);
      }
      onCreated(made);
      setOpen(false);
    } catch (error) {
      console.log("Error creating the product:", error);
      toast.error("Failed to add the product.");
    } finally {
      setSaving(false);
    }
  };

  const stepTabs = (
    <div className="flex items-center gap-2 text-sm">
      {[{ n: 1, label: "Product" }, { n: 2, label: "Stock" }].map(({ n, label }, i) => (
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
          if (step === 1 && selected !== null) {
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
                ? "Already in MarketPro. Add its new variants here - or correct its details and variants. Its variants are not deleted here."
                : "Name, unit and variants, as on Create Product."
              : extending
                ? "Each new variant gets a stock row, as a product goes on a bill from it. Fill in what the page says; the rest can stay empty."
                : "A product goes on a bill from its stock row, so each variant gets one. Fill in what the page says; the rest can stay empty."}
          </DialogUI.DialogDescription>
        </DialogUI.DialogHeader>

        {step === 1 ? (
          // The form stays put; only the variant list below it scrolls.
          <div className="flex-1 min-h-0 flex flex-col gap-4">
            <div className="shrink-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="new_product_name">Name</Label>
                  <Input id="new_product_name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="new_product_unit">Unit</Label>
                  <LookupCombobox
                    id="new_product_unit"
                    kind="units"
                    value={unit?.id ?? ""}
                    selectedLabel={unit?.label}
                    onChange={(item) => setUnit(item ? { id: item.id, label: item.label } : null)}
                    placeholder="Select Unit"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="new_product_desc">Description (optional)</Label>
                <Textarea id="new_product_desc" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} />
              </div>

              <h3 className="text-base font-semibold">Add Product Variants (Optional)</h3>
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
                      className={`flex-1 bg-card rounded-lg min-h-[35px] py-0.5 flex cursor-pointer items-center px-4 gap-4 text-sm ${selected === index ? "border-2 border-[#4285F4]" : "border border-border"}`}
                    >
                      <span>{index + 1}.</span>
                      <span className="flex-1">{variantLabel(variant)}</span>
                      {variant.id && <span className="text-xs text-muted-foreground">In MarketPro</span>}
                    </div>
                    <RowAction
                      label={variant.id ? "Already in MarketPro - delete it from Products" : "Delete variant"}
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
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar -mx-1 px-1 py-1 space-y-4">
            <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.3fr)_88px_100px_100px] gap-3 text-sm font-medium text-muted-foreground px-1">
              <div>Variant</div><div>Location</div><div>Quantity</div><div>Sale price</div><div>Cost</div>
            </div>
            {rows.map((row, index) => (
              <div key={index} className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.3fr)_88px_100px_100px] gap-3 items-center">
                <div className="text-sm font-medium truncate" title={stockTargets[index] ? variantLabel(stockTargets[index]) : name}>
                  {stockTargets[index] ? variantLabel(stockTargets[index]) : name}
                </div>
                <LookupCombobox
                  kind="locations"
                  value={row.location?.id ?? ""}
                  selectedLabel={row.location?.label}
                  onChange={(item) => setRow(index, { location: item ? { id: item.id, label: item.label } : null })}
                  placeholder="Location"
                />
                <Input type="number" min="0" aria-label="Quantity" value={row.quantity}
                  onChange={(e) => setRow(index, { quantity: e.target.value })} />
                <Input type="number" min="0" step="0.01" aria-label="Sale price" value={row.unitPrice}
                  onChange={(e) => setRow(index, { unitPrice: e.target.value })} />
                <Input type="number" min="0" step="0.01" aria-label="Cost" value={row.unitCost}
                  onChange={(e) => setRow(index, { unitCost: e.target.value })} />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Quantity is what is in stock now, counted today: sales and purchases dated on or before today will
              not change it again. Leave it empty if nobody has counted it.
            </p>
          </div>
        )}

        <DialogUI.DialogFooter className="shrink-0">
          {step === 1 ? (
            <>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              {extending && stockTargets.length === 0 ? (
                <SubmitButton type="button" pending={saving} pendingLabel="Saving…" onClick={toStock}
                  disabled={loadingExisting}>
                  Save
                </SubmitButton>
              ) : (
                <Button type="button" onClick={toStock} disabled={loadingExisting}>
                  Next: stock
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <SubmitButton type="button" pending={saving} pendingLabel="Adding…" onClick={() => addProduct()}>
                {extending ? "Add variants" : "Add product"}
              </SubmitButton>
            </>
          )}
        </DialogUI.DialogFooter>
      </DialogUI.DialogContent>
    </DialogUI.Dialog>
  );
}
