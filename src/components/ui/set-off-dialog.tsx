import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "../../../services/AuthProvider";
import { recordSetOff } from "../../../services/api";
import { formatCurrency, todayForInput } from "../../../services/utils";

/**
 * A set-off (register #15, #20): the same amount comes off what the person
 * owes you and what you owe them. No money moves, so no account is picked;
 * each side settles its oldest items first. At most the smaller side.
 */
export default function SetOffDialog({ person, receivable, payable, open, setOpen, onRecorded }) {
  const { token } = useAuth();
  const limit = Math.min(receivable || 0, payable || 0);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayForInput());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAmount(limit ? String(limit) : "");
    setDate(todayForInput());
    setNotes("");
  }, [open, limit]);

  const value = Math.floor(Number(amount) || 0);
  const valid = value > 0 && value <= limit;

  const onSave = async () => {
    setSaving(true);
    try {
      const res = await recordSetOff(token, { personId: person.id, amount: value, date, notes });
      if (res.ok) {
        toast.success(`Set-off ${res.data?.reference || ""} recorded.`);
        setOpen(false);
        onRecorded();
      } else if (res.error) {
        toast.error(res.error);
      }
    } catch (error) {
      console.log("Error recording set-off:", error);
      toast.error("Failed to record the set-off.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Set-off with {person?.name}</DialogTitle>
          <DialogDescription>
            Clears the same amount from both sides. No money moves.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="set-off-amount">Amount (PKR)</Label>
            <Input
              id="set-off-amount"
              type="number"
              min="1"
              max={limit}
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">At most {formatCurrency(limit)}, the smaller side.</p>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-md border p-3 text-sm">
            <span className="text-muted-foreground" />
            <span className="text-muted-foreground">Now</span>
            <span className="text-muted-foreground">After</span>
            <span>Receivable</span>
            <span className="tabular-nums">{formatCurrency(receivable)}</span>
            <span className="tabular-nums font-semibold">{formatCurrency((receivable || 0) - (valid ? value : 0))}</span>
            <span>Payable</span>
            <span className="tabular-nums">{formatCurrency(payable)}</span>
            <span className="tabular-nums font-semibold">{formatCurrency((payable || 0) - (valid ? value : 0))}</span>
          </div>

          <div className="space-y-1">
            <Label htmlFor="set-off-date">Date</Label>
            <Input id="set-off-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="set-off-notes">Notes</Label>
            <Textarea id="set-off-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={!valid || saving} onClick={onSave}>
            {saving ? <Spinner size={16} /> : null}
            <span>Record set-off</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
