import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, RefreshCcwIcon, RotateCcwIcon, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchField } from "@/components/ui/search-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { RowAction } from "@/components/invoice/InvoiceItemsTable";
import { EntryShell } from "@/components/backlog/EntryShell";
import { PagePhoto } from "@/components/backlog/PagePhoto";
import { LookupCombobox, type LookupItem } from "@/components/backlog/LookupCombobox";
import { SentBackNote } from "@/components/backlog/SentBackNote";
import { NewRecordsNote } from "@/components/backlog/NewRecordsNote";
import { NewProductDialog } from "@/components/backlog/NewRecordDialogs";
import { useEntryFlow } from "@/components/backlog/useEntryFlow";
import type { OwnerEntry, WorkEntry } from "@/components/backlog/meta";
import { useAuth } from "../../../services/AuthProvider";
import {
  deleteWorkOutput,
  getWorkOutput,
  postWorkProduct,
  postWorkStockLine,
  updateWorkOutput,
  workLookup,
} from "../../../services/api";
import { formatDate, todayForInput } from "../../../services/utils";

type Picked = { id: number | string; label: string } | null;
type Variant = { id?: number; attributes: Record<string, string> };

const variantLabel = (variant: Variant) =>
  variant.attributes && Object.keys(variant.attributes).length > 0
    ? Object.values(variant.attributes).join(" / ")
    : "default";

// The entered table: MarketPro's DataTable cards, a delete beside each row.
function EnteredTable({
  columns,
  grid,
  rows,
  selectedId,
  onPick,
  onDelete,
}: {
  columns: string[];
  grid: string;
  rows: { id: number; cells: (string | number)[] }[];
  selectedId: number | null;
  onPick: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="space-y-[10px]">
      <div className="flex items-center gap-2">
        <div className="bg-card rounded-lg border h-[35px] flex flex-1 min-w-0 items-center px-4">
          <div className={`grid ${grid} gap-4 w-full text-sm font-medium text-muted-foreground`}>
            <div>S.no</div>
            {columns.map((column) => <div key={column} className="truncate">{column}</div>)}
          </div>
        </div>
        <div className="w-5 shrink-0" />
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Nothing entered from this page yet.</p>
      ) : rows.map((row, index) => (
        <div key={row.id} className="flex items-center gap-2">
          <div
            onClick={() => onPick(row.id)}
            className={`bg-card rounded-lg h-[35px] flex flex-1 min-w-0 items-center px-4 cursor-pointer ${row.id === selectedId ? "border-2 border-[#4285F4]" : "border border-border"}`}
          >
            <div className={`grid ${grid} gap-4 w-full text-sm`}>
              <div>{index + 1}</div>
              {row.cells.map((cell, i) => (
                <div key={i} className={`min-w-0 truncate ${i === 0 ? "font-medium" : ""}`} title={String(cell)}>{cell}</div>
              ))}
            </div>
          </div>
          <RowAction label="Delete" onClick={() => onDelete(row.id)}>
            <Trash2 className="h-5 w-5" />
          </RowAction>
        </div>
      ))}
    </div>
  );
}

/**
 * A product, stock or price list page. Each line is saved as it is entered,
 * so the page can be left and picked up again; "Mark page complete" hands it
 * to the owner.
 *
 * Three equal columns: the photo, the form, and what has been entered from
 * the page. Clicking an entered row loads it into the form to correct it;
 * Esc clears the form.
 */
export default function BacklogListEntry({
  entry,
  mode,
  review,
  reload,
}: {
  entry: WorkEntry;
  mode: "entry" | "review";
  review?: OwnerEntry | null;
  reload: () => Promise<void>;
}) {
  const { token } = useAuth();
  const kind = entry.type;
  const outputs = useMemo(() => entry.outputs || [], [entry.outputs]);
  const flow = useEntryFlow({ entry, mode, review, hasOutputs: outputs.length > 0, list: true });

  const [editingId, setEditingId] = useState<number | null>(null);
  // A product the page has that MarketPro does not: what was typed.
  const [newProductName, setNewProductName] = useState<string | null>(null);
  const [saving, setSaving] = useState<"" | "save" | "another">("");

  // -- product form --
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<Picked>(null);
  const [desc, setDesc] = useState("");
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  const [variants, setVariants] = useState<Variant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<number | null>(null);
  const [variantSearch, setVariantSearch] = useState("");
  const [similar, setSimilar] = useState<string | null>(null);

  // -- stock / price form --
  const [product, setProduct] = useState<Picked>(null);
  const [location, setLocation] = useState<Picked>(null);
  const [quantity, setQuantity] = useState("");
  const [countedAt, setCountedAt] = useState(todayForInput());
  const [unitPrice, setUnitPrice] = useState("");
  const [unitCost, setUnitCost] = useState("");

  const clearForm = (keepDates = true) => {
    setEditingId(null);
    setName("");
    setUnit(null);
    setDesc("");
    setAttributes({});
    setVariants([]);
    setSelectedVariant(null);
    setVariantSearch("");
    setSimilar(null);
    setProduct(null);
    setQuantity("");
    setUnitPrice("");
    setUnitCost("");
    if (!keepDates) setCountedAt(todayForInput());
  };

  // Esc clears the form - or, while a variant is picked, only that.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (selectedVariant !== null) {
        setSelectedVariant(null);
        setAttributes((prev) => Object.fromEntries(Object.keys(prev).map((key) => [key, ""])));
        return;
      }
      clearForm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedVariant]);

  // A stock line goes to the shop's default location unless the page says otherwise.
  useEffect(() => {
    if (kind !== "stock_list" || location || !token) return;
    const fetchDefault = async () => {
      const rows = await workLookup(token, "locations", "");
      const preferred = rows.find((row) => row.is_default) || rows[0];
      if (preferred) setLocation({ id: preferred.id, label: preferred.label });
    };
    fetchDefault();
  }, [kind, token]);

  // -- picking an entered row --

  const pick = async (outputId: number) => {
    const output = outputs.find((row) => row.id === outputId);
    if (!output) return;
    if (kind === "product_list" && !output.created) {
      toast.error("This product was already in MarketPro, so it cannot be changed here.");
      return;
    }
    try {
      const res = await getWorkOutput(token, entry.id, outputId);
      if (!res.ok) {
        if (res.error) toast.error(res.error);
        return;
      }
      const values = res.data.values || {};
      clearForm();
      setEditingId(outputId);
      if (kind === "product_list") {
        setName(values.name || "");
        setUnit(values.unit ? { id: values.unit, label: output.detail || "" } : null);
        setDesc(values.desc || "");
        setVariants((values.variants || []).map((v) => ({ id: v.id, attributes: v.attributes || {} })));
      } else {
        setProduct({ id: values.product, label: output.label });
        if (kind === "stock_list") {
          setLocation(values.location ? { id: values.location, label: output.detail || "" } : null);
          setQuantity(values.quantity !== undefined && values.quantity !== null ? String(values.quantity) : "");
          if (values.counted_at) setCountedAt(values.counted_at);
        } else {
          setUnitPrice(values.unit_price !== undefined && values.unit_price !== null ? String(values.unit_price) : "");
          setUnitCost(values.unit_cost !== undefined && values.unit_cost !== null ? String(values.unit_cost) : "");
        }
      }
    } catch (error) {
      console.log("Error loading the line:", error);
      toast.error("Failed to load the line.");
    }
  };

  const remove = async (outputId: number) => {
    try {
      const res = await deleteWorkOutput(token, entry.id, outputId);
      if (res.ok) {
        toast.success("Deleted.");
        if (editingId === outputId) clearForm();
        await reload();
      } else if (res.error) {
        toast.error(res.error);
      }
    } catch (error) {
      console.log("Error deleting the line:", error);
      toast.error("Failed to delete.");
    }
  };

  // -- saving --

  const body = () => {
    if (kind === "product_list") {
      return {
        name: name.trim(),
        unit: unit ? Number(unit.id) : null,
        desc,
        variants: variants.map((v) => (v.id ? { id: v.id, attributes: v.attributes } : { attributes: v.attributes })),
      };
    }
    if (kind === "stock_list") {
      return {
        product: product ? Number(product.id) : null,
        location: location ? Number(location.id) : null,
        quantity: quantity === "" ? null : parseInt(quantity, 10),
        counted_at: countedAt || null,
      };
    }
    return {
      product: product ? Number(product.id) : null,
      unit_price: unitPrice === "" ? null : parseFloat(unitPrice),
      unit_cost: unitCost === "" ? null : parseFloat(unitCost),
    };
  };

  const save = async (another: boolean) => {
    if (kind === "product_list" && !name.trim()) {
      toast.error("Enter the product's name.");
      return;
    }
    if (kind === "product_list" && !unit) {
      toast.error("Pick the unit.");
      return;
    }
    if (kind !== "product_list" && !product) {
      toast.error("Pick the product.");
      return;
    }
    setSaving(another ? "another" : "save");
    try {
      const data = body();
      const res = editingId
        ? await updateWorkOutput(token, entry.id, editingId, data)
        : kind === "product_list"
          ? await postWorkProduct(token, entry.id, data)
          : await postWorkStockLine(token, entry.id, data);
      if (!res.ok) {
        if (res.error) toast.error(res.error);
        return;
      }
      toast.success("Saved.");
      await reload();
      if (another) {
        clearForm();
      } else if (!editingId && res.data?.output?.id) {
        setEditingId(res.data.output.id);
      }
    } catch (error) {
      console.log("Error saving the line:", error);
      toast.error("Failed to save.");
    } finally {
      setSaving("");
    }
  };

  // A product already in MarketPro under a similar name is usually the same
  // product: its variants belong on it, not on a second copy.
  const checkSimilar = async () => {
    const typed = name.trim();
    if (!typed || editingId) {
      setSimilar(null);
      return;
    }
    const rows = await workLookup(token, "products", typed);
    setSimilar(rows.length ? rows[0].label : null);
  };

  // -- variants (as on Create Product) --

  const attributeCount = Object.keys(attributes).length;
  const variantReady = attributeCount > 0 && Object.values(attributes).every((v) => String(v ?? "").trim() !== "");

  const addAttribute = (item: LookupItem | null) => {
    if (!item || attributeCount >= 3) return;
    setAttributes((prev) => ({ ...prev, [item.label]: prev[item.label] ?? "" }));
  };

  const clearAttributeValues = () =>
    setAttributes((prev) => Object.fromEntries(Object.keys(prev).map((key) => [key, ""])));

  const createOrUpdateVariant = () => {
    if (selectedVariant !== null) {
      setVariants((prev) => prev.map((v, i) => (i === selectedVariant ? { ...v, attributes: { ...attributes } } : v)));
      setSelectedVariant(null);
    } else {
      setVariants((prev) => [...prev, { attributes: { ...attributes } }]);
    }
    clearAttributeValues();
  };

  const visibleVariants = variants
    .map((variant, index) => ({ variant, index }))
    .filter(({ variant }) => {
      const q = variantSearch.trim().toLowerCase();
      return !q || variantLabel(variant).toLowerCase().includes(q);
    });

  // -- the entered table --

  const table = useMemo(() => {
    if (kind === "product_list") {
      return {
        columns: ["Product Name", "Unit", "No. of Variants"],
        grid: "grid-cols-[40px_minmax(0,1fr)_72px_96px]",
        rows: outputs.map((o) => ({ id: o.id, cells: [o.label, o.detail || "-", o.variant_count ?? 0] })),
      };
    }
    if (kind === "stock_list") {
      return {
        columns: ["Product", "Location", "Qty", "Counted at"],
        grid: "grid-cols-[40px_minmax(0,1fr)_88px_56px_88px]",
        rows: outputs.map((o) => ({
          id: o.id,
          cells: [o.label, o.detail || "-", o.entered?.quantity ?? "-",
            o.entered?.counted_at ? formatDate(o.entered.counted_at) : "-"],
        })),
      };
    }
    return {
      columns: ["Product", "Price", "Cost"],
      grid: "grid-cols-[40px_minmax(0,1fr)_80px_80px]",
      rows: outputs.map((o) => ({
        id: o.id,
        cells: [o.label, o.entered?.unit_price ?? "-", o.entered?.unit_cost ?? "-"],
      })),
    };
  }, [kind, outputs]);

  const formTitle = {
    product_list: editingId ? "Edit product" : "Add a product",
    stock_list: editingId ? "Edit stock line" : "Add a stock line",
    price_list: editingId ? "Edit price line" : "Add a price line",
  }[kind];
  const formHint = {
    product_list: "Names and variants only - no prices or stock here.",
    stock_list: "Only what is on the page - current stock is not shown.",
    price_list: "Only what is on the page - the shop's prices are not shown.",
  }[kind];

  return (
    <EntryShell
      mode={mode}
      title={`Item #${entry.id}`}
      aside={flow.aside}
      actions={flow.actions}
      backTo={mode === "review" ? "/backlog" : "/backlog/work"}
      dialogs={
        <>
          {flow.dialogs}
          <NewProductDialog
            open={newProductName !== null}
            setOpen={(open) => { if (!open) setNewProductName(null); }}
            initialName={newProductName || ""}
            entryId={entry.id}
            onCreated={(variants) => {
              if (variants[0]) setProduct({ id: variants[0].id, label: variants[0].label });
            }}
          />
        </>
      }
    >
      <div className="h-full min-h-[560px] grid grid-cols-3 gap-6">
        <PagePhoto src={entry.image} className="min-h-0" />

        {/* The form */}
        <section className="min-h-0 flex flex-col rounded-lg border bg-card">
          <div className="shrink-0 px-5 pt-5 pb-3 border-b">
            <h2 className="text-lg font-semibold">{formTitle}</h2>
            <p className="text-sm text-muted-foreground">{formHint}</p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-5 py-4 space-y-4">
            {mode === "entry" ? <SentBackNote entry={entry} /> : <NewRecordsNote review={review} />}

            {kind === "product_list" ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="product_name">Name</Label>
                    <Input id="product_name" value={name} onChange={(e) => setName(e.target.value)} onBlur={checkSimilar} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="product_unit">Unit</Label>
                    <LookupCombobox
                      id="product_unit"
                      kind="units"
                      value={unit?.id ?? ""}
                      selectedLabel={unit?.label}
                      onChange={(item) => setUnit(item ? { id: item.id, label: item.label } : null)}
                      placeholder="Select Unit"
                    />
                  </div>
                </div>
                {similar && (
                  <p className="text-xs rounded-md border border-yellow-200 bg-yellow-50 text-yellow-800 px-3 py-2">
                    Already in MarketPro with a similar name: <span className="font-semibold">{similar}</span>.
                    If it is the same product, check with the owner before adding it again.
                  </p>
                )}
                <div className="space-y-1">
                  <Label htmlFor="product_desc">Description</Label>
                  <Textarea id="product_desc" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} />
                </div>

                <div className="pt-2 space-y-2">
                  <h3 className="text-base font-semibold">Add Product Variants (Optional)</h3>
                  {attributeCount > 0 && (
                    <div className="space-y-1">
                      <Label className="font-semibold">Variant Configuration</Label>
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
                            onClick={() => setAttributes((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => k !== key)))}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 items-end">
                    <div className="w-1/2 space-y-1">
                      <Label htmlFor="variant_attr">Add Attribute</Label>
                      <LookupCombobox
                        id="variant_attr"
                        kind="attributes"
                        value=""
                        onChange={addAttribute}
                        disabled={attributeCount >= 3}
                        placeholder={attributeCount >= 3 ? "Max. 3 attributes allowed" : "Select Attribute"}
                      />
                    </div>
                    <Button type="button" className="w-1/2" disabled={!variantReady} onClick={createOrUpdateVariant}>
                      {selectedVariant !== null
                        ? <><RefreshCcwIcon className="h-4 w-4 mr-2" />Update Variant</>
                        : <><Plus className="h-4 w-4 mr-2" />Create Variant</>}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      onClick={() => { setSelectedVariant(null); setAttributes({}); }}
                    >
                      <RotateCcwIcon className="h-4 w-4" />
                    </Button>
                  </div>
                  <SearchField
                    id="variant_search"
                    placeholder="Search variants"
                    value={variantSearch}
                    onChange={setVariantSearch}
                    className="w-full"
                    wrapperClassName="w-full"
                  />
                  <div className="flex flex-col gap-[2px]">
                    {visibleVariants.map(({ variant, index }) => (
                      <div key={`${variant.id ?? "new"}-${index}`} className="flex gap-2 items-center">
                        <div
                          onClick={() => { setSelectedVariant(index); setAttributes({ ...variant.attributes }); }}
                          className={`flex-1 bg-card rounded-lg min-h-[35px] py-0.5 flex cursor-pointer items-center px-4 gap-4 text-sm ${selectedVariant === index ? "border-2 border-[#4285F4]" : "border border-border"}`}
                        >
                          <span>{index + 1}.</span>
                          <span className="flex-1">{variantLabel(variant)}</span>
                        </div>
                        <RowAction
                          label="Delete variant"
                          onClick={() => {
                            if (selectedVariant === index) setSelectedVariant(null);
                            setVariants((prev) => prev.filter((_, i) => i !== index));
                          }}
                        >
                          <Trash2 className="h-5 w-5" />
                        </RowAction>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <Label htmlFor="line_product">Product</Label>
                  <LookupCombobox
                    id="line_product"
                    kind="variants"
                    value={product?.id ?? ""}
                    selectedLabel={product?.label}
                    onChange={(item) => setProduct(item ? { id: item.id, label: item.label } : null)}
                    onCreate={editingId ? undefined : setNewProductName}
                    createNoun="product"
                    disabled={!!editingId}
                    placeholder="Select product"
                    notFoundText="No product matches that. Check the glossary."
                  />
                </div>
                {kind === "stock_list" ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="line_location">Location</Label>
                        <LookupCombobox
                          id="line_location"
                          kind="locations"
                          value={location?.id ?? ""}
                          selectedLabel={location?.label}
                          onChange={(item) => setLocation(item ? { id: item.id, label: item.label } : null)}
                          placeholder="Select location"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="line_quantity">Quantity</Label>
                        <Input id="line_quantity" type="number" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="line_counted">Stock counted at</Label>
                      <Input id="line_counted" type="date" value={countedAt} onChange={(e) => setCountedAt(e.target.value)} />
                      <p className="text-xs text-muted-foreground">
                        Sales and purchases dated on or before the counted date will not change this stock again.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="line_price">Unit price</Label>
                      <Input id="line_price" type="number" min="0" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="line_cost">Unit cost</Label>
                      <Input id="line_cost" type="number" min="0" step="0.01" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="shrink-0 flex justify-end gap-3 border-t px-5 py-4">
            {editingId && (
              <Button type="button" variant="ghost" onClick={() => clearForm()}>Clear</Button>
            )}
            <SubmitButton type="button" variant="outline" pending={saving === "save"} pendingLabel="Saving…"
              disabled={!!saving} onClick={() => save(false)}>
              Save
            </SubmitButton>
            <SubmitButton type="button" pending={saving === "another"} pendingLabel="Saving…"
              disabled={!!saving} onClick={() => save(true)}>
              Save &amp; add another
            </SubmitButton>
          </div>
        </section>

        {/* What has been entered */}
        <section className="min-h-0 flex flex-col">
          <h2 className="shrink-0 text-lg font-semibold mb-4">
            Entered from this page ({outputs.length})
          </h2>
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar -mx-1 px-1 pb-1">
            <EnteredTable
              columns={table.columns}
              grid={table.grid}
              rows={table.rows}
              selectedId={editingId}
              onPick={pick}
              onDelete={remove}
            />
          </div>
        </section>
      </div>
    </EntryShell>
  );
}
