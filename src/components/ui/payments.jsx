import { useState, useEffect } from "react";
import * as DialogUI from "@/components/ui/dialog";
import { SubmitButton } from "@/components/ui/submit-button";
import { Spinner } from "@/components/ui/spinner";
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
import { ImageIcon, Trash2, Undo2 } from "lucide-react";
import { RowAction } from "@/components/invoice/InvoiceItemsTable";
import { toast } from "sonner";
import { useAuth } from "../../../services/AuthProvider";
import {
  getPaymentsList,
  getInvoiceSettlement,
  createPayment,
  deletePayment,
  paymentRequestBody,
  moneyAccountsAPIPackage,
} from "../../../services/api";
import {
  AccountTypeMap,
  formatAccountOption,
  AccountTypePaymentMethodMap,
  TransactionStatusMap,
  getTransactionStatusColor,
  todayForInput,
  formatDate,
  getImageUrl,
} from "../../../services/utils";

// What an update screen holds until Update Invoice: payments to add, saved
// payments to delete (the rows, not just their ids, so the page can count
// what they paid), and the ids of automatic refunds to delete.
export const EMPTY_PENDING_PAYMENTS = { adds: [], deletes: [], refundDeletes: [] };

const isHeldForDeletion = (pending, paymentId) =>
  pending.deletes.some((row) => row.id === paymentId);

// Below this, two money figures are equal: totals are floats.
const EPSILON = 0.005;

/**
 * An invoice's payments. Three modes, by what the page passes:
 *
 *  - staged (a create screen: no invoiceId, onStagedChange): the payments are
 *    held by the page and sent once the invoice exists.
 *  - deferred (an update screen: invoiceId and onPendingChange): the invoice
 *    exists, but nothing here reaches the server until Update Invoice - not an
 *    added payment, not a deleted one, not a deleted refund. The figures work
 *    from the page's live total, so an edit the page has not saved yet shows
 *    here at once and payments can be added against it.
 *  - live (only invoiceId): every action is saved as it is made.
 */
function Payments({
  invoiceId,
  invoiceTotal,
  isSalesPayment,
  open,
  setOpen,
  onPaymentsChanged,
  stagedPayments = [],
  onStagedChange,
  pending = EMPTY_PENDING_PAYMENTS,
  onPendingChange,
  // Whether the invoice as edited bills its total. A draft or a cancelled
  // invoice bills nothing - for a sale that is one with no lines, for a
  // purchase the status picked - and the refund preview compares against it.
  billsTotal = true,
  // The backlog entry screens. A data entry account cannot reach the money
  // accounts or an invoice's payments directly, so the page hands in how to
  // read the accounts (its name-only lookup) and, once the invoice exists,
  // how to list, add and remove its payments (the backlog work endpoints).
  // With these the dialog shows the money fields whatever the user's own
  // permissions say, and settles nothing from the khaata. liveApi.create and
  // .remove answer { ok, error }, so the server's reason - "this invoice can
  // take at most PKR ... more", say - reaches the screen.
  accountsLoader = null,
  liveApi = null,
}) {
  const { token, getPermissions } = useAuth();
  const isStaged = !invoiceId && typeof onStagedChange === "function";
  const isDeferred = !!invoiceId && typeof onPendingChange === "function";
  const [payments, setPayments] = useState([]);
  // What the party's khaata settles onto this invoice (credit notes,
  // on-account money), plus the server's own paid / still-owed / room figures.
  // null until it arrives, or if the request fails.
  const [settlement, setSettlement] = useState(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  // A photo of the slip, the cheque or the handwritten receipt. One per
  // payment, stored on the transaction the receipt is mirrored into.
  const [imageFile, setImageFile] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [account, setAccount] = useState("");
  const [chequeNumber, setChequeNumber] = useState("");
  const [chequeDueDate, setChequeDueDate] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    todayForInput()
  );
  const hasAccounting = !!accountsLoader || !!getPermissions("accounting")?.["view"];

  // The method follows the account, so there is nothing for the user to pick.
  // A bank account is a transfer unless cheque details are filled in.
  const selectedAccount = accounts.find(
    (item) => String(item.id) === String(account)
  );
  const isBankAccount = selectedAccount?.type === "bank";
  const hasChequeNumber = chequeNumber.trim() !== "";
  const hasChequeDueDate = chequeDueDate !== "";
  const isCheque = isBankAccount && hasChequeNumber && hasChequeDueDate;

  // A cheque needs both details, so one on its own is not a valid payment.
  const chequeIncomplete =
    isBankAccount && hasChequeNumber !== hasChequeDueDate;

  const paymentMethod = isCheque
    ? "cheque"
    : AccountTypePaymentMethodMap[selectedAccount?.type] || "cash";

  const handleAccountChange = (value) => {
    setAccount(value);
    const nextAccount = accounts.find(
      (item) => String(item.id) === String(value)
    );
    if (nextAccount?.type !== "bank") {
      setChequeNumber("");
      setChequeDueDate("");
    }
  };

  const fetchPayments = async () => {
    try {
      const [data, settled] = liveApi
        ? [await liveApi.list(), null]
        : await Promise.all([
          getPaymentsList(token, invoiceId, isSalesPayment),
          getInvoiceSettlement(token, invoiceId, isSalesPayment),
        ]);
      if (data) {
        setPayments(data)
      } else {
        toast.error("Failed to fetch payments.")
      }
      setSettlement(settled);
    } catch (error) {
      console.log("Error fetching payments:", error)
      toast.error("Failed to fetch payments.")
    }
  }

  const fetchAccounts = async () => {
    try {
      // Deactivated accounts take no new money.
      const data = accountsLoader
        ? await accountsLoader()
        : await moneyAccountsAPIPackage.list(token, "?is_active=true");
      if (data) {
        setAccounts(data);
        const defaultAccount = data.find((item) => item.is_default);
        if (defaultAccount) setAccount(String(defaultAccount.id));
      }
    } catch (error) {
      console.log("Error fetching money accounts:", error);
    }
  }

  useEffect(() => {
    if (!open) return;
    if (invoiceId) fetchPayments();
    // Outside the invoiceId check: a staged payment still needs an account.
    if (hasAccounting) fetchAccounts();
  }, [open, invoiceId]);

  const resetForm = () => {
    setAmount("");
    setDescription("");
    setImageFile(null);
    setChequeNumber("");
    setChequeDueDate("");
    setPaymentDate(todayForInput());
  };

  // Recording a payment and removing one both mutate money, and

  // both buttons stayed live through the request.

  const [saving, setSaving] = useState(false);

  const [removingId, setRemovingId] = useState(null);

  const handleCreate = async () => {
    setSaving(true);
    try {
      if (!amount) return toast.error("Amount is required.");
      if (chequeIncomplete) {
        return toast.error("A cheque needs both a number and a due date.");
      }
      try {
        const payload = {
          amount: parseFloat(amount),
          desc: description,
        };

        // Money details only mean something once accounting is enabled.
        if (hasAccounting) {
          if (account) payload.account = Number(account);
          payload.payment_method = paymentMethod;
          payload.date = paymentDate;

          if (isCheque) {
            payload.cheque_number = chequeNumber;
            payload.cheque_due_date = chequeDueDate;
          }
        }

        if (isStaged || isDeferred) {
          // Shaped like a row from the API, so the list below renders it as
          // it is; `fields` and `imageFile` are what gets sent later
          // (attachStagedToInvoice).
          const held = {
            id: `staged-${Date.now()}-${(isStaged ? stagedPayments : pending.adds).length}`,
            fields: payload,
            imageFile,
            imagePreview: imageFile ? URL.createObjectURL(imageFile) : null,
            amount: payload.amount,
            desc: payload.desc,
            // A cheque stays pending once recorded, exactly as the server
            // will mark it, so it does not count towards "Paid".
            status: isCheque ? "PEN" : "C",
            account: hasAccounting && selectedAccount
              ? { name: selectedAccount.name, type: selectedAccount.type }
              : null,
            date: paymentDate,
          };
          if (isStaged) {
            onStagedChange([...stagedPayments, held]);
            toast.success("Payment added. It is recorded when the invoice is created.");
          } else {
            onPendingChange({ ...pending, adds: [...pending.adds, held] });
            toast.success("Payment added. It is recorded when you update the invoice.");
          }
          resetForm();
          return;
        }

        // paymentRequestBody sends a plain object, or FormData when a photo
        // comes with it - the same builder the staged payments go through.
        const body = paymentRequestBody(payload, imageFile);
        const result = liveApi
          ? await liveApi.create(body)
          : { ok: await createPayment(token, invoiceId, isSalesPayment, body), error: null };
        if (result.ok) {
          toast.success("Payment created successfully!");
          resetForm();
          fetchPayments();
          // Payment status is derived server-side — let the invoice refresh.
          if (onPaymentsChanged) onPaymentsChanged();
        } else {
          toast.error(result.error || "Failed to create payment.");
        }
      } catch (error) {
        console.log("Error creating payment:", error);
        toast.error("Failed to create payment.");
      }
  
    } finally {
      setSaving(false);
    }
  };

  // The list this dialog shows. On an update screen it is the saved payments,
  // each marked if it is held for deletion, then the payments held to add.
  const rows = isStaged
    ? stagedPayments
    : isDeferred
      ? [
          ...payments.map((p) => ({ ...p, removing: isHeldForDeletion(pending, p.id) })),
          ...pending.adds.map((p) => ({ ...p, held: true })),
        ]
      : payments;
  // What is counted: everything listed except what is about to be deleted.
  const counted = rows.filter((p) => !p.removing);
  const clearedSum = (list) => list
    .filter((p) => !p.status || p.status === "C")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  // A cleared or pending payment holds its share of the invoice, but only
  // cleared money pays it down. A bounced one never arrives, so it frees its
  // share up and the amount can be paid again.
  const totalRecorded = counted
    .filter((p) => p.status !== "B")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const totalCleared = clearedSum(counted);
  const typedAmount = parseFloat(amount) || 0;

  let isPaidInFull, isFullyRecorded, exceedsRoom, balance;
  let projectedRefund = 0;

  if (isDeferred) {
    // The page's live total, not the server's: the edit the page is showing
    // is the one these payments will be recorded against. What the khaata
    // settles onto the invoice still comes from the server, as only it can
    // work that out.
    const total = Number(invoiceTotal) || 0;
    const pool = Number(settlement?.settled_from_khaata) || 0;
    const paid = totalCleared + pool;
    const room = Math.max(total - totalRecorded - pool, 0);
    isPaidInFull = total > 0 && paid >= total - EPSILON;
    isFullyRecorded = total > 0 && room <= EPSILON;
    exceedsRoom = typedAmount > room + EPSILON;
    balance = { total, paid, still_owed: Math.max(total - paid, 0) };

    // The refund Update will record (refund_new_overpayment). Worked out the
    // way the server will: held deletions are applied before the update and
    // held payments attached after it, so only the saved, cleared payments
    // that survive count, and the saved bill is compared with the edited one.
    if (settlement) {
      const surviving = clearedSum(payments.filter((p) => !isHeldForDeletion(pending, p.id)));
      const billedBefore = Number(settlement.billed) || 0;
      const billedAfter = billsTotal ? total : 0;
      projectedRefund = Math.round(
        Math.max(surviving - billedAfter, 0) - Math.max(surviving - billedBefore, 0));
      if (projectedRefund < 1) projectedRefund = 0;
    }
  } else {
    // The khaata can settle part or all of the invoice too (credit notes,
    // money on account), and only the server knows how much. When its figures
    // are in, they decide; the local sums are the fallback if that request
    // failed. Otherwise an invoice the khaata already covers would still offer
    // "Create Payment" and the server would refuse the amount.
    isPaidInFull = settlement
      ? settlement.total > 0 && settlement.paid >= settlement.total
      : invoiceTotal > 0 && totalCleared >= invoiceTotal;
    isFullyRecorded = settlement
      ? settlement.room <= 0
      : invoiceTotal > 0 && totalRecorded >= invoiceTotal;
    exceedsRoom = settlement
      ? typedAmount > settlement.room
      : totalRecorded + typedAmount > invoiceTotal;

    // The line at the foot of the dialog. The server's figures when there is
    // an invoice; while payments are held on a create screen, the same three
    // worked out here - only cleared money counts as paid, as it will on the
    // server.
    balance = settlement
      ? settlement
      : isStaged
        ? {
            total: invoiceTotal || 0,
            paid: totalCleared,
            still_owed: Math.max((invoiceTotal || 0) - totalCleared, 0),
          }
        : null;
  }

  const settledBy = settlement?.settled_by || [];
  const refunds = (settlement?.refunds || []).map((r) => ({
    ...r, removing: pending.refundDeletes.includes(r.id),
  }));

  // Deleting or restoring a refund is held for Update, like everything else
  // on an update screen.
  const toggleRefund = (refundId) => {
    if (!isDeferred) return;
    const held = pending.refundDeletes.includes(refundId);
    onPendingChange({
      ...pending,
      refundDeletes: held
        ? pending.refundDeletes.filter((id) => id !== refundId)
        : [...pending.refundDeletes, refundId],
    });
  };

  const handleDelete = async (paymentId) => {
    if (isDeferred) {
      const held = pending.adds.find((p) => p.id === paymentId);
      if (held) {
        // Never saved, so it simply goes.
        if (held.imagePreview) URL.revokeObjectURL(held.imagePreview);
        onPendingChange({ ...pending, adds: pending.adds.filter((p) => p.id !== paymentId) });
        return;
      }
      // A saved payment is marked, and deleted when the invoice is updated.
      // Pressing again restores it.
      const saved = payments.find((p) => p.id === paymentId);
      onPendingChange({
        ...pending,
        deletes: isHeldForDeletion(pending, paymentId)
          ? pending.deletes.filter((row) => row.id !== paymentId)
          : [...pending.deletes, { id: saved.id, amount: saved.amount, status: saved.status }],
      });
      return;
    }

    if (isStaged) {
      const removed = stagedPayments.find((p) => p.id === paymentId);
      if (removed?.imagePreview) URL.revokeObjectURL(removed.imagePreview);
      onStagedChange(stagedPayments.filter((p) => p.id !== paymentId));
      return;
    }

    setRemovingId(paymentId);
    try {
      try {
        const result = liveApi
          ? await liveApi.remove(paymentId)
          : { ok: await deletePayment(token, invoiceId, isSalesPayment, paymentId), error: null };
        if (result.ok) {
          toast.success("Payment deleted.");
          fetchPayments();
          if (onPaymentsChanged) onPaymentsChanged();
        } else {
          toast.error(result.error || "Failed to delete payment.");
        }
      } catch (error) {
        console.log("Error deleting payment:", error);
        toast.error("Failed to delete payment.");
      }
  
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <DialogUI.Dialog open={!!open} onOpenChange={(val) => { setOpen(val); if (!val) resetForm(); }}>
      {/* Held to the screen: the header, the form and the balance line stay
          put, and only the rows between them scroll. */}
      <DialogUI.DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogUI.DialogHeader className="shrink-0">
          <DialogUI.DialogTitle>Payments</DialogUI.DialogTitle>
          {isStaged && (
            <DialogUI.DialogDescription>
              Recorded against the invoice once it is created.
            </DialogUI.DialogDescription>
          )}
          {isDeferred && (
            <DialogUI.DialogDescription>
              Changes here are saved when you update the invoice.
            </DialogUI.DialogDescription>
          )}
        </DialogUI.DialogHeader>

        <div className="flex shrink-0 flex-col gap-4">
          <div className="space-y-1">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
            />
          </div>

          {hasAccounting && (
            <>
              <div className="flex gap-4">
                <div className="flex-1 space-y-1">
                  <Label>Account</Label>
                  <Select value={account} onValueChange={handleAccountChange}>
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

                <div className="flex-1 space-y-1">
                  <Label htmlFor="payment_date">Date</Label>
                  <Input
                    id="payment_date"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Cheque details turn a bank payment into a cheque. */}
              {isBankAccount && (
                <div className="space-y-1">
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="cheque_number">Cheque No.</Label>
                      <Input
                        id="cheque_number"
                        type="text"
                        value={chequeNumber}
                        onChange={(e) => setChequeNumber(e.target.value)}
                        placeholder="Leave empty for a bank transfer"
                      />
                    </div>

                    <div className="flex-1 space-y-1">
                      <Label htmlFor="cheque_due_date">Cheque Due Date</Label>
                      <Input
                        id="cheque_due_date"
                        type="date"
                        value={chequeDueDate}
                        onChange={(e) => setChequeDueDate(e.target.value)}
                      />
                    </div>
                  </div>

                  {chequeIncomplete ? (
                    <p className="text-xs text-red-600">
                      A cheque needs both a number and a due date. Fill in both, or
                      clear both to record a bank transfer.
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {isCheque
                        ? "Recorded as a cheque. It stays pending and affects no balance until you mark it cleared."
                        : "Recorded as a bank transfer. Add cheque details to record a cheque instead."}
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          <div className="space-y-1">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description"
              rows={3}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="payment-image">Photo</Label>
            <input
              id="payment-image"
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium"
            />
            <p className="text-xs text-muted-foreground">
              Optional. A photo of the slip, the cheque or the receipt.
            </p>
          </div>

          <SubmitButton
            type="button"
            pending={saving}
            pendingLabel="Recording…"
            onClick={handleCreate}
            className={`w-full ${isPaidInFull ? "bg-green-600 text-white hover:bg-green-600" : ""}`}
            disabled={
              isFullyRecorded ||
              chequeIncomplete ||
              exceedsRoom
            }
          >
            {isPaidInFull
              ? "Paid in full"
              : isFullyRecorded
                ? "Awaiting clearance"
                : isStaged || isDeferred ? "Add Payment" : "Create Payment"}
          </SubmitButton>
        </div>

        {/* Payments, refunds and khaata rows scroll here, scrollbar hidden.
            The px/py inset keeps the delete buttons' focus rings from being
            clipped at the edge. */}
        <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto no-scrollbar px-1 py-1">
          <div className="flex flex-col gap-1">
            {rows.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {isStaged || isDeferred ? "No payments added yet." : "No payments recorded."}
              </p>
            )}
            {rows.map((payment) => {
              // getImageUrl leaves a presigned S3 link alone and puts the host in
              // front of a local /media/... path; a held payment's photo is a
              // blob: URL, which it would break, so that one is used as it is.
              const imageSrc = payment.imagePreview || (payment.image ? getImageUrl(payment.image) : null);
              return (
                <div key={payment.id} className="flex items-center gap-2">
                  {/* Held for deletion: struck through until Update, and the
                      button beside it restores it. */}
                  <div className={`flex flex-1 min-w-0 items-center gap-3 rounded-lg border border-border px-2 py-1.5 ${payment.removing ? "opacity-60" : ""}`}>
                    <div className={`flex-1 min-w-0 truncate font-medium ${payment.removing ? "line-through" : ""}`}>
                      PKR {Number(payment.amount).toLocaleString()}
                      {payment.desc && <span className="text-muted-foreground font-normal"> · {payment.desc}</span>}
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-muted-foreground text-sm">
                      {(payment.held || payment.removing) && (
                        <span className="text-xs font-medium text-yellow-700">
                          {payment.removing ? "Deleted on update" : "Not saved yet"}
                        </span>
                      )}
                      {/* First in the group: image, then date, then account. */}
                      {imageSrc && (
                        <a
                          href={imageSrc}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <ImageIcon className="h-3.5 w-3.5" />
                          Image
                        </a>
                      )}
                      {payment.status && payment.status !== "C" && (
                        <span
                          className={`px-2 py-0.25 rounded-full text-xs font-medium whitespace-nowrap ${getTransactionStatusColor(payment.status)}`}
                        >
                          {TransactionStatusMap[payment.status] || payment.status}
                        </span>
                      )}
                      {/* The day the money moved, not the day the row was typed.
                          formatDate reads it in the business timezone, the way
                          the khaata rows below already do. */}
                      <span>{formatDate(payment.date || payment.created_at)}</span>
                      {payment.account && (
                        <span>
                          {payment.account.name} ({AccountTypeMap[payment.account.type] || payment.account.type})
                        </span>
                      )}
                    </div>
                  </div>
                  {/* The same delete control as the invoice item rows. Keyed to
                      the row, not a single flag: removing one payment must not
                      spin every other row's button. */}
                  <RowAction
                    label={payment.removing ? "Keep payment" : "Remove payment"}
                    tone={payment.removing ? "primary" : "danger"}
                    onClick={() => handleDelete(payment.id)}
                    disabled={removingId === payment.id}
                  >
                    {removingId === payment.id
                      ? <Spinner size={16} />
                      : payment.removing ? <Undo2 className="h-5 w-5" /> : <Trash2 className="h-5 w-5" />}
                  </RowAction>
                </div>
              );
            })}
          </div>

          {/* Refunds: the ones Update has recorded for this invoice, and the
              one the edit the page is showing will record. A deleted refund
              leaves the excess on the party's khaata as their credit. */}
          {(refunds.length > 0 || projectedRefund > 0) && (
            <div className="flex flex-col gap-1">
              <div className="text-sm font-medium">Refunds</div>
              {refunds.map((refund) => (
                <div key={refund.id} className="flex items-center gap-2">
                  <div className={`flex flex-1 min-w-0 items-center gap-3 rounded-lg border border-border px-2 py-1.5 ${refund.removing ? "opacity-60" : ""}`}>
                    <div className={`flex-1 min-w-0 truncate font-medium ${refund.removing ? "line-through" : ""}`}>
                      PKR {Number(refund.amount).toLocaleString()}
                      <span className="text-muted-foreground font-normal"> · Refund</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-muted-foreground text-sm">
                      {refund.removing && (
                        <span className="text-xs font-medium text-yellow-700">Deleted on update</span>
                      )}
                      <span>{formatDate(refund.date)}</span>
                      {refund.account && (
                        <span>
                          {refund.account.name} ({AccountTypeMap[refund.account.type] || refund.account.type})
                        </span>
                      )}
                    </div>
                  </div>
                  {isDeferred && (
                    <RowAction
                      label={refund.removing ? "Keep refund" : "Remove refund"}
                      tone={refund.removing ? "primary" : "danger"}
                      onClick={() => toggleRefund(refund.id)}
                    >
                      {refund.removing ? <Undo2 className="h-5 w-5" /> : <Trash2 className="h-5 w-5" />}
                    </RowAction>
                  )}
                </div>
              ))}
              {projectedRefund > 0 && (
                <div className="rounded-lg flex justify-between gap-3 px-2 py-1.5 border border-dashed border-border">
                  <div className="font-medium">
                    PKR {projectedRefund.toLocaleString()}
                    <span className="text-muted-foreground font-normal"> · Refund</span>
                  </div>
                  <span className="text-xs font-medium text-yellow-700 self-center">
                    Recorded when you update the invoice
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Settled from the party's khaata, oldest debt first. Read-only:
              these are worked out, not stored, so they change by editing or
              deleting the note or payment in Transactions. */}
          {settledBy.length > 0 && (
            <div className="flex flex-col gap-1">
              <div className="text-sm font-medium">Settled from khaata</div>
              {settledBy.map((row, index) => (
                <div
                  key={`${row.kind}-${row.id}-${index}`}
                  className="rounded-lg flex justify-between px-2 py-1 border border-dashed border-border"
                >
                  <div className="font-medium">
                    PKR {Number(row.applied).toLocaleString()}
                    <span className="text-muted-foreground font-normal">
                      {" "}· {row.label}{row.reference ? ` · ${row.reference}` : ""}
                    </span>
                  </div>
                  {row.date && (
                    <span className="text-muted-foreground text-sm">{formatDate(row.date)}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {balance && (
          <p className="shrink-0 text-sm text-muted-foreground">
            Total PKR {Number(balance.total).toLocaleString()} · Paid PKR{" "}
            {Number(balance.paid).toLocaleString()} ·{" "}
            <span className="font-medium text-foreground">
              Still owed PKR {Number(balance.still_owed).toLocaleString()}
            </span>
          </p>
        )}
      </DialogUI.DialogContent>
    </DialogUI.Dialog>
  );
}

export default Payments;