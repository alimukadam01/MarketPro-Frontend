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
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useAuth } from "../../../services/AuthProvider";
import { mergePeople } from "../../../services/api";
import { formatCurrency, personRolesLabel } from "../../../services/utils";

/**
 * Merging people who share a phone number (register #17, R29, R30). Nothing
 * is merged on a guess: the user picks who to keep and which name and phone
 * stay. A customer and a supplier record are simply joined under one person;
 * two of the same role are combined. Two opening balances on the same side
 * stop it, and the server says so. There is no undo.
 */
export default function MergePeopleDialog({ groups, open, setOpen, onMerged }) {
  const { token } = useAuth();
  const [index, setIndex] = useState(0);
  const [keptId, setKeptId] = useState(null);
  const [nameFrom, setNameFrom] = useState(null);
  const [phoneFrom, setPhoneFrom] = useState(null);
  const [merging, setMerging] = useState(false);

  const group = groups?.[index] || null;

  useEffect(() => {
    if (!open) return;
    setIndex(0);
  }, [open]);

  useEffect(() => {
    const first = group?.people?.[0];
    setKeptId(first?.id ?? null);
    setNameFrom(first?.id ?? null);
    setPhoneFrom(first?.id ?? null);
  }, [group]);

  const byId = Object.fromEntries((group?.people || []).map((p) => [p.id, p]));

  const onMerge = async () => {
    if (!group || !keptId) return;
    setMerging(true);
    try {
      const name = byId[nameFrom]?.name;
      const phone = byId[phoneFrom]?.phone;
      for (const person of group.people) {
        if (person.id === keptId) continue;
        const res = await mergePeople(token, keptId, person.id, { name, phone });
        if (!res.ok) {
          if (res.error) toast.error(res.error);
          return;
        }
      }
      toast.success(`Merged into ${name}.`);
      onMerged();
      if (index + 1 < groups.length) {
        setIndex(index + 1);
      } else {
        setOpen(false);
      }
    } catch (error) {
      console.log("Error merging people:", error);
      toast.error("Failed to merge.");
    } finally {
      setMerging(false);
    }
  };

  const choice = (label, value, setter, render) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="space-y-1">
        {(group?.people || []).map((person) => (
          <label key={person.id} className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              checked={value === person.id}
              onChange={() => setter(person.id)}
            />
            {render(person)}
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Same phone, same person?{groups?.length > 1 ? ` (${index + 1} of ${groups.length})` : ""}
          </DialogTitle>
          <DialogDescription>
            These people share the number {group?.phone}. Merge them only if they are one person or
            firm. Their invoices, payments and balances move onto the one you keep. This cannot be
            undone.
          </DialogDescription>
        </DialogHeader>

        {group && (
          <div className="space-y-4">
            <ul className="divide-y rounded-md border text-sm">
              {group.people.map((person) => (
                <li
                  key={person.id}
                  className={cn("flex items-center justify-between gap-4 px-3 py-2",
                    keptId === person.id && "bg-muted")}
                >
                  <span>
                    <span className="font-medium">{person.name}</span>
                    <span className="text-muted-foreground"> · {personRolesLabel(person.roles)}</span>
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatCurrency(person.receivable)} / {formatCurrency(person.payable)}
                  </span>
                </li>
              ))}
            </ul>
            {choice("Keep this record", keptId, setKeptId, (p) => p.name)}
            {choice("Name to keep", nameFrom, setNameFrom, (p) => p.name)}
            {choice("Phone to keep", phoneFrom, setPhoneFrom, (p) => p.phone || "-")}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          {groups?.length > 1 && index + 1 < groups.length && (
            <Button variant="outline" onClick={() => setIndex(index + 1)}>
              Skip
            </Button>
          )}
          <Button disabled={!group || !keptId || merging} onClick={onMerge}>
            {merging ? <Spinner size={16} /> : null}
            <span>Merge</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
