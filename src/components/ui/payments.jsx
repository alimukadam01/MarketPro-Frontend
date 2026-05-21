import { useState, useEffect } from "react";
import * as DialogUI from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../../services/AuthProvider";
import {
  getPaymentsList,
  createPayment,
  deletePayment,
} from "../../../services/api";

function Payments({ invoiceId, invoiceTotal, isSalesPayment, open, setOpen }) {
  const { token } = useAuth();
  const [payments, setPayments] = useState([]);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

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

  useEffect(() => {
    if (open && invoiceId) {
      fetchPayments();
    }
  }, [open, invoiceId]);

  const resetForm = () => {
    setAmount("");
    setDescription("");
  };

  const handleCreate = async () => {
    if (!amount) return toast.error("Amount is required.");
    console.log({
      amount: parseFloat(amount),
      desc: description,
    })
    try {
      const success = await createPayment(token, invoiceId, isSalesPayment, {
        amount: parseFloat(amount),
        desc: description,
      });
      if (success) {
        toast.success("Payment created successfully!");
        resetForm();
        fetchPayments();
      } else {
        toast.error("Failed to create payment.");
      }
    } catch (error) {
      console.log("Error creating payment:", error);
      toast.error("Failed to create payment.");
    }
  };

  const handleDelete = async (paymentId) => {
    try {
      const success = await deletePayment(token, invoiceId, isSalesPayment, paymentId);
      if (success) {
        toast.success("Payment deleted.");
        fetchPayments();
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
            className="w-full"
            disabled={(() => {
              const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
              const newAmount = parseFloat(amount) || 0;
              return totalPaid >= invoiceTotal || totalPaid + newAmount > invoiceTotal;
            })()}
          >
            Create Payment
          </Button>
        </div>

        <div className="mt-2 flex flex-col gap-1">
          {payments.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No payments recorded.</p>
          )}
          {payments.map((payment) => (
            <div key={payment.id} className="flex items-center gap-2">
              <div className="bg-card rounded-lg flex flex-1 justify-between px-2 py-1 bg-transparent border border-border box-border">
                <div className="font-medium">PKR {Number(payment.amount).toLocaleString()}{payment.description && <span className="text-muted-foreground font-normal"> · {payment.description}</span>}</div>
                <div className="text-muted-foreground text-sm">{new Date(payment.created_at).toLocaleDateString("en-GB")}</div>
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