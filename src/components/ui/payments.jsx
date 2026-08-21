import { useState, useEffect } from "react";
import * as DialogUI from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { Trash } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../../services/AuthProvider";
import {
  getPaymentsList,
  createPayment,
  deletePayment,
  moneyAccountsAPIPackage,
} from "../../../services/api";
import {
  AccountTypeMap,
  formatAccountOption,
  AccountTypePaymentMethodMap,
  TransactionStatusMap,
  getTransactionStatusColor,
  todayForInput,
} from "../../../services/utils";

function Payments({ invoiceId, invoiceTotal, isSalesPayment, open, setOpen, onPaymentsChanged }) {
  const { token, getPermissions } = useAuth();
  const [payments, setPayments] = useState([]);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [account, setAccount] = useState("");
  const [chequeNumber, setChequeNumber] = useState("");
  const [chequeDueDate, setChequeDueDate] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    todayForInput()
  );
  const hasAccounting = !!getPermissions("accounting")?.["view"];

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
      const data = await getPaymentsList(token, invoiceId, isSalesPayment)
      if (data) {
        setPayments(data)
      } else {
        toast.error("Failed to fetch payments.")
      }
    } catch (error) {
      console.log("Error fetching payments:", error)
      toast.error("Failed to fetch payments.")
    }
  }

  const fetchAccounts = async () => {
    try {
      // Deactivated accounts take no new money.
      const data = await moneyAccountsAPIPackage.list(token, "?is_active=true");
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
    if (open && invoiceId) {
      fetchPayments();
      if (hasAccounting) fetchAccounts();
    }
  }, [open, invoiceId]);

  const resetForm = () => {
    setAmount("");
    setDescription("");
    setChequeNumber("");
    setChequeDueDate("");
    setPaymentDate(todayForInput());
  };

  const handleCreate = async () => {
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

      const success = await createPayment(token, invoiceId, isSalesPayment, payload);
      if (success) {
        toast.success("Payment created successfully!");
        resetForm();
        fetchPayments();
        // Payment status is derived server-side — let the invoice refresh.
        if (onPaymentsChanged) onPaymentsChanged();
      } else {
        toast.error("Failed to create payment.");
      }
    } catch (error) {
      console.log("Error creating payment:", error);
      toast.error("Failed to create payment.");
    }
  };

  // A cleared or pending payment holds its share of the invoice, but only
  // cleared money pays it down. A bounced one never arrives, so it frees its
  // share up and the amount can be paid again.
  const totalRecorded = payments
    .filter((p) => p.status !== "B")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const totalCleared = payments
    .filter((p) => !p.status || p.status === "C")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const isPaidInFull = invoiceTotal > 0 && totalCleared >= invoiceTotal;
  const isFullyRecorded = invoiceTotal > 0 && totalRecorded >= invoiceTotal;

  const handleDelete = async (paymentId) => {
    try {
      const success = await deletePayment(token, invoiceId, isSalesPayment, paymentId);
      if (success) {
        toast.success("Payment deleted.");
        fetchPayments();
        if (onPaymentsChanged) onPaymentsChanged();
      } else {
        toast.error("Failed to delete payment.");
      }
    } catch (error) {
      console.log("Error deleting payment:", error);
      toast.error("Failed to delete payment.");
    }
  };

  return (
    <DialogUI.Dialog open={!!open} onOpenChange={(val) => { setOpen(val); if (!val) resetForm(); }}>
      <DialogUI.DialogContent className="max-w-2xl">
        <DialogUI.DialogHeader>
          <DialogUI.DialogTitle>Payments</DialogUI.DialogTitle>
        </DialogUI.DialogHeader>

        <div className="flex flex-col gap-4">
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

          <Button
            type="button"
            onClick={handleCreate}
            className={`w-full ${isPaidInFull ? "bg-green-600 text-white hover:bg-green-600" : ""}`}
            disabled={
              isFullyRecorded ||
              chequeIncomplete ||
              totalRecorded + (parseFloat(amount) || 0) > invoiceTotal
            }
          >
            {isPaidInFull
              ? "Paid in full"
              : isFullyRecorded
                ? "Awaiting clearance"
                : "Create Payment"}
          </Button>
        </div>

        <div className="mt-2 flex flex-col gap-1">
          {payments.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No payments recorded.</p>
          )}
          {payments.map((payment) => (
            <div key={payment.id} className="flex items-center gap-2">
              <div className="bg-card rounded-lg flex flex-1 justify-between px-2 py-1 bg-transparent border border-border box-border">
                <div className="font-medium">PKR {Number(payment.amount).toLocaleString()}{payment.desc && <span className="text-muted-foreground font-normal"> · {payment.desc}</span>}</div>
                <div className="flex items-center gap-3 text-muted-foreground text-sm">
                  {payment.status && payment.status !== "C" && (
                    <span
                      className={`px-2 py-0.25 rounded-full text-xs font-medium whitespace-nowrap ${getTransactionStatusColor(payment.status)}`}
                    >
                      {TransactionStatusMap[payment.status] || payment.status}
                    </span>
                  )}
                  {payment.account && (
                    <span>
                      {payment.account.name} ({AccountTypeMap[payment.account.type] || payment.account.type})
                    </span>
                  )}
                  <span>{new Date(payment.created_at).toLocaleDateString("en-GB")}</span>
                </div>
              </div>
              <Button
                type="button"
                variant="unstyled"
                className="p-0 hover:text-red-500 h-[10px]"
                onClick={() => handleDelete(payment.id)}
              >
                <Trash cursor="pointer" />
              </Button>
            </div>
          ))}
        </div>
      </DialogUI.DialogContent>
    </DialogUI.Dialog>
  );
}

export default Payments;