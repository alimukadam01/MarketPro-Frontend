import { useEffect, useMemo, useState } from "react";
import * as DialogUI from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Info, Upload } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../../services/AuthProvider";
import {
  getSettleableItems,
  moneyAccountsAPIPackage,
  recordPartyPayment,
} from "../../../services/api";
import {
  PaymentMethodMap,
  formatAccountOption,
  formatCurrency,
  methodsForAccount,
  todayForInput,
} from "../../../services/utils";

/**
 * Record one payment against several of a party's open items.
 *
 * Amount first, then tick what it settles. There is no payment-type dropdown:
 * the ticked items decide it, because each type settles exactly one kind of
 * thing. The outstanding (opening) balance mints a Customer/Supplier Payment;
 * each invoice mints a Sale/Purchase Payment that names it.
 *
 * `room` always comes from the server. Recomputing it here would disagree with
 * the backend whenever a pending cheque is involved, and the write would 400.
 */
function RecordPaymentDialog({ party, partyId, partyName, open, setOpen, onRecorded }) {
  const { token } = useAuth();
  const isSupplier = party === "supplier";

  const [items, setItems] = useState([]);
  const [picked, setPicked] = useState({});
  const [order, setOrder] = useState("oldest");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayForInput());
  const [accounts, setAccounts] = useState([]);
  const [account, setAccount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [chequeNumber, setChequeNumber] = useState("");
  const [chequeDueDate, setChequeDueDate] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [image, setImage] = useState(null);
  const [saving, setSaving] = useState(false);

  const key = (item) => `${item.kind}:${item.id}`;

  const resetForm = () => {
    setPicked({});
    setAmount("");
    setReference("");
    setNotes("");
    setImage(null);
    setChequeNumber("");
    setChequeDueDate("");
    setOrder("oldest");
  };

  useEffect(() => {
    if (!open || !token || !partyId) return;

    const fetchItems = async () => {
      try {
        const res = await getSettleableItems(token, {
          customerId: isSupplier ? null : partyId,
          supplierId: isSupplier ? partyId : null,
        });
        if (res) {
          setItems(res.items || []);
        } else {
          toast.error("Failed to fetch what this payment can settle.");
        }
      } catch (error) {
        console.log("Error fetching settleable items:", error);
        toast.error("Failed to fetch what this payment can settle.");
      }
    };

    const fetchAccounts = async () => {
      try {
        const res = await moneyAccountsAPIPackage.list(token, "?is_active=true");
        if (res) {
          setAccounts(res);
          const fallback = res.find((item) => item.is_default) || res[0];
          if (fallback) {
            setAccount(String(fallback.id));
            // The default account may not allow 'cash', so the method has to
            // follow it on arrival too - otherwise the hidden input could
            // submit a method the account cannot use.
            const allowed = methodsForAccount(fallback);
            if (!allowed.includes("cash")) setPaymentMethod(allowed[0]);
          }
        } else {
          toast.error("Failed to fetch accounts.");
        }
      } catch (error) {
        console.log("Error fetching accounts:", error);
        toast.error("Failed to fetch accounts.");
      }
    };

    resetForm();
    fetchItems();
    fetchAccounts();
  }, [open, token, partyId, isSupplier]);

  const selectedAccount = accounts.find(
    (item) => String(item.id) === String(account),
  );
  const allowedMethods = methodsForAccount(selectedAccount, paymentMethod);

  // Cash and wallet accounts admit exactly one method, so there is nothing to
  // choose: the input is hidden and Account takes the whole row. Only a bank
  // account has a real choice (transfer or cheque).
  const methodIsFixed = allowedMethods.length <= 1;

  // Keep the method legal for the chosen account, but only on a real account
  // change - never silently while the dialog is being set up.
  const onAccountChange = (value) => {
    setAccount(value);
    const next = accounts.find((item) => String(item.id) === String(value));
    const allowed = methodsForAccount(next);
    if (!allowed.includes(paymentMethod)) setPaymentMethod(allowed[0]);
  };

  const isCheque = paymentMethod === "cheque";

  /**
   * The allocation, recomputed on every keystroke. Mirrors
   * accounts/payments.py::allocate exactly - same order, same fill-to-room,
   * same whole rupees - so the preview and the write agree.
   */
  const allocation = useMemo(() => {
    const ordered = order === "newest" ? [...items].reverse() : items;
    const entered = Math.max(Math.floor(Number(amount) || 0), 0);
    let left = entered;

    const rows = ordered.map((item) => {
      const checked = !!picked[key(item)];
      let applied = 0;
      if (checked && left > 0) {
        applied = Math.min(left, item.room);
        left -= applied;
      }
      return { item, checked, applied };
    });

    return { rows, entered, left, allocated: entered - left };
  }, [items, picked, amount, order]);

  const anyPicked = allocation.rows.some((row) => row.checked);
  const unreached = allocation.rows.some((row) => row.checked && row.applied === 0);

  // Decided: an item the money cannot reach is not a valid selection, so an
  // UNTICKED row is disabled once everything is allocated. A ticked row always
  // stays clickable - unticking is how the user frees money up again.
  const exhausted = allocation.entered > 0 && allocation.left === 0;

  const records = allocation.rows
    .filter((row) => row.applied > 0)
    .map((row) => {
      const full = row.applied >= row.item.room;
      if (row.item.kind === "opening_balance") {
        return {
          type: isSupplier ? "Supplier Payment" : "Customer Payment",
          target: "Against outstanding balance",
          amount: row.applied,
        };
      }
      return {
        type: isSupplier ? "Purchase Payment" : "Sale Payment",
        target: `${row.item.label} · ${full ? settleWord(isCheque, chequeDueDate, true) : "partial"}`,
        amount: row.applied,
      };
    });

  const chequeMissing = isCheque && chequeNumber.trim() === "";
  const cannotRecord =
    saving ||
    allocation.entered <= 0 ||
    !anyPicked ||
    allocation.left > 0 ||
    unreached ||
    chequeMissing ||
    !account;

  let hint = "";
  if (allocation.entered > 0 && !anyPicked) {
    hint = "Tick at least one item to apply this payment to.";
  } else if (allocation.left > 0 && anyPicked) {
    hint = `PKR ${allocation.left.toLocaleString()} is not applied to anything. Tick another item or lower the amount.`;
  } else if (unreached) {
    hint = "The amount ran out before every ticked item was reached. Untick the ones it cannot cover.";
  } else if (chequeMissing) {
    hint = "A cheque payment needs a cheque number.";
  }

  const onSubmit = async () => {
    const chosen = allocation.rows
      .filter((row) => row.checked)
      .map((row) => ({ kind: row.item.kind, id: row.item.id }));

    const formData = new FormData();
    formData.append(isSupplier ? "supplier" : "customer", partyId);
    formData.append("amount", String(allocation.entered));
    formData.append("items", JSON.stringify(chosen));
    formData.append("order", order);
    formData.append("account", account);
    formData.append("date", date);
    formData.append("payment_method", paymentMethod);
    if (reference) formData.append("reference", reference);
    if (notes) formData.append("notes", notes);
    if (image) formData.append("image", image);
    if (isCheque) {
      formData.append("cheque_number", chequeNumber);
      if (chequeDueDate) formData.append("cheque_due_date", chequeDueDate);
    }

    setSaving(true);
    try {
      const { ok, data, error } = await recordPartyPayment(token, formData);
      if (ok) {
        toast.success(
          data.length === 1
            ? "Payment recorded."
            : `${data.length} payments recorded.`,
        );
        setOpen(false);
        if (onRecorded) onRecorded();
      } else {
        toast.error(error);
      }
    } catch (error) {
      console.log("Error recording payment:", error);
      toast.error("Failed to record the payment.");
    } finally {
      setSaving(false);
    }
  };

  const segment = (value, label) => (
    <button
      type="button"
      aria-pressed={order === value}
      onClick={() => setOrder(value)}
      className={`h-7 rounded px-2.5 text-xs font-medium transition-colors ${
        order === value
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground"
      }`}
    >
      {label}
    </button>
  );

  return (
    <DialogUI.Dialog open={open} onOpenChange={setOpen}>
      <DialogUI.DialogContent className="sm:max-w-[880px]">
        <DialogUI.DialogHeader>
          <DialogUI.DialogTitle>Record Payment</DialogUI.DialogTitle>
          <DialogUI.DialogDescription>
            {isSupplier
              ? `Enter what you paid ${partyName}, then tick what it settles.`
              : `Enter what ${partyName} paid, then tick what it settles.`}{" "}
            The amount is applied to the ticked items in the order you choose.
          </DialogUI.DialogDescription>
        </DialogUI.DialogHeader>

        <div className="grid grid-cols-2 gap-6">
          {/* LEFT: the amount and what it is applied to */}
          <div className="flex flex-col gap-4 min-w-0">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="pay-amount">
                  {isSupplier ? "Amount paid (PKR)" : "Amount received (PKR)"}
                </Label>
                <Input
                  id="pay-amount"
                  type="number"
                  min="0"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pay-date">Date</Label>
                <Input
                  id="pay-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-md bg-muted px-4 py-3">
              <div className="space-y-0.5">
                <div className="text-xs text-muted-foreground">Entered</div>
                <div className="text-sm font-semibold">
                  {formatCurrency(allocation.entered)}
                </div>
              </div>
              <div className="space-y-0.5">
                <div className="text-xs text-muted-foreground">Allocated</div>
                <div className="text-sm font-semibold">
                  {formatCurrency(allocation.allocated)}
                </div>
              </div>
              <div className="space-y-0.5">
                <div className="text-xs text-muted-foreground">Unallocated</div>
                <div
                  className={`text-sm font-semibold ${
                    allocation.left > 0 ? "text-red-700" : ""
                  }`}
                >
                  {formatCurrency(allocation.left)}
                </div>
              </div>
            </div>

            <div className="flex flex-1 min-h-0 flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Apply to</span>
                <div
                  role="group"
                  aria-label="Allocation order"
                  className="inline-flex gap-0.5 rounded-md bg-muted p-0.5"
                >
                  {segment("oldest", "Oldest first")}
                  {segment("newest", "Newest first")}
                </div>
              </div>

              <div className="flex max-h-[220px] min-h-[184px] flex-col gap-2 overflow-y-auto">
                {allocation.rows.length === 0 && (
                  <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                    Nothing is outstanding for {partyName}.
                  </p>
                )}

                {allocation.rows.map((row) => {
                  const disabled = !row.checked && exhausted;
                  return (
                    <label
                      key={key(row.item)}
                      className={`flex min-h-[56px] items-center gap-3 rounded-md border px-3 py-2.5 ${
                        row.checked ? "border-primary bg-card" : "bg-background"
                      } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 shrink-0 accent-primary"
                        checked={row.checked}
                        disabled={disabled}
                        onChange={() =>
                          setPicked((prev) => ({
                            ...prev,
                            [key(row.item)]: !row.checked,
                          }))
                        }
                      />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-sm font-medium">{row.item.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {row.item.sub || row.item.date}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-0.5">
                        <span className="text-sm font-semibold">
                          {formatCurrency(row.item.room)}
                        </span>
                        <span className={`text-xs font-medium ${statusColor(row)}`}>
                          {rowStatus(row, isCheque, chequeDueDate)}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT: the details, then what the system will create */}
          <div className="flex flex-col gap-4 min-w-0">
            <div
              className={`grid gap-4 ${
                methodIsFixed ? "grid-cols-1" : "grid-cols-2"
              }`}
            >
              <div className="space-y-1">
                <Label>Account</Label>
                <Select value={account} onValueChange={onAccountChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((item) => (
                      <SelectItem value={String(item.id)} key={item.id}>
                        {formatAccountOption(item)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!methodIsFixed && (
                <div className="space-y-1">
                  <Label>Payment method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      {allowedMethods.map((method) => (
                        <SelectItem value={method} key={method}>
                          {PaymentMethodMap[method] || method}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {isCheque && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="pay-cheque-no">Cheque no.</Label>
                  <Input
                    id="pay-cheque-no"
                    value={chequeNumber}
                    onChange={(e) => setChequeNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pay-cheque-due">Due date</Label>
                  <Input
                    id="pay-cheque-due"
                    type="date"
                    value={chequeDueDate}
                    onChange={(e) => setChequeDueDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="pay-ref">
                Reference{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="pay-ref"
                placeholder="Slip number, wallet transaction ID, etc."
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="pay-image">
                {isCheque ? "Cheque image" : "Receipt image"}{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <label
                htmlFor="pay-image"
                className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 text-sm text-muted-foreground"
              >
                <Upload className="h-4 w-4" />
                <span className="font-medium text-foreground">
                  {image ? image.name : "Upload image"}
                </span>
                {!image && <span>· PNG or JPG</span>}
              </label>
              <input
                id="pay-image"
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={(e) => setImage(e.target.files?.[0] || null)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="pay-note">
                Note{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="pay-note"
                rows={2}
                className="resize-none"
                placeholder="Anything worth remembering about this payment"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="mt-auto space-y-2 rounded-md border bg-card px-4 py-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium">Will be recorded as</span>
                <span className="text-xs text-muted-foreground">
                  {records.length === 1 ? "1 payment" : `${records.length} payments`}
                </span>
              </div>
              {records.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Enter an amount and tick at least one item.
                </p>
              ) : (
                records.map((record, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-3 border-t pt-2"
                  >
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-sm">{record.type}</span>
                      <span className="text-xs text-muted-foreground">
                        {record.target}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold">
                      {formatCurrency(record.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Laid out explicitly rather than through DialogFooter: its
            `flex-col-reverse` and `space-x-2` defaults would fight a `flex-row`
            / `space-x-0` override at equal specificity, and which one won would
            depend on the order Tailwind happened to emit them in. */}
        <div
          className={`flex flex-row items-center gap-3 ${
            hint ? "justify-between" : "justify-end"
          }`}
        >
          {hint && (
            <div
              role="status"
              className="flex min-w-0 items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-left text-[13px] leading-5 text-red-700"
            >
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{hint}</span>
            </div>
          )}
          {/* The two buttons are one group, so space-between puts the message
              hard left and the pair hard right. Three loose children would
              distribute the free space BETWEEN them and strand Cancel in the
              middle of the row. */}
          <div className="flex shrink-0 items-center gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton
              disabled={cannotRecord}
              pending={saving}
              pendingLabel="Recording…"
              onClick={onSubmit}
            >
              Record payment
            </SubmitButton>
          </div>
        </div>
      </DialogUI.DialogContent>
    </DialogUI.Dialog>
  );
}

/**
 * A cheque reserves an invoice's room but settles nothing until it clears -
 * amount_paid skips any transaction whose status is not 'C'. So a cheque row
 * says "Reserved", never "Settled".
 */
function settleWord(isCheque, dueDate, short = false) {
  if (!isCheque) return short ? "settles in full" : "Settled in full";
  if (short) return dueDate ? `reserved until ${dueDate}` : "reserved";
  return dueDate ? `Reserved · clears ${dueDate}` : "Reserved · awaiting clearance";
}

function rowStatus(row, isCheque, chequeDueDate) {
  if (!row.checked) return "Not selected";
  if (row.applied === 0) return "Nothing left to apply";
  if (row.applied >= row.item.room) return settleWord(isCheque, chequeDueDate);
  const left = row.item.room - row.applied;
  return `Partial · ${row.applied.toLocaleString()} · ${left.toLocaleString()} left`;
}

function statusColor(row) {
  if (!row.checked) return "text-muted-foreground";
  // Error: this row was ticked and the money never reached it, which blocks
  // Record. A partial settlement is a caution, not an error - it is a
  // perfectly valid thing to record - so the two keep different colours.
  if (row.applied === 0) return "text-red-700";
  if (row.applied >= row.item.room) return "text-emerald-700";
  return "text-amber-700";
}

export default RecordPaymentDialog;
