import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, RefreshCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Payments from "@/components/ui/payments";
import { InvoiceSection } from "@/components/invoice/InvoiceScreen";
import { InvoiceItemsTable, RowAction } from "@/components/invoice/InvoiceItemsTable";
import { ExtraChargesEditor, type ExtraCharge } from "@/components/invoice/ExtraChargesEditor";
import { AmountToggleInput, InvoiceSummaryCard, PaymentButton } from "@/components/invoice/InvoiceRail";
import { EntryShell } from "@/components/backlog/EntryShell";
import { PagePhoto } from "@/components/backlog/PagePhoto";
import { LookupCombobox, type LookupItem } from "@/components/backlog/LookupCombobox";
import { SentBackNote } from "@/components/backlog/SentBackNote";
import { NewPartyDialog, NewProductDialog } from "@/components/backlog/NewRecordDialogs";
import { useEntryFlow } from "@/components/backlog/useEntryFlow";
import type { OwnerEntry, WorkEntry } from "@/components/backlog/meta";
import { useAuth } from "../../../services/AuthProvider";
import {
  deleteWorkPayment,
  getWorkOutput,
  getWorkSettlement,
  paymentRequestBody,
  postWorkInvoice,
  postWorkPayment,
  updateWorkOutput,
  workLookup,
} from "../../../services/api";
import { PurchaseInvoiceStatusMap, normaliseExtraCharges } from "../../../services/utils";

type Picked = { id: number | string; label: string } | null;

type Line = {
  key: string;
  /** The saved line's id; null for a line not saved yet. */
  id: number | null;
  product: number | string;
  label: string;
  quantity: number;
  price: number;
};

type StagedPayment = { id: string; amount: number; status: string; fields: object; imageFile?: File | null };

const money = (value: number) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const newKey = () => `line-${Date.now()}-${Math.random()}`;
const dateOnly = (value: string | null) => (value ? String(value).slice(0, 10) : "");

/**
 * A sales or purchase invoice page: the photo, the create screen's fields and
 * items, and its rail - summary, discount and tax, notes, payments, project.
 *
 * The same screen serves the entry person and the owner reviewing the page.
 * Before anything is saved it holds the invoice and its payments on screen;
 * once the page has an invoice (a page sent back, or one under review) it
 * loads it, and Submit / Approve saves the corrections through the invoice's
 * own update.
 *
 * Prices are never filled in from the shop's records: they are typed as
 * written on the bill.
 */
export default function BacklogInvoiceEntry({
  entry,
  mode,
  review,
}: {
  entry: WorkEntry;
  mode: "entry" | "review";
  review?: OwnerEntry | null;
}) {
  const { token } = useAuth();
  const isSales = entry.type === "sales_invoice";
  const priceKey = isSales ? "unit_price" : "unit_cost";
  const partyKind = isSales ? "customers" : "suppliers";
  const partyLabel = isSales ? "Customer" : "Supplier";

  const existing = (entry.outputs || []).find((o) => o.kind === entry.type) || null;
  const [outputId, setOutputId] = useState<number | null>(existing?.id ?? null);
  const [recordId, setRecordId] = useState<number | null>(existing?.record_id ?? null);
  const [loading, setLoading] = useState(!!existing);

  const [party, setParty] = useState<Picked>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [dateIssued, setDateIssued] = useState("");
  const [dateDue, setDateDue] = useState("");
  const [delivery, setDelivery] = useState("");
  const [status, setStatus] = useState("R");
  const [discount, setDiscount] = useState("0");
  const [discountType, setDiscountType] = useState("amount");
  const [tax, setTax] = useState("0");
  const [taxType, setTaxType] = useState("percentage");
  const [notes, setNotes] = useState("");
  const [project, setProject] = useState<Picked>(null);
  const [charges, setCharges] = useState<ExtraCharge[]>([]);
  const [lines, setLines] = useState<Line[]>([]);

  // The add row, which also takes a line clicked in the table for correcting.
  const [newProduct, setNewProduct] = useState<Picked>(null);
  const [newQuantity, setNewQuantity] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const [stagedPayments, setStagedPayments] = useState<StagedPayment[]>([]);
  const [savedPayments, setSavedPayments] = useState<{ id: number; amount: number; status?: string }[]>([]);
  const [paymentsOpen, setPaymentsOpen] = useState(false);
  // A name the page has that MarketPro does not: the create dialog open for
  // it, with what was typed.
  const [creating, setCreating] = useState<{ kind: "party" | "product"; text: string } | null>(null);
  // How much of the saved invoice the party's khaata already settles - never
  // the party's balance. Counted as paid, as on the standard screens.
  const [fromKhaata, setFromKhaata] = useState(0);

  // -- loading a page that already has its invoice ---------------------------

  const loadValues = useCallback(async (id: number) => {
    const res = await getWorkOutput(token, entry.id, id);
    if (!res.ok) {
      if (res.error) toast.error(res.error);
      return null;
    }
    return res.data.values;
  }, [token, entry.id]);

  useEffect(() => {
    if (!existing || !token) return;
    const fill = async () => {
      try {
        const values = await loadValues(existing.id);
        if (!values) return;
        setParty(values.party ? { id: values.party.id, label: values.party.label } : null);
        setInvoiceNumber(values.invoice_number || "");
        setDateIssued(dateOnly(values.date_issued));
        setDateDue(dateOnly(values.date_due));
        setDelivery(dateOnly(values.delivery));
        if (values.status) setStatus(values.status);
        if (values.discount?.type) {
          setDiscount(String(values.discount.value ?? 0));
          setDiscountType(values.discount.type);
        }
        if (values.tax?.type) {
          setTax(String(values.tax.value ?? 0));
          setTaxType(values.tax.type);
        }
        setNotes(values.notes || "");
        setProject(values.project ? { id: values.project.id, label: values.project.label } : null);
        setCharges(values.extra_charges || []);
        setLines((values.lines || []).map((line) => ({
          key: `saved-${line.id}`,
          id: line.id,
          product: line.product,
          label: line.label,
          quantity: Number(line.quantity),
          price: Number(line.price || 0),
        })));
        setSavedPayments(values.payments || []);
      } catch (error) {
        console.log("Error loading the invoice:", error);
        toast.error("Failed to load the invoice entered from this page.");
      } finally {
        setLoading(false);
      }
    };
    fill();
    // Once per page: the screen is keyed on the entry, so a new page remounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // -- the figures -----------------------------------------------------------

  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.price, 0);
  const discountValue = parseFloat(discount) || 0;
  const taxValue = parseFloat(tax) || 0;
  const discountAmount = isSales ? (discountType === "percentage" ? (subtotal * discountValue) / 100 : discountValue) : 0;
  const taxAmount = taxType === "percentage" ? (subtotal * taxValue) / 100 : taxValue;
  const chargesTotal = isSales ? charges.reduce((sum, c) => sum + (parseFloat(String(c?.amount)) || 0), 0) : 0;
  const total = subtotal - discountAmount + taxAmount + chargesTotal;
  const unitCount = lines.reduce((sum, line) => sum + line.quantity, 0);

  const cleared = (rows) => rows
    .filter((p) => !p.status || p.status === "C")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const paid = outputId ? cleared(savedPayments) + fromKhaata : cleared(stagedPayments);

  const summaryLines = [
    { label: "Subtotal", value: subtotal },
    ...(discountAmount ? [{ label: "Discount", value: discountAmount, sign: "−" as const }] : []),
    ...(taxAmount ? [{ label: taxType === "percentage" ? `Tax (${taxValue}%)` : "Tax", value: taxAmount, sign: "+" as const }] : []),
    ...(chargesTotal ? [{ label: "Extra charges", value: chargesTotal, sign: "+" as const }] : []),
  ];

  // -- the add row -----------------------------------------------------------

  const clearAddRow = () => {
    setNewProduct(null);
    setNewQuantity("");
    setNewPrice("");
    setEditingKey(null);
  };

  // Esc drops the line being corrected, as it does on the product variants.
  useEffect(() => {
    if (!editingKey) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") clearAddRow();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editingKey]);

  const addOrUpdateLine = () => {
    const quantity = parseInt(newQuantity, 10);
    const price = parseFloat(newPrice);
    if (!newProduct) {
      toast.error("Pick the product.");
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error("Enter the quantity on the bill.");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      toast.error("Enter the price on the bill.");
      return;
    }

    if (editingKey) {
      setLines((prev) => prev.map((line) => {
        if (line.key !== editingKey) return line;
        const changed = String(line.product) !== String(newProduct.id) || line.quantity !== quantity || line.price !== price;
        return {
          ...line,
          // A sales invoice's update never lowers a saved line or changes its
          // price, so a corrected sales line is replaced - its stock comes
          // back and the new figure goes out. A purchase line is updated in
          // place, stock and all.
          id: isSales && changed ? null : line.id,
          product: newProduct.id,
          label: newProduct.label,
          quantity,
          price,
        };
      }));
      clearAddRow();
      return;
    }

    // The same product at the same price joins its line, as on the create screens.
    const same = lines.find((line) => String(line.product) === String(newProduct.id) && line.price === price);
    if (same) {
      setLines((prev) => prev.map((line) => line.key === same.key
        ? { ...line, quantity: line.quantity + quantity, id: isSales ? null : line.id }
        : line));
      toast.success(`Added ${quantity} to the existing line for this product at this price.`);
    } else {
      setLines((prev) => [...prev, {
        key: newKey(), id: null, product: newProduct.id, label: newProduct.label, quantity, price,
      }]);
    }
    clearAddRow();
  };

  const pickLine = (line: Line) => {
    setEditingKey(line.key);
    setNewProduct({ id: line.product, label: line.label });
    setNewQuantity(String(line.quantity));
    setNewPrice(String(line.price));
  };

  const removeLine = (key: string) => {
    if (key === editingKey) clearAddRow();
    setLines((prev) => prev.filter((line) => line.key !== key));
  };

  const editingIndex = lines.findIndex((line) => line.key === editingKey);

  // -- saving ----------------------------------------------------------------

  const payload = (charges_: ExtraCharge[]) => {
    const common = {
      invoice_number: invoiceNumber.trim(),
      date_issued: dateIssued,
      date_due: dateDue || dateIssued,
      notes,
      tax: { value: taxValue, type: taxType },
      project: project ? Number(project.id) : null,
      items: lines.map((line) => ({
        id: line.id,
        product_id: Number(line.product),
        quantity: line.quantity,
        [priceKey]: line.price,
      })),
    };
    return isSales
      ? { ...common, customer: party ? Number(party.id) : null,
          discount: { value: discountValue, type: discountType }, extra_charges: charges_ }
      : { ...common, supplier: party ? Number(party.id) : null, status, delivery: delivery || null };
  };

  const save = async (): Promise<boolean> => {
    if (lines.length === 0) {
      toast.error("Add the items on the bill first.");
      return false;
    }
    if (!dateIssued) {
      toast.error("Enter the date on the bill.");
      return false;
    }
    if (editingKey) {
      toast.error("Update or clear the line you are correcting first (Esc clears it).");
      return false;
    }
    const { charges: cleanCharges, error } = isSales
      ? normaliseExtraCharges(charges)
      : { charges: [], error: null };
    if (error) {
      toast.error(error);
      return false;
    }

    try {
      if (outputId) {
        const res = await updateWorkOutput(token, entry.id, outputId, payload(cleanCharges));
        if (!res.ok) {
          if (res.error) toast.error(res.error);
          return false;
        }
        return true;
      }

      const res = await postWorkInvoice(token, entry.id, isSales ? "sales-invoice" : "purchase-invoice",
        payload(cleanCharges));
      if (!res.ok) {
        if (res.error) toast.error(res.error);
        return false;
      }
      const output = res.data.output;
      setOutputId(output.id);
      setRecordId(output.record_id);

      // The payments held on screen, one at a time: each is checked against
      // what is still owed, which depends on the ones before it.
      let failures = 0;
      let reason = "";
      for (const payment of stagedPayments) {
        const body = paymentRequestBody(payment.fields, payment.imageFile);
        const paidRes = await postWorkPayment(token, entry.id, output.id, body);
        if (!paidRes.ok) {
          failures += 1;
          reason = reason || paidRes.error || "";
        }
      }
      setStagedPayments([]);
      if (failures) {
        const values = await loadValues(output.id);
        if (values) setSavedPayments(values.payments || []);
        toast.warning(`Invoice saved, but ${failures} payment${failures > 1 ? "s" : ""} could not be${reason ? `: ${reason}` : "."} Add ${failures > 1 ? "them" : "it"} again, then submit.`);
        return false;
      }
      // The saved lines now have ids: a second submit must update them, not
      // add them again.
      const values = await loadValues(output.id);
      if (values) {
        setLines((values.lines || []).map((line) => ({
          key: `saved-${line.id}`, id: line.id, product: line.product, label: line.label,
          quantity: Number(line.quantity), price: Number(line.price || 0),
        })));
        setSavedPayments(values.payments || []);
      }
      return true;
    } catch (error) {
      console.log("Error saving the invoice:", error);
      toast.error("Failed to save the invoice.");
      return false;
    }
  };

  const flow = useEntryFlow({ entry, mode, review, beforeFinish: save, hasOutputs: !!outputId });

  // -- payments --------------------------------------------------------------

  const accountsLoader = useCallback(async () => {
    const rows = await workLookup(token, "accounts", "");
    return rows.map((row) => ({ id: row.id, name: row.label, type: row.type, is_default: row.is_default }));
  }, [token]);

  const loadSettlement = useCallback(async (id: number) => {
    const settled = await getWorkSettlement(token, entry.id, id);
    setFromKhaata(Number(settled?.settled_from_khaata || 0));
    return settled;
  }, [token, entry.id]);

  useEffect(() => {
    if (outputId && token) loadSettlement(outputId);
  }, [outputId, token, loadSettlement]);

  const liveApi = useMemo(() => outputId ? {
    list: async () => {
      const values = await loadValues(outputId);
      const rows = values?.payments || [];
      setSavedPayments(rows);
      return rows;
    },
    settlement: () => loadSettlement(outputId),
    create: (body) => postWorkPayment(token, entry.id, outputId, body),
    remove: (paymentId) => deleteWorkPayment(token, entry.id, outputId, paymentId),
  } : null, [outputId, token, entry.id, loadValues, loadSettlement]);

  // -- the screen ------------------------------------------------------------

  const fields = (
    <div className={`grid gap-4 ${isSales ? "grid-cols-4" : "grid-cols-3"}`}>
      <div className="space-y-1">
        <Label htmlFor="party">{partyLabel}</Label>
        <LookupCombobox
          id="party"
          kind={partyKind}
          value={party?.id ?? ""}
          selectedLabel={party?.label}
          onChange={(item: LookupItem | null) => setParty(item ? { id: item.id, label: item.label } : null)}
          onCreate={(text) => setCreating({ kind: "party", text })}
          createNoun={partyLabel.toLowerCase()}
          placeholder={`Select ${partyLabel.toLowerCase()}`}
          emptyText={`No ${partyKind} yet.`}
          notFoundText={`No ${partyLabel.toLowerCase()} matches that. Check the glossary.`}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="invoice_number">Invoice no.</Label>
        <Input id="invoice_number" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="As on the bill" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="date_issued">{isSales ? "Date Issued" : "Invoice Date"}</Label>
        <Input id="date_issued" type="date" value={dateIssued} onChange={(e) => setDateIssued(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="date_due">Date Due</Label>
        <Input id="date_due" type="date" value={dateDue} onChange={(e) => setDateDue(e.target.value)} />
      </div>
      {!isSales && (
        <>
          <div className="space-y-1">
            <Label htmlFor="delivery">Delivery Date</Label>
            <Input id="delivery" type="date" value={delivery} onChange={(e) => setDelivery(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="purchase_status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="purchase_status"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PurchaseInvoiceStatusMap).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label as string}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </div>
  );

  const priceLabel = isSales ? "Unit Price" : "Unit Cost";
  const columns = ["Product", "Qty", isSales ? "Price" : "Cost", "Total"];

  return (
    <EntryShell
      mode={mode}
      title={`Item #${entry.id}`}
      aside={flow.aside}
      actions={flow.actions}
      backTo={mode === "review" ? "/backlog" : "/backlog/work"}
      loading={loading}
      dialogs={
        <>
          {flow.dialogs}
          <Payments
            invoiceId={recordId}
            invoiceTotal={total}
            isSalesPayment={isSales}
            open={paymentsOpen}
            setOpen={setPaymentsOpen}
            stagedPayments={stagedPayments}
            onStagedChange={outputId ? undefined : setStagedPayments}
            accountsLoader={accountsLoader}
            liveApi={liveApi}
          />
          <NewPartyDialog
            open={creating?.kind === "party"}
            setOpen={(open) => { if (!open) setCreating(null); }}
            kind={isSales ? "customer" : "supplier"}
            initialName={creating?.text || ""}
            entryId={entry.id}
            asOf={dateIssued}
            onCreated={(item) => setParty({ id: item.id, label: item.label })}
          />
          <NewProductDialog
            open={creating?.kind === "product"}
            setOpen={(open) => { if (!open) setCreating(null); }}
            initialName={creating?.text || ""}
            entryId={entry.id}
            onCreated={(variants) => {
              if (variants[0]) setNewProduct({ id: variants[0].id, label: variants[0].label });
            }}
          />
        </>
      }
    >
      <div className="h-full flex gap-6">
        <PagePhoto src={entry.image} className="w-[360px] shrink-0" />

        <div className="flex-1 min-w-0 min-h-0 flex flex-col">
          <div className="shrink-0 space-y-4 pb-6 border-b border-border">
            {mode === "entry" && <SentBackNote entry={entry} />}
            {fields}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar -ml-1 pl-1 pr-1 pb-4">
            <InvoiceSection
              title="Invoice Items"
              first
              aside={lines.length > 0 ? `${lines.length} items · ${unitCount} units` : undefined}
              pinned={
                <>
                  <div className="flex gap-3 items-end">
                    <div className="flex-1 min-w-0 space-y-1">
                      <Label htmlFor="newProduct">Product</Label>
                      <LookupCombobox
                        id="newProduct"
                        kind="variants"
                        value={newProduct?.id ?? ""}
                        selectedLabel={newProduct?.label}
                        onChange={(item) => setNewProduct(item ? { id: item.id, label: item.label } : null)}
                        onCreate={(text) => setCreating({ kind: "product", text })}
                        createNoun="product"
                        placeholder="Select product"
                        emptyText="No products yet."
                        notFoundText="No product matches that. Check the glossary."
                      />
                    </div>
                    <div className="w-24 space-y-1">
                      <Label htmlFor="newQuantity">Qty</Label>
                      <Input id="newQuantity" type="number" min="0" value={newQuantity} onChange={(e) => setNewQuantity(e.target.value)} />
                    </div>
                    <div className="w-28 space-y-1">
                      <Label htmlFor="newPrice">{priceLabel}</Label>
                      <Input id="newPrice" type="number" min="0" step="0.01" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
                    </div>
                    <Button type="button" onClick={addOrUpdateLine}>
                      {editingKey ? <RefreshCcw className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                      {editingKey ? "Update" : "Add Item"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {editingKey
                      ? `Editing line ${editingIndex + 1}. Esc clears.`
                      : "Prices are not filled in - type them as written on the bill."}
                  </p>
                  <InvoiceItemsTable columns={columns} rows={[]} headerOnly />
                </>
              }
            >
              <InvoiceItemsTable
                rowsOnly
                columns={columns}
                emptyText="No items yet. Pick a product above to add the first one."
                rows={lines.map((line) => ({
                  key: line.key,
                  cells: [line.label, line.quantity, money(line.price), `PKR ${money(line.quantity * line.price)}`],
                  onClick: () => pickLine(line),
                  selected: line.key === editingKey,
                  actions: (
                    <RowAction label="Delete item" onClick={() => removeLine(line.key)}>
                      <Trash2 className="h-5 w-5" />
                    </RowAction>
                  ),
                }))}
              />
            </InvoiceSection>
          </div>

          {/* Stacked under the items. Held to a fixed height, so the charge
              row lines up with the discount and tax in the rail. */}
          {isSales && (
            <div className="shrink-0 h-[262px] overflow-y-auto no-scrollbar border-t border-border -ml-1 pl-1 pr-1">
              <ExtraChargesEditor charges={charges} onChange={setCharges} />
            </div>
          )}
        </div>

        <aside className="w-[288px] shrink-0 flex flex-col gap-3">
          <InvoiceSummaryCard lines={summaryLines} total={total} />
          <div className={`grid gap-3 ${isSales ? "grid-cols-2" : "grid-cols-1"}`}>
            {isSales && (
              <div className="space-y-1">
                <Label htmlFor="discount">Discount</Label>
                <AmountToggleInput
                  id="discount"
                  type={discountType}
                  onToggle={() => setDiscountType(discountType === "percentage" ? "amount" : "percentage")}
                  inputProps={{ value: discount, onChange: (e) => setDiscount(e.target.value) }}
                />
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="tax">Tax</Label>
              <AmountToggleInput
                id="tax"
                type={taxType}
                onToggle={() => setTaxType(taxType === "percentage" ? "amount" : "percentage")}
                inputProps={{ value: tax, onChange: (e) => setTax(e.target.value) }}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything else written on the bill" />
          </div>
          <PaymentButton total={total} paid={paid} onClick={() => setPaymentsOpen(true)} />
          <LookupCombobox
            id="project"
            kind="projects"
            className="w-full"
            value={project?.id ?? ""}
            selectedLabel={project?.label}
            onChange={(item) => setProject(item ? { id: item.id, label: item.label } : null)}
            placeholder="Add to project"
            emptyText="No projects yet."
            notFoundText="No project matches that."
            clearable
          />
        </aside>
      </div>
    </EntryShell>
  );
}

