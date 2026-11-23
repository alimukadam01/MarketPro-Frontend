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
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "../../../services/AuthProvider";
import { deletePerson, getPersonDeletePreview } from "../../../services/api";
import { formatCurrency } from "../../../services/utils";

/**
 * Deleting a person (People, register S1 and R12).
 *
 * Only a person is ever deleted - a customer or supplier role is deactivated
 * instead - and the delete takes everything about them: invoices, payments
 * and their transactions, loans, set-offs, opening balances. So before it
 * happens the dialog lists all of it, from the same server calculation the
 * delete runs, and Delete stays off until the name is typed as shown.
 */
export default function PersonDeleteDialog({
  personId,
  personName,
  open,
  setOpen,
  onDeleted,
}: {
  personId: number | null;
  personName: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  onDeleted: () => void;
}) {
  const { token } = useAuth();
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open || !personId) return;
    setTyped("");
    setPreview(null);
    const load = async () => {
      setLoading(true);
      try {
        const res = await getPersonDeletePreview(token, personId);
        if (res) {
          setPreview(res);
        } else {
          toast.error("Failed to load what would be deleted.");
          setOpen(false);
        }
      } catch (error) {
        console.log("Error loading delete preview:", error);
        toast.error("Failed to load what would be deleted.");
        setOpen(false);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, personId, token]);

  // The same rule as the server: case and surrounding spaces do not matter.
  const matches =
    typed.trim().toLowerCase() === (personName || "").trim().toLowerCase() && typed.trim() !== "";

  const onDelete = async () => {
    setDeleting(true);
    try {
      const res = await deletePerson(token, personId, typed);
      if (res.ok) {
        toast.success(`${personName} deleted.`);
        setOpen(false);
        onDeleted();
      } else if (res.error) {
        toast.error(res.error);
      }
    } catch (error) {
      console.log("Error deleting person:", error);
      toast.error("Failed to delete the person.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Delete {personName}?</DialogTitle>
          <DialogDescription>
            This removes {personName} and everything below for good. It cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {loading || !preview ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Spinner size={16} /> Working out what would be deleted…
          </div>
        ) : !preview.can_delete ? (
          <p className="rounded-md border bg-muted p-3 text-sm">{preview.reason}</p>
        ) : (
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="mb-2 font-medium">Deleted with them</h3>
              <ul className="divide-y rounded-md border">
                {preview.deleted.map((row) => (
                  <li key={row.model} className="flex items-center justify-between gap-4 px-3 py-2">
                    <span>{row.label}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {row.count}
                      {row.total !== undefined ? ` · ${formatCurrency(row.total)}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {preview.kept?.length > 0 && (
              <div>
                <h3 className="mb-2 font-medium">Kept</h3>
                <ul className="divide-y rounded-md border">
                  {preview.kept.map((row) => (
                    <li key={row.model} className="flex items-center justify-between gap-4 px-3 py-2">
                      <span>{row.label}</span>
                      <span className="tabular-nums text-muted-foreground">{row.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {preview.money_accounts?.length > 0 && (
              <div>
                <h3 className="mb-2 font-medium">Money accounts</h3>
                <ul className="divide-y rounded-md border">
                  {preview.money_accounts.map((account) => (
                    <li key={account.id} className="flex items-center justify-between gap-4 px-3 py-2">
                      <span>{account.name}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatCurrency(account.balance_now)} → {formatCurrency(account.balance_after)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-muted-foreground">{preview.stock_note}</p>

            <div className="space-y-1">
              <Label htmlFor="confirm-person-name">
                Type <span className="font-semibold">{personName}</span> to confirm
              </Label>
              <Input
                id="confirm-person-name"
                autoComplete="off"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!preview?.can_delete || !matches || deleting}
            onClick={onDelete}
          >
            {deleting ? <Spinner size={16} /> : null}
            <span>Delete {personName}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
