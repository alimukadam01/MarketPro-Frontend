import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Check, Plus, Trash2, X } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchField } from "@/components/ui/search-field";
import { Spinner } from "@/components/ui/spinner";
import { SubmitButton } from "@/components/ui/submit-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as DialogUI from "@/components/ui/dialog";
import { RowAction } from "@/components/invoice/InvoiceItemsTable";
import { GLOSSARY_KINDS } from "@/components/backlog/BacklogDialogs";
import { LookupCombobox, type LookupItem } from "@/components/backlog/LookupCombobox";
import { personName, type GlossaryRow } from "@/components/backlog/meta";
import { useAuth } from "../../../services/AuthProvider";
import {
  approveGlossarySuggestion,
  createGlossaryTerm,
  deleteGlossaryTerm,
  getBacklogGlossary,
  getGlossarySuggestions,
  rejectGlossarySuggestion,
  updateGlossaryTerm,
} from "../../../services/api";
import { formatDate } from "../../../services/utils";

const GRID = "grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_140px] gap-4 items-center w-full";

// Which record a kind of term may point at.
const LINKABLE: Record<string, string> = { customer: "customers", supplier: "suppliers", product: "products" };

const linkText = (links) =>
  links ? `${GLOSSARY_KINDS[links.kind] || links.kind}: ${links.name}` : "-";

/**
 * /backlog/glossary - the shop's shorthand, kept by the owner. Entry people
 * read it beside every page and suggest what is missing; a suggestion joins
 * the glossary only once it is approved here. Every change makes a new
 * version, and each page records the version it was entered with.
 */
export default function BacklogGlossary() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const { token } = useAuth();
  const navigate = useNavigate();
  const [glossary, setGlossary] = useState<{ version: number; entries: GlossaryRow[] } | null>(null);
  const [suggestions, setSuggestions] = useState<(GlossaryRow & { note: string; entry: number | null; suggested_by: { name: string } | null })[] | null>(null);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Partial<GlossaryRow> | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchAll = async () => {
    try {
      const [terms, pending] = await Promise.all([getBacklogGlossary(token), getGlossarySuggestions(token)]);
      if (terms) setGlossary(terms);
      else toast.error("Failed to fetch the glossary.");
      setSuggestions(pending || []);
    } catch (error) {
      console.log("Error fetching the glossary:", error);
      toast.error("Failed to fetch the glossary.");
    }
  };

  useEffect(() => {
    if (token) fetchAll();
  }, [token]);

  const terms = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (glossary?.entries || []).filter((row) =>
      !q || row.term.toLowerCase().includes(q) || row.meaning.toLowerCase().includes(q));
  }, [glossary, query]);

  const decide = async (suggestion, approve: boolean) => {
    setBusyId(`${approve ? "approve" : "reject"}-${suggestion.id}`);
    try {
      const res = approve
        ? await approveGlossarySuggestion(token, suggestion.id)
        : await rejectGlossarySuggestion(token, suggestion.id);
      if (res.ok) {
        toast.success(approve ? `"${suggestion.term}" added to the glossary.` : "Suggestion rejected.");
        await fetchAll();
      } else if (res.error) {
        toast.error(res.error);
      }
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (row) => {
    setBusyId(`delete-${row.id}`);
    try {
      const res = await deleteGlossaryTerm(token, row.id);
      if (res.ok) {
        toast.success(`"${row.term}" removed.`);
        await fetchAll();
      } else if (res.error) {
        toast.error(res.error);
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar onCollapseChange={setSidebarCollapsed} />
      <div className={`${sidebarCollapsed ? "ml-16" : "ml-64"} transition-all duration-300 flex flex-col`}>
        <Header />
        <main className="flex-1 p-6 space-y-6">
          <div className="space-y-1">
            <DynamicBreadCrumb />
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <ArrowLeft className="w-5 h-5 text-muted-foreground cursor-pointer hover:text-primary" onClick={() => navigate("/backlog")} />
                <div>
                  <h1 className="text-2xl font-semibold">Glossary</h1>
                  <p className="text-sm text-muted-foreground">
                    The shorthand in your books. Entry people see it beside every page.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {glossary && <span className="text-sm text-muted-foreground">Version {glossary.version}</span>}
                <Button onClick={() => setEditing({})}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add term
                </Button>
              </div>
            </div>
          </div>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Suggested by entry people ({suggestions?.length ?? 0})</h2>
            {suggestions === null ? (
              <div className="flex justify-center py-4"><Spinner size={20} /></div>
            ) : suggestions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No suggestions waiting.</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {suggestions.map((s) => (
                  <div key={s.id} className="rounded-lg border bg-card px-4 py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm">
                        <span className="font-semibold">{s.term}</span>
                        <span className="text-muted-foreground"> means </span>
                        <span className="font-medium">{s.meaning}</span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {s.links_to ? linkText(s.links_to) : "No link"} · suggested by {personName(s.suggested_by)}
                        {s.entry ? ` from item #${s.entry}` : ""}
                        {s.note ? ` · "${s.note}"` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="outline" size="sm" disabled={busyId !== null} onClick={() => decide(s, false)}>
                        {busyId === `reject-${s.id}` ? <Spinner size={14} /> : <X className="w-4 h-4 mr-1" />}
                        Reject
                      </Button>
                      <Button size="sm" disabled={busyId !== null} onClick={() => decide(s, true)}>
                        {busyId === `approve-${s.id}` ? <Spinner size={14} /> : <Check className="w-4 h-4 mr-1" />}
                        Approve
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="sticky top-0 z-20 bg-background pt-4 pb-[10px] space-y-4">
              <h2 className="text-xl font-semibold">Terms ({glossary?.entries.length ?? 0})</h2>

              <div className="flex items-center space-x-4">
                <SearchField placeholder="Search terms" value={query} onChange={setQuery} />
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-card rounded-lg border h-[35px] flex flex-1 items-center px-4">
                  <div className={`${GRID} text-sm font-medium text-muted-foreground`}>
                    <div>Term</div><div>Meaning</div><div>Linked to</div><div>Since</div>
                  </div>
                </div>
                <div className="w-5 shrink-0" />
              </div>
            </div>
            <div className="space-y-[10px]">
              {!glossary ? (
                <div className="flex justify-center py-6"><Spinner size={20} /></div>
              ) : terms.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {query ? "No term matches that." : "No terms yet. Add the shorthand your books use."}
                </p>
              ) : terms.map((row) => (
                <div key={row.id} className="flex items-center gap-2">
                  <div onClick={() => setEditing(row)}
                    className="bg-card rounded-lg border border-border h-[35px] flex flex-1 items-center px-4 cursor-pointer hover:border-primary">
                    <div className={`${GRID} text-sm`}>
                      <div className="font-medium truncate">{row.term}</div>
                      <div className="truncate" title={row.meaning}>{row.meaning}</div>
                      <div className="truncate text-muted-foreground">{linkText(row.links_to)}</div>
                      <div className="text-muted-foreground">v{row.valid_from} · {formatDate(row.created_at)}</div>
                    </div>
                  </div>
                  <RowAction label={`Remove ${row.term}`} onClick={() => remove(row)} disabled={busyId !== null}>
                    {busyId === `delete-${row.id}` ? <Spinner size={16} /> : <Trash2 className="h-5 w-5" />}
                  </RowAction>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Every change makes a new version. Each entry records the version it was made with.
            </p>
          </section>
        </main>
      </div>

      <TermDialog term={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); fetchAll(); }} />
    </div>
  );
}

function TermDialog({ term, onClose, onSaved }) {
  const { token } = useAuth();
  const [form, setForm] = useState({ term: "", meaning: "", kind: "shorthand" });
  const [record, setRecord] = useState<LookupItem | null>(null);
  const [saving, setSaving] = useState(false);
  const isNew = !term?.id;

  useEffect(() => {
    if (!term) return;
    setForm({ term: term.term || "", meaning: term.meaning || "", kind: term.kind || "shorthand" });
    setRecord(term.links_to ? { id: term.links_to.id, label: term.links_to.name } : null);
  }, [term]);

  const save = async () => {
    if (!form.term.trim() || !form.meaning.trim()) {
      toast.error("A term needs both what is written and what it means.");
      return;
    }
    const link = LINKABLE[form.kind] ? form.kind : null;
    const data = {
      term: form.term.trim(),
      meaning: form.meaning.trim(),
      kind: form.kind,
      customer: link === "customer" && record ? record.id : null,
      supplier: link === "supplier" && record ? record.id : null,
      product: link === "product" && record ? record.id : null,
    };
    setSaving(true);
    try {
      const res = isNew ? await createGlossaryTerm(token, data) : await updateGlossaryTerm(token, term.id, data);
      if (res.ok) {
        toast.success(isNew ? "Term added." : "Term updated.");
        onSaved();
      } else if (res.error) {
        toast.error(res.error);
      }
    } catch (error) {
      console.log("Error saving the term:", error);
      toast.error("Failed to save the term.");
    } finally {
      setSaving(false);
    }
  };

  const lookup = LINKABLE[form.kind];

  return (
    <DialogUI.Dialog open={!!term} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogUI.DialogContent className="max-w-lg">
        <DialogUI.DialogHeader>
          <DialogUI.DialogTitle>{isNew ? "Add term" : `Edit "${term?.term}"`}</DialogUI.DialogTitle>
          <DialogUI.DialogDescription>
            {isNew ? "Shorthand as it is written in your books, and what it means." : "Saving makes a new version; pages already entered keep the one they used."}
          </DialogUI.DialogDescription>
        </DialogUI.DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="term">As written</Label>
              <Input id="term" value={form.term} onChange={(e) => setForm((f) => ({ ...f, term: e.target.value }))} placeholder="S.W" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="term_kind">Kind</Label>
              <Select value={form.kind} onValueChange={(kind) => { setForm((f) => ({ ...f, kind })); setRecord(null); }}>
                <SelectTrigger id="term_kind"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(GLOSSARY_KINDS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="meaning">Means</Label>
            <Input id="meaning" value={form.meaning} onChange={(e) => setForm((f) => ({ ...f, meaning: e.target.value }))} placeholder="Sweet White" />
          </div>
          {lookup && (
            <div className="space-y-1">
              <Label htmlFor="term_link">Linked {form.kind} (optional)</Label>
              <LookupCombobox
                id="term_link"
                kind={lookup}
                value={record?.id ?? ""}
                selectedLabel={record?.label}
                onChange={setRecord}
                placeholder={`Pick the ${form.kind}`}
                clearable
              />
            </div>
          )}
        </div>
        <DialogUI.DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <SubmitButton type="button" pending={saving} pendingLabel="Saving…" onClick={save}>
            {isNew ? "Add term" : "Save"}
          </SubmitButton>
        </DialogUI.DialogFooter>
      </DialogUI.DialogContent>
    </DialogUI.Dialog>
  );
}
