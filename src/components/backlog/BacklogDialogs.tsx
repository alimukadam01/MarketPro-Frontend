import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BookOpen, Plus } from "lucide-react";
import * as DialogUI from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchField } from "@/components/ui/search-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Spinner } from "@/components/ui/spinner";
import { LookupCombobox, type LookupItem } from "./LookupCombobox";
import { useAuth } from "../../../services/AuthProvider";
import { getWorkGlossary, suggestGlossaryTerm } from "../../../services/api";

export const GLOSSARY_KINDS: Record<string, string> = {
  shorthand: "Shorthand",
  shade: "Shade",
  unit: "Unit",
  product: "Product",
  customer: "Customer",
  supplier: "Supplier",
  payment: "Payment",
};

// -- A note, then a button ---------------------------------------------------

interface NoteDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  title: string;
  description: string;
  label: string;
  placeholder?: string;
  hint?: string;
  confirmLabel: string;
  /** Resolves true when it went through, which closes the dialog. */
  onConfirm: (note: string) => Promise<boolean>;
}

/**
 * Can't read (the entry person tells the owner what is wrong with the page)
 * and Send back (the owner tells the entry person what to fix). Both are a
 * note the other side will act on, so both require one.
 */
export function NoteDialog({
  open, setOpen, title, description, label, placeholder, hint, confirmLabel, onConfirm,
}: NoteDialogProps) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setNote("");
  }, [open]);

  const confirm = async () => {
    if (!note.trim()) {
      toast.error("Write a note first.");
      return;
    }
    setSaving(true);
    try {
      if (await onConfirm(note.trim())) setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogUI.Dialog open={open} onOpenChange={setOpen}>
      <DialogUI.DialogContent className="max-w-lg">
        <DialogUI.DialogHeader>
          <DialogUI.DialogTitle>{title}</DialogUI.DialogTitle>
          <DialogUI.DialogDescription>{description}</DialogUI.DialogDescription>
        </DialogUI.DialogHeader>
        <div className="space-y-1">
          <Label htmlFor="backlog-note">{label}</Label>
          <Textarea
            id="backlog-note"
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={placeholder}
            autoFocus
          />
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        <DialogUI.DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <SubmitButton type="button" pending={saving} pendingLabel="Sending…" onClick={confirm}>
            {confirmLabel}
          </SubmitButton>
        </DialogUI.DialogFooter>
      </DialogUI.DialogContent>
    </DialogUI.Dialog>
  );
}

// -- The glossary ------------------------------------------------------------

type GlossaryTerm = {
  id: number;
  term: string;
  meaning: string;
  kind: string;
  links_to?: { kind: string; id: number; name: string } | null;
};

const LINKS = [
  { key: "customer", label: "Customer", lookup: "customers" },
  { key: "supplier", label: "Supplier", lookup: "suppliers" },
  { key: "product", label: "Product", lookup: "products" },
  { key: "shorthand", label: "Just shorthand", lookup: null },
];

/**
 * The shop's shorthand - "S.W" is Sweet White, "Bhai jan" is Hassan
 * Builders - searchable while a page is open. A term that is missing can be
 * suggested from here; the owner approves it before it joins the glossary.
 */
export function GlossaryDialog({
  open,
  setOpen,
  entryId,
  canSuggest = true,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  entryId?: number;
  canSuggest?: boolean;
}) {
  const { token } = useAuth();
  const [glossary, setGlossary] = useState<{ version: number; entries: GlossaryTerm[] } | null>(null);
  const [query, setQuery] = useState("");
  const [suggesting, setSuggesting] = useState(false);

  useEffect(() => {
    if (!open || !token) return;
    setSuggesting(false);
    const fetchGlossary = async () => {
      try {
        const data = await getWorkGlossary(token);
        if (data) {
          setGlossary(data);
        } else {
          toast.error("Failed to fetch the glossary.");
        }
      } catch (error) {
        console.log("Error fetching glossary:", error);
        toast.error("Failed to fetch the glossary.");
      }
    };
    fetchGlossary();
  }, [open, token]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (glossary?.entries || []).filter((row) =>
      !q || row.term.toLowerCase().includes(q) || row.meaning.toLowerCase().includes(q));
  }, [glossary, query]);

  return (
    <DialogUI.Dialog open={open} onOpenChange={setOpen}>
      <DialogUI.DialogContent className="max-w-xl max-h-[85vh] flex flex-col">
        {suggesting ? (
          <SuggestTermForm
            entryId={entryId}
            initialTerm={query}
            onDone={() => setSuggesting(false)}
          />
        ) : (
          <>
            <DialogUI.DialogHeader className="shrink-0">
              <DialogUI.DialogTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Glossary
                {glossary && (
                  <span className="text-xs font-medium text-muted-foreground border rounded-full px-2 py-0.5">
                    v{glossary.version}
                  </span>
                )}
              </DialogUI.DialogTitle>
              <DialogUI.DialogDescription>The shorthand used in this shop's books.</DialogUI.DialogDescription>
            </DialogUI.DialogHeader>

            <SearchField
              placeholder="Search the glossary"
              value={query}
              onChange={setQuery}
              className="w-full"
              wrapperClassName="w-full shrink-0"
            />

            <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-[6px] -mx-1 px-1 py-1">
              {!glossary ? (
                <div className="flex justify-center py-6"><Spinner size={20} /></div>
              ) : shown.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {query ? "No term matches that." : "No terms yet."}
                  {canSuggest && query ? " Suggest it below." : ""}
                </p>
              ) : (
                shown.map((row) => (
                  <div key={row.id} className="bg-card rounded-lg border min-h-[35px] px-4 py-1.5 grid grid-cols-[110px_88px_minmax(0,1fr)] gap-4 items-center text-sm">
                    <span className="font-semibold truncate" title={row.term}>{row.term}</span>
                    <span className="text-xs text-muted-foreground">{GLOSSARY_KINDS[row.kind] || row.kind}</span>
                    <span className="min-w-0">{row.meaning}</span>
                  </div>
                ))
              )}
            </div>

            {canSuggest && (
              <div className="shrink-0 flex items-center justify-between gap-3 border-t pt-4">
                <span className="text-xs text-muted-foreground">Suggestions go to the owner for approval.</span>
                <Button type="button" variant="outline" onClick={() => setSuggesting(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Suggest a term
                </Button>
              </div>
            )}
          </>
        )}
      </DialogUI.DialogContent>
    </DialogUI.Dialog>
  );
}

function SuggestTermForm({
  entryId,
  initialTerm,
  onDone,
}: {
  entryId?: number;
  initialTerm: string;
  onDone: () => void;
}) {
  const { token } = useAuth();
  const [term, setTerm] = useState(initialTerm);
  const [meaning, setMeaning] = useState("");
  const [link, setLink] = useState("customer");
  const [record, setRecord] = useState<LookupItem | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const current = LINKS.find((item) => item.key === link);

  const send = async () => {
    if (!term.trim()) {
      toast.error("Write the term as it is on the page.");
      return;
    }
    const means = meaning.trim() || record?.label || "";
    if (!means) {
      toast.error("Say what it means.");
      return;
    }
    setSaving(true);
    try {
      const res = await suggestGlossaryTerm(token, {
        term: term.trim(),
        meaning: means,
        kind: link,
        ...(current?.lookup && record ? { [link]: record.id } : {}),
        note: note.trim(),
        ...(entryId ? { entry: entryId } : {}),
      });
      if (res.ok) {
        toast.success("Suggestion sent to the owner.");
        onDone();
      } else if (res.error) {
        toast.error(res.error);
      }
    } catch (error) {
      console.log("Error suggesting a term:", error);
      toast.error("Failed to send the suggestion.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <DialogUI.DialogHeader className="shrink-0">
        <DialogUI.DialogTitle>Suggest a glossary term</DialogUI.DialogTitle>
        <DialogUI.DialogDescription>
          The owner approves it before anyone sees it in the glossary.
          {entryId ? ` It is linked to item #${entryId} so they can check the page.` : ""}
        </DialogUI.DialogDescription>
      </DialogUI.DialogHeader>

      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-4 -mx-1 px-1 py-1">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="suggest-term">As written on the page</Label>
            <Input id="suggest-term" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Bhai jan" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="suggest-meaning">Means</Label>
            <Input id="suggest-meaning" value={meaning} onChange={(e) => setMeaning(e.target.value)} placeholder="Hassan Builders" />
          </div>
        </div>

        <div className="space-y-1">
          <Label>Is it a name in MarketPro?</Label>
          <div className="inline-flex rounded-md bg-muted p-1 gap-1" role="group">
            {LINKS.map((item) => (
              <button
                key={item.key}
                type="button"
                aria-pressed={link === item.key}
                onClick={() => { setLink(item.key); setRecord(null); }}
                className={`h-8 px-3 rounded text-sm font-medium whitespace-nowrap ${link === item.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {current?.lookup && (
          <div className="space-y-1">
            <Label htmlFor="suggest-record">Which {current.label.toLowerCase()}</Label>
            <LookupCombobox
              id="suggest-record"
              kind={current.lookup}
              value={record?.id ?? ""}
              selectedLabel={record?.label}
              onChange={setRecord}
              placeholder={`Pick the ${current.label.toLowerCase()}`}
              clearable
            />
          </div>
        )}

        <div className="space-y-1">
          <Label htmlFor="suggest-note">Note for the owner (optional)</Label>
          <Textarea id="suggest-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <p className="text-xs text-muted-foreground">
          You can keep entering this page meanwhile. The suggestion shows on the owner's Glossary page.
        </p>
      </div>

      <DialogUI.DialogFooter className="shrink-0">
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <SubmitButton type="button" pending={saving} pendingLabel="Sending…" onClick={send}>
          Send suggestion
        </SubmitButton>
      </DialogUI.DialogFooter>
    </>
  );
}
