import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import DataTable from "@/components/ui/data-table";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import CustomFilter from "@/components/layout/CustomFilter";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { SearchField } from "@/components/ui/search-field";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import * as DialogUI from "@/components/ui/dialog";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  BACKLOG_PRIORITIES,
  BACKLOG_STATUSES,
  BACKLOG_TYPES,
  Pill,
  formatSeconds,
  formatWhen,
  personName,
  priorityOf,
} from "@/components/backlog/meta";
import { getImageUrl, listCountLabel } from "../../services/utils";
import {
  backlogEntriesAPIPackage,
  getBacklogMetrics,
  getBacklogReviewQueue,
  getGlossarySuggestions,
  releaseBacklogEntry,
  requeueBacklogEntry,
} from "../../services/api";
import { useAuth } from "../../services/AuthProvider";
import { useDebouncedSearch } from "@/hooks/use-debounced-search";
import { ArrowLeft, BookOpen, ClipboardCheck, Filter, Lock, Trash2, Undo2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const cols = [
  { key: "id", label: "ID" },
  { key: "item", label: "Item" },
  {
    key: "type",
    label: "Type",
    render: (val: string) => {
      const type = BACKLOG_TYPES[val];
      return <Pill tone={type?.tone || ""}>{type?.label || val}</Pill>;
    },
  },
  { key: "book", label: "Book" },
  {
    key: "status",
    label: "Status",
    render: (val: string) => {
      const status = BACKLOG_STATUSES[val];
      return <Pill tone={status?.tone || ""}>{status?.label || val}</Pill>;
    },
  },
  {
    key: "priority",
    label: "Priority",
    render: (val: string) => <Pill tone={BACKLOG_PRIORITIES[val].tone}>{BACKLOG_PRIORITIES[val].label}</Pill>,
  },
  { key: "entered_by", label: "Entered by" },
  { key: "entered_at", label: "Entered" },
  { key: "produced", label: "Produced" },
];

const transformEntry = (entry) => ({
  id: entry.id,
  item: `#${entry.id}`,
  type: entry.type,
  book: entry.book_label || "-",
  status: entry.status,
  priority: priorityOf(entry),
  entered_by: entry.entered_by ? personName(entry.entered_by) : entry.claimed_by ? `${personName(entry.claimed_by)} (open)` : "-",
  entered_at: entry.entered_at ? formatWhen(entry.entered_at) : "-",
  produced: entry.status === "cant_read"
    ? `Can't read: ${entry.cant_read_note}`
    : (entry.outputs || []).length === 0
      ? "-"
      : (entry.outputs || []).length === 1
        ? entry.outputs[0].label
        : `${entry.outputs.length} records`,
  raw: entry,
});

const filter_fields_template = { status: "", type: "", priority: "", is_daily: false };

const filter_fields_mapper = {
  status: {
    label: "Status",
    type: "select",
    placeholder: "Any status",
    options: Object.entries(BACKLOG_STATUSES).map(([value, { label }]) => ({ value, label })),
  },
  type: {
    label: "Type",
    type: "select",
    placeholder: "Any type",
    options: Object.entries(BACKLOG_TYPES).map(([value, { label }]) => ({ value, label })),
  },
  priority: {
    label: "Priority",
    type: "select",
    placeholder: "Any priority",
    options: [{ value: "high", label: "High" }, { value: "normal", label: "Normal" }],
  },
  is_daily: { label: "Today's pages only", type: "checkbox" },
};

const accuracyTone = (value: number | null) =>
  value === null || value === undefined ? "bg-gray-100 text-gray-700"
    : value >= 95 ? "bg-green-100 text-green-700"
      : value >= 85 ? "bg-yellow-100 text-yellow-700"
        : "bg-red-100 text-red-700";

const Backlog = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [selectedRows, setSelectedRows] = useState([]);
  const [backlogData, setBacklogData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);
  const [filterWindowOpen, setFilterWindowOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState(0);
  const [metrics, setMetrics] = useState(null);
  const [metricsError, setMetricsError] = useState(false);
  const [waitingIds, setWaitingIds] = useState<number[]>([]);
  const [suggestionCount, setSuggestionCount] = useState(0);
  const [busy, setBusy] = useState("");
  const [unreadable, setUnreadable] = useState(null);
  const { token, user, getPermissions } = useAuth();
  const permissions = getPermissions("backlog_entries");
  const navigate = useNavigate();

  // Reviewing, the glossary and deleting are the owner's alone.
  const isOwner = user?.role === "admin";

  const toggleRowSelection = (id) => {
    setSelectedRows((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  };

  const fetchBacklog = async (searchQuery = null) => {
    if (!token) return;
    try {
      const res = await backlogEntriesAPIPackage.list(token, searchQuery);
      if (res) {
        setBacklogData(res.map(transformEntry));
      } else {
        toast.error("Failed to fetch backlog items.");
      }
    } catch (error) {
      toast.error("Failed to fetch backlog items.");
      console.log("Error fetching backlog:", error);
    } finally {
      setLoading(false);
    }
  };

  const { searchTerm, setSearchTerm, searching } = useDebouncedSearch(fetchBacklog);

  useEffect(() => {
    if (!token) return;
    fetchBacklog();

    const fetchMetrics = async () => {
      try {
        const data = await getBacklogMetrics(token);
        if (data) {
          setMetrics(data);
        } else {
          setMetricsError(true);
        }
      } catch (error) {
        console.log("Error fetching backlog metrics:", error);
        setMetricsError(true);
      }
    };

    const fetchOwnerCounts = async () => {
      if (!isOwner) return;
      try {
        const [queue, suggestions] = await Promise.all([
          getBacklogReviewQueue(token),
          getGlossarySuggestions(token),
        ]);
        setWaitingIds((queue || []).filter((row) => row.status === "entered").map((row) => row.id));
        setSuggestionCount((suggestions || []).length);
      } catch (error) {
        console.log("Error fetching the review queue:", error);
      }
    };

    fetchMetrics();
    fetchOwnerCounts();
  }, [token, refresh]);

  const selected = (backlogData || []).filter((row) => selectedRows.includes(row.id));
  const single = selected.length === 1 ? selected[0].raw : null;

  const handleDeletion = async () => {
    if (selectedRows.length === 0) return;
    setBusy("delete");
    try {
      const done = selectedRows.length > 1
        ? await backlogEntriesAPIPackage.bulkDelete(token, selectedRows, "entry")
        : await backlogEntriesAPIPackage.delete(token, selectedRows[0]);
      if (done) {
        toast.success("Backlog items deleted.");
        setSelectedRows([]);
        setRefresh((value) => !value);
      } else {
        toast.error("Failed to delete backlog items.");
      }
    } catch (error) {
      toast.error("Failed to delete backlog items.");
      console.log(error);
    } finally {
      setBusy("");
    }
  };

  const handleRelease = async () => {
    if (!single) return;
    setBusy("release");
    try {
      const res = await releaseBacklogEntry(token, single.id);
      if (res.ok) {
        toast.success(`Item #${single.id} is back in the queue.`);
        setSelectedRows([]);
        setRefresh((value) => !value);
      } else if (res.error) {
        toast.error(res.error);
      }
    } finally {
      setBusy("");
    }
  };

  // An entered page opens on the entry screen; a page nobody could read
  // opens its note, to put it back in the queue - with a better photo.
  const handleReview = () => {
    if (single?.status === "entered") navigate(`/backlog/review/${single.id}`);
    else if (single?.status === "cant_read") setUnreadable(single);
    else if (waitingIds.length) navigate(`/backlog/review/${waitingIds[0]}`);
  };

  const business = metrics?.business;
  const doneHint = business
    ? `Last 3 weeks · ${business.average_per_day} a day on average${business.projected_finish ? ` · done by ${new Date(business.projected_finish).toLocaleDateString("en-GB")}` : ""}`
    : undefined;

  const cards = [
    { title: "Pages Left", value: business?.pages_left, hint: "Not yet entered" },
    { title: "Waiting for Review", value: business?.waiting_for_review, hint: "Every entry needs your approval" },
    { title: "Verified", value: business?.verified_this_month, hint: "This month" },
    {
      title: "Accuracy",
      value: business?.accuracy === null || business?.accuracy === undefined ? "-" : `${business.accuracy}%`,
      hint: "Approved ÷ reviewed, all time",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Sidebar onCollapseChange={setSidebarCollapsed} />

      <div className={`${sidebarCollapsed ? "ml-16" : "ml-64"} transition-all duration-300 flex flex-col`}>
        <Header />

        <main className="flex-1 p-6 space-y-6">
          <div className="space-y-1">
            <DynamicBreadCrumb />

            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center space-x-3">
                <ArrowLeft
                  className="w-5 h-5 text-muted-foreground cursor-pointer hover:text-primary"
                  onClick={() => navigate("/")}
                />
                <div>
                  <h1 className="text-2xl font-semibold">Backlog Overview</h1>
                  <p className="text-sm text-muted-foreground">
                    Pages waiting to be entered, and entries waiting for your review.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {isOwner && (
                  <Button variant="outline" onClick={() => navigate("/backlog/glossary")}>
                    <BookOpen className="w-4 h-4 mr-2" />
                    Glossary
                    {suggestionCount > 0 && (
                      <span className="ml-2 rounded-full bg-primary/10 px-2 text-xs font-semibold text-primary">
                        {suggestionCount} new
                      </span>
                    )}
                  </Button>
                )}
                {isOwner && (
                  <Button variant="outline" disabled={waitingIds.length === 0}
                    onClick={() => navigate(`/backlog/review/${waitingIds[0]}`)}>
                    <ClipboardCheck className="w-4 h-4 mr-2" />
                    Review entries · {waitingIds.length}
                  </Button>
                )}
                <Button disabled={!permissions?.["create"]} onClick={() => navigate("/backlog/upload")}>
                  {permissions?.["create"] ? <Upload className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                  Upload pages
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {cards.map((card) => (
              <MetricCard key={card.title} title={card.title} value={card.value ?? 0} hint={card.hint}
                loading={!metrics && !metricsError} error={metricsError} />
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ChartCard
              title="Pages done per day"
              hint={doneHint}
              data={business ? business.done_per_day.map((point) => ({ day: point.date, value: point.count })) : null}
              error={metricsError}
              valueLabel="Pages"
              formatValue={(value) => `${value} pages`}
            />

            <section className="rounded-lg border bg-card p-6 min-w-0">
              <h2 className="text-lg font-semibold mb-4">Entry people</h2>
              <div className="grid grid-cols-[minmax(0,1.4fr)_repeat(5,minmax(0,1fr))] gap-3 text-sm font-medium text-muted-foreground border-b pb-2">
                <div>Name</div><div>Entered</div><div>Accuracy</div><div>Per item</div><div>Can't read</div><div>Daily late</div>
              </div>
              {(metrics?.people || []).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No entries this month yet.</p>
              ) : (metrics.people).map((person) => (
                <div key={person.user.id} className="grid grid-cols-[minmax(0,1.4fr)_repeat(5,minmax(0,1fr))] gap-3 text-sm py-2 border-b last:border-b-0 items-center">
                  <div className="font-medium truncate">{person.user.name}</div>
                  <div className="tabular-nums">{person.entered}</div>
                  <div><Pill tone={accuracyTone(person.accuracy)}>{person.accuracy === null ? "-" : `${person.accuracy}%`}</Pill></div>
                  <div className="tabular-nums">{person.median_seconds ? formatSeconds(person.median_seconds) : "-"}</div>
                  <div className="tabular-nums">{person.cant_read_rate === null ? "-" : `${person.cant_read_rate}%`}</div>
                  <div className="tabular-nums">{person.late_daily}</div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground mt-3">
                This month. Accuracy is entries you approved ÷ entries you reviewed. "Daily late" counts
                today's pages entered after the end of the next working day.
              </p>
            </section>
          </div>

          <div>
            <div className="sticky top-0 z-20 bg-background pt-4 pb-[10px] space-y-4">
              <h2 className="text-xl font-semibold">
                Backlog Items ({listCountLabel(backlogData, selectedRows)})
              </h2>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <SearchField placeholder="Search backlog" value={searchTerm} onChange={setSearchTerm} pending={searching} />
                  <Button variant="outline" onClick={() => setFilterWindowOpen(!filterWindowOpen)}>
                    <Filter className="w-4 h-4 mr-2" />
                    <span>Filter{activeFilters ? ` · ${activeFilters}` : ""}</span>
                  </Button>
                </div>

                <div className="flex items-center space-x-3">
                  {isOwner && (
                    <Button variant="outline" size="sm" className="flex items-center space-x-2"
                      disabled={!single || !["entered", "cant_read"].includes(single.status)}
                      onClick={handleReview}>
                      <ClipboardCheck className="w-4 h-4" />
                      <span>Review</span>
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="flex items-center space-x-2"
                    disabled={!isOwner || busy !== "" || single?.status !== "in_progress"}
                    onClick={handleRelease}>
                    {busy === "release" ? <Spinner size={16} /> : isOwner ? <Undo2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    <span>Release</span>
                  </Button>
                  <Button variant="outline" size="sm" className="flex items-center space-x-2"
                    disabled={busy !== "" || selectedRows.length === 0 || !permissions?.["delete"]}
                    onClick={handleDeletion}>
                    {busy === "delete" ? <Spinner size={16} /> : permissions?.["delete"] ? <Trash2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    <span>Delete</span>
                  </Button>
                </div>
              </div>

              {loading || (backlogData && backlogData.length > 0) ? <DataTable columns={cols} headerOnly /> : null}
            </div>

            {loading || (backlogData && backlogData.length > 0) ? (
              <DataTable
                columns={cols}
                data={permissions?.["view"] ? backlogData : null}
                selectedRows={selectedRows}
                onRowClick={toggleRowSelection}
                rowsOnly
                loading={loading}
              />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No pages yet. Upload photos of the shop's books to start.
              </p>
            )}
          </div>

          <CustomFilter
            title="Filter Backlog"
            template={filter_fields_template}
            templateMapper={filter_fields_mapper}
            dataFetcher={fetchBacklog}
            open={filterWindowOpen}
            setOpen={setFilterWindowOpen}
            onActiveChange={setActiveFilters}
          />

          <UnreadableDialog
            entry={unreadable}
            onClose={() => setUnreadable(null)}
            onDone={() => { setUnreadable(null); setSelectedRows([]); setRefresh((value) => !value); }}
          />
        </main>
      </div>
    </div>
  );
};

/**
 * A page the entry person could not read: their note and the photo, and the
 * way back into the queue - with a retaken photo when there is one. Deleting
 * it is the list's Delete.
 */
function UnreadableDialog({ entry, onClose, onDone }) {
  const { token } = useAuth();
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => setPhoto(null), [entry]);

  const requeue = async () => {
    setSaving(true);
    try {
      const res = await requeueBacklogEntry(token, entry.id, photo);
      if (res.ok) {
        toast.success(`Item #${entry.id} is back in the queue.`);
        onDone();
      } else if (res.error) {
        toast.error(res.error);
      }
    } catch (error) {
      console.log("Error requeueing the page:", error);
      toast.error("Failed to put the page back in the queue.");
    } finally {
      setSaving(false);
    }
  };

  const image = entry?.image ? getImageUrl(entry.image) : null;

  return (
    <DialogUI.Dialog open={!!entry} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogUI.DialogContent className="max-w-lg">
        <DialogUI.DialogHeader>
          <DialogUI.DialogTitle>Item #{entry?.id} could not be read</DialogUI.DialogTitle>
          <DialogUI.DialogDescription>
            {personName(entry?.entered_by)} wrote: "{entry?.cant_read_note}"
          </DialogUI.DialogDescription>
        </DialogUI.DialogHeader>
        {image && (
          <a href={image} target="_blank" rel="noreferrer" className="block rounded-lg border overflow-hidden bg-muted">
            <img src={image} alt="The page" className="max-h-64 w-full object-contain" />
          </a>
        )}
        <div className="space-y-1">
          <Label htmlFor="retaken-photo">A better photo (optional)</Label>
          <Input id="retaken-photo" type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
          <p className="text-xs text-muted-foreground">Replaces the photo before the page goes back in the queue.</p>
        </div>
        <DialogUI.DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <SubmitButton type="button" pending={saving} pendingLabel="Sending…" onClick={requeue}>
            Put back in the queue
          </SubmitButton>
        </DialogUI.DialogFooter>
      </DialogUI.DialogContent>
    </DialogUI.Dialog>
  );
}

export default Backlog;
