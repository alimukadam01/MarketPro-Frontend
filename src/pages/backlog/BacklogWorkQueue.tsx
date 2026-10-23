import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { SubmitButton } from "@/components/ui/submit-button";
import { EntryShell } from "@/components/backlog/EntryShell";
import { claimNextPage } from "@/components/backlog/useEntryFlow";
import { BACKLOG_PRIORITIES, BACKLOG_TYPES, Pill, formatWhen, priorityOf, type QueueItem } from "@/components/backlog/meta";
import { useAuth } from "../../../services/AuthProvider";
import { claimWorkEntry, getWorkQueue } from "../../../services/api";

const GRID = "grid grid-cols-[72px_136px_minmax(0,1fr)_88px_112px_minmax(0,1.2fr)] gap-4 items-center w-full";

/**
 * /backlog/work - where a data entry account lands. The pages waiting, in the
 * order they should be done: the user's own open page, pages the owner sent
 * back, today's pages, high priority, then the oldest. Taking a page locks it
 * to the user.
 */
export default function BacklogWorkQueue() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [queue, setQueue] = useState<{ totals: Record<string, number>; items: QueueItem[] } | null>(null);
  const [starting, setStarting] = useState(false);
  const [openingId, setOpeningId] = useState<number | null>(null);

  const fetchQueue = async () => {
    try {
      const data = await getWorkQueue(token);
      if (data) {
        setQueue(data);
      } else {
        toast.error("Failed to fetch the queue.");
      }
    } catch (error) {
      console.log("Error fetching the queue:", error);
      toast.error("Failed to fetch the queue.");
    }
  };

  useEffect(() => {
    if (token) fetchQueue();
  }, [token]);

  const startNext = async () => {
    setStarting(true);
    try {
      const next = await claimNextPage(token);
      if (next.id) {
        navigate(`/backlog/work/${next.id}`);
      } else if (!next.failed) {
        toast.success("The queue is empty. Nothing to enter right now.");
        fetchQueue();
      } else {
        toast.error("Could not take a page. Please try again.");
      }
    } finally {
      setStarting(false);
    }
  };

  const open = async (item) => {
    if (item.mine) {
      navigate(`/backlog/work/${item.id}`);
      return;
    }
    setOpeningId(item.id);
    try {
      const res = await claimWorkEntry(token, item.id);
      if (res.ok) {
        navigate(`/backlog/work/${item.id}`);
      } else {
        if (res.error) toast.error(res.error);
        fetchQueue();
      }
    } catch (error) {
      console.log("Error taking the page:", error);
      toast.error("Could not take the page.");
    } finally {
      setOpeningId(null);
    }
  };

  const totals = queue?.totals;
  const cards = [
    { title: "Waiting", value: totals?.waiting, hint: "Pages in the queue" },
    { title: "From today", value: totals?.daily, hint: "Due by end of tomorrow" },
    { title: "Entered today", value: totals?.entered_today, hint: "Submitted for review" },
    { title: "Sent back", value: totals?.sent_back, hint: "Returned by the owner - redo" },
  ];

  return (
    <EntryShell
      mode="entry"
      title="Your queue"
      actions={
        <SubmitButton type="button" pending={starting} pendingLabel="Taking a page…" onClick={startNext}>
          Start next item
          <ArrowRight className="h-4 w-4 ml-2" />
        </SubmitButton>
      }
    >
      <div className="h-full flex flex-col gap-6">
        <p className="shrink-0 -mt-4 text-sm text-muted-foreground">
          Today's pages first, then by priority, then oldest first. Taking an item locks it to you.
        </p>

        <div className="shrink-0 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {cards.map((card) => (
            <MetricCard key={card.title} title={card.title} value={card.value ?? 0} hint={card.hint} loading={!queue} />
          ))}
        </div>

        <section className="flex-1 min-h-0 flex flex-col">
          <h2 className="shrink-0 text-xl font-semibold mb-4">Up next ({totals?.waiting ?? 0})</h2>
          <div className="shrink-0 bg-card rounded-lg border h-[35px] flex items-center px-4 mb-[10px]">
            <div className={`${GRID} text-sm font-medium text-muted-foreground`}>
              <div>Item</div><div>Type</div><div>Book</div><div>Priority</div><div>Uploaded</div><div>Note</div>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-[10px]">
            {queue && queue.items.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Nothing waiting. Well done.</p>
            )}
            {(queue?.items || []).map((item) => {
              const type = BACKLOG_TYPES[item.type];
              const priority = BACKLOG_PRIORITIES[priorityOf(item)];
              const sentBack = item.rejection_count > 0 && item.review_note;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => open(item)}
                  disabled={openingId !== null}
                  className={`w-full text-left bg-card rounded-lg h-[35px] flex items-center px-4 hover:border-primary disabled:opacity-60 ${sentBack ? "border border-red-300" : item.mine ? "border-2 border-[#4285F4]" : "border border-border"}`}
                >
                  <div className={`${GRID} text-sm`}>
                    <div className="font-medium">#{item.id}</div>
                    <div><Pill tone={type?.tone || ""}>{type?.label || item.type}</Pill></div>
                    <div className="truncate" title={item.book_label}>{item.book_label || "-"}</div>
                    <div><Pill tone={priority.tone}>{priority.label}</Pill></div>
                    <div className="text-muted-foreground">{formatWhen(item.created_at)}</div>
                    <div className={`truncate ${sentBack ? "text-red-700" : "text-muted-foreground"}`}
                      title={sentBack ? item.review_note : item.notes}>
                      {item.mine ? "Open - you have this page" : sentBack ? `Sent back: ${item.review_note}` : item.notes || ""}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </EntryShell>
  );
}
