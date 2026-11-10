import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { RowAction } from "@/components/invoice/InvoiceItemsTable";
import { EntryShell } from "@/components/backlog/EntryShell";
import { PagePhoto } from "@/components/backlog/PagePhoto";
import { LookupCombobox } from "@/components/backlog/LookupCombobox";
import { SentBackNote } from "@/components/backlog/SentBackNote";
import { NewRecordsNote } from "@/components/backlog/NewRecordsNote";
import { NewProductDialog } from "@/components/backlog/NewRecordDialogs";
import { useEntryFlow } from "@/components/backlog/useEntryFlow";
import type { OwnerEntry, WorkEntry } from "@/components/backlog/meta";
import { useAuth } from "../../../services/AuthProvider";
import {
  addWorkProductVariants,
  createWorkProduct,
  getWorkProductVariants,
  deleteWorkOutput,
  getWorkOutput,
  postWorkStockLine,
  updateWorkOutput,
  workLookup,
} from "../../../services/api";
import { formatDate, todayForInput } from "../../../services/utils";

type Picked = { id: number | string; label: string } | null;

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

const numberText = (value: unknown) => (value !== undefined && value !== null ? String(value) : "");

/**
 * A stock list page - the only list the backlog takes for now. Each line is
 * saved as it is entered, so the page can be left and picked up again;
 * "Mark page complete" hands it to the owner.
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
  const outputs = useMemo(() => entry.outputs || [], [entry.outputs]);
  const flow = useEntryFlow({ entry, mode, review, hasOutputs: outputs.length > 0, list: true });

  const [editingId, setEditingId] = useState<number | null>(null);
  // A product the page counts that MarketPro lacks: the dialog open for what
  // was typed - or, by its exact name, for one it has (productId), to add
  // variants to it.
  const [creatingProduct, setCreatingProduct] = useState<{ text: string; productId?: number } | null>(null);
  const [saving, setSaving] = useState<"" | "save" | "another">("");

  const [product, setProduct] = useState<Picked>(null);
  const [location, setLocation] = useState<Picked>(null);
  const [quantity, setQuantity] = useState("");
  const [countedAt, setCountedAt] = useState(todayForInput());
  const [unitPrice, setUnitPrice] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [reorderLevel, setReorderLevel] = useState("");

  const clearForm = (keepDates = true) => {
    setEditingId(null);
    setProduct(null);
    setQuantity("");
    setUnitPrice("");
    setUnitCost("");
    setReorderLevel("");
    if (!keepDates) setCountedAt(todayForInput());
  };

  // Esc clears the form.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") clearForm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // A stock line goes to the shop's default location unless the page says otherwise.
  useEffect(() => {
    if (location || !token) return;
    const fetchDefault = async () => {
      const rows = await workLookup(token, "locations", "");
      const preferred = rows.find((row) => row.is_default) || rows[0];
      if (preferred) setLocation({ id: preferred.id, label: preferred.label });
    };
    fetchDefault();
  }, [token]);

  // -- picking an entered row --

  const pick = async (outputId: number) => {
    const output = outputs.find((row) => row.id === outputId);
    if (!output) return;
    try {
      const res = await getWorkOutput(token, entry.id, outputId);
      if (!res.ok) {
        if (res.error) toast.error(res.error);
        return;
      }
      const values = res.data.values || {};
      clearForm();
      setEditingId(outputId);
      setProduct({ id: values.product, label: output.label });
      setLocation(values.location ? { id: values.location, label: output.detail || "" } : null);
      setQuantity(numberText(values.quantity));
      if (values.counted_at) setCountedAt(values.counted_at);
      setUnitPrice(numberText(values.unit_price));
      setUnitCost(numberText(values.unit_cost));
      setReorderLevel(numberText(values.reorder_level));
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

  const save = async (another: boolean) => {
    if (!product) {
      toast.error("Pick the product.");
      return;
    }
    setSaving(another ? "another" : "save");
    try {
      const data = {
        product: Number(product.id),
        location: location ? Number(location.id) : null,
        quantity: quantity === "" ? null : parseInt(quantity, 10),
        counted_at: countedAt || null,
        // Optional: only when the page has them.
        unit_price: unitPrice === "" ? null : parseFloat(unitPrice),
        unit_cost: unitCost === "" ? null : parseFloat(unitCost),
        reorder_level: reorderLevel === "" ? null : parseInt(reorderLevel, 10),
      };
      const res = editingId
        ? await updateWorkOutput(token, entry.id, editingId, data)
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

  // -- the entered table --

  const rows = useMemo(() => outputs.map((o) => ({
    id: o.id,
    cells: [o.label, o.detail || "-", o.entered?.quantity ?? "-",
      o.entered?.counted_at ? formatDate(o.entered.counted_at) : "-"],
  })), [outputs]);

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
            open={creatingProduct !== null}
            setOpen={(open) => { if (!open) setCreatingProduct(null); }}
            initialName={creatingProduct?.text || ""}
            create={(data) => creatingProduct?.productId
              ? addWorkProductVariants(token, entry.id, creatingProduct.productId, data)
              : createWorkProduct(token, entry.id, data)}
            loadExisting={creatingProduct?.productId
              ? () => getWorkProductVariants(token, entry.id, creatingProduct.productId)
              : undefined}
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
            <h2 className="text-lg font-semibold">{editingId ? "Edit stock line" : "Add a stock line"}</h2>
            <p className="text-sm text-muted-foreground">Only what is on the page - current stock and prices are not shown.</p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-5 py-4 space-y-4">
            {mode === "entry" ? <SentBackNote entry={entry} /> : <NewRecordsNote review={review} />}

            <div className="space-y-1">
              <Label htmlFor="line_product">Product</Label>
              <LookupCombobox
                id="line_product"
                kind="variants"
                value={product?.id ?? ""}
                selectedLabel={product?.label}
                onChange={(item) => setProduct(item ? { id: item.id, label: item.label } : null)}
                // The page is the count, so a product it names that MarketPro
                // lacks is created here - an invoice never creates one.
                onCreate={editingId ? undefined : (text) => setCreatingProduct({ text })}
                onExtend={editingId ? undefined : (found) => setCreatingProduct({ text: found.name, productId: Number(found.id) })}
                createNoun="product"
                disabled={!!editingId}
                placeholder="Select product"
                notFoundText="No product matches that. Check the glossary."
              />
            </div>
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
            <div className="space-y-1">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="line_price">Unit price</Label>
                  <Input id="line_price" type="number" min="0" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="line_cost">Unit cost</Label>
                  <Input id="line_cost" type="number" min="0" step="0.01" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="line_reorder">Reorder level</Label>
                  <Input id="line_reorder" type="number" min="0" step="1" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} />
                </div>
              </div>
              {/* An empty field leaves the stock row's own value. */}
              <p className="text-xs text-muted-foreground">
                Optional - fill in only what the page shows.
              </p>
            </div>
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
              columns={["Product", "Location", "Qty", "Counted at"]}
              grid="grid-cols-[40px_minmax(0,1fr)_88px_56px_88px]"
              rows={rows}
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
