import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, BookOpen, Clock, CornerUpLeft, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { GlossaryDialog, NoteDialog } from "./BacklogDialogs";
import { BACKLOG_TYPES, Pill, formatSeconds, formatWhen, personName, type OwnerEntry, type WorkEntry } from "./meta";
import { useAuth } from "../../../services/AuthProvider";
import {
  approveBacklogEntry,
  cantReadWorkEntry,
  claimWorkEntry,
  getBacklogReviewQueue,
  getWorkQueue,
  releaseWorkEntry,
  sendBackBacklogEntry,
  submitWorkEntry,
} from "../../../services/api";

// What the person has chosen to work on (BUGS #002): "all", or one page type.
// Remembered per account on this browser; the queue page sets it, and every
// "& next" follows it.
export const ALL_TYPES = "all";
const workingOnKey = (userId: unknown) => `mp-backlog-working-on:${userId ?? "me"}`;

export function loadWorkingOn(userId: unknown) {
  try {
    return localStorage.getItem(workingOnKey(userId)) || ALL_TYPES;
  } catch {
    return ALL_TYPES;
  }
}

export function saveWorkingOn(userId: unknown, type: string) {
  try {
    localStorage.setItem(workingOnKey(userId), type);
  } catch {
    // Private mode or blocked storage: the choice lasts this visit only.
  }
}

/** "Sales invoice" -> "sales invoices", for the messages. */
export const typePlural = (type: string) => `${(BACKLOG_TYPES[type]?.label || type).toLowerCase()}s`;

type Claimed = { id: number | null; failed: boolean; type: string | null; ranOut: string | null };

/**
 * Takes the next page off the queue for this user, trying the next one along
 * whenever someone else got there first (409). The queue's order is the
 * server's: the user's own open page, then by type (stock lists, purchase
 * invoices, sales invoices), then pages sent back, today's, high priority,
 * oldest.
 *
 * With one type chosen, only that type is taken. When it has run out, the
 * following types are tried in that order, wrapping round - sales invoices
 * run out into stock lists - and `ranOut` names the type that ran out, for
 * the message. The choice itself is kept: new pages of it come first again.
 */
export async function claimNextPage(token: string, skipId: number | null = null, type: string = ALL_TYPES): Promise<Claimed> {
  const tryQueue = async (kind: string | null) => {
    const queue = await getWorkQueue(token, kind);
    if (!queue) return { queue: null, id: null, failed: true, type: null };
    for (const item of queue.items) {
      if (item.id === skipId) continue;
      if (item.mine) return { queue, id: item.id, failed: false, type: item.type };
      const res = await claimWorkEntry(token, item.id);
      if (res.ok) return { queue, id: item.id, failed: false, type: item.type };
      if (res.status !== 409) return { queue, id: null, failed: true, type: null };
    }
    return { queue, id: null, failed: false, type: null };
  };

  const chosen = type && type !== ALL_TYPES ? type : null;
  const first = await tryQueue(chosen);
  if (first.id || first.failed || !chosen) return { id: first.id, failed: first.failed, type: first.type, ranOut: null };

  const order: string[] = first.queue?.type_order || [];
  const waiting = first.queue?.totals?.waiting_by_type || {};
  const at = order.indexOf(chosen);
  for (let step = 1; step < order.length; step++) {
    const kind = order[(at + step) % order.length];
    if (!waiting[kind]) continue;
    const next = await tryQueue(kind);
    if (next.id || next.failed) return { id: next.id, failed: next.failed, type: next.type, ranOut: chosen };
  }
  return { id: null, failed: false, type: null, ranOut: chosen };
}

/** The message for a type that ran out and the one carried on with. */
export const ranOutMessage = (ranOut: string, now: string) =>
  `No more ${typePlural(ranOut)}. Now on ${typePlural(now)}.`;

/** The next page waiting for the owner after this one, if any. */
async function nextForReview(token: string, currentId: number) {
  const queue = (await getBacklogReviewQueue(token)) || [];
  const entered = queue.filter((row) => row.status === "entered");
  const next = entered.find((row) => row.id !== currentId);
  return next ? next.id : null;
}

interface UseEntryFlowOptions {
  /** The page, as /backlog-work/{id}/ returns it. */
  entry: WorkEntry;
  mode: "entry" | "review";
  /** The owner's view of the same page - who entered it, when, how long. */
  review?: OwnerEntry | null;
  /**
   * Called before the page is handed in, approved or sent back: an invoice
   * screen saves the invoice here. Resolves false to stop (it has said why).
   */
  beforeFinish?: () => Promise<boolean>;
  /** Whether there is anything entered yet - Submit needs something. */
  hasOutputs: boolean;
  /**
   * A stock list: each line is saved as it is entered, so
   * the page can be left and come back to, and it is handed in with "Mark
   * page complete" rather than released.
   */
  list?: boolean;
}

/**
 * Everything around the form on an entry screen: the timer, the pills beside
 * the title, the buttons at the right end of it, and their dialogs.
 *
 *  entry   Release to queue · Glossary · Return page · Submit & next
 *  review  3 of 41 · Glossary · Send back · Approve & next
 */
export function useEntryFlow({ entry, mode, review, beforeFinish, hasOutputs, list = false }: UseEntryFlowOptions) {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [seconds, setSeconds] = useState(0);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [cantReadOpen, setCantReadOpen] = useState(false);
  const [sendBackOpen, setSendBackOpen] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [position, setPosition] = useState<{ index: number; total: number } | null>(null);
  const counting = useRef(true);

  // Time on the page, counted only while the tab is in view: a page left open
  // over lunch is not five hours of work.
  useEffect(() => {
    if (mode !== "entry") return;
    const onVisibility = () => { counting.current = document.visibilityState === "visible"; };
    document.addEventListener("visibilitychange", onVisibility);
    const tick = setInterval(() => {
      if (counting.current) setSeconds((value) => value + 1);
    }, 1000);
    return () => {
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [mode]);

  useEffect(() => {
    if (mode !== "review" || !token || !entry) return;
    const fetchPosition = async () => {
      try {
        const queue = (await getBacklogReviewQueue(token)) || [];
        const entered = queue.filter((row) => row.status === "entered");
        const index = entered.findIndex((row) => row.id === entry.id);
        setPosition({ index: index + 1, total: entered.length });
      } catch (error) {
        console.log("Error fetching the review queue:", error);
      }
    };
    fetchPosition();
  }, [mode, token, entry]);

  const goToNextPage = async () => {
    const next = await claimNextPage(token, entry.id, loadWorkingOn(user?.id));
    if (next.id) {
      if (next.ranOut && next.type) toast(ranOutMessage(next.ranOut, next.type));
      navigate(`/backlog/work/${next.id}`, { replace: true });
    } else {
      if (!next.failed) toast.success("That was the last page in the queue.");
      navigate("/backlog/work", { replace: true });
    }
  };

  const goToNextReview = async () => {
    const next = await nextForReview(token, entry.id);
    if (next) {
      navigate(`/backlog/review/${next}`, { replace: true });
    } else {
      toast.success("Nothing else is waiting for review.");
      navigate("/backlog", { replace: true });
    }
  };

  const submit = async () => {
    setFinishing(true);
    try {
      if (beforeFinish && !(await beforeFinish())) return;
      const res = await submitWorkEntry(token, entry.id, seconds);
      if (!res.ok) {
        if (res.error) toast.error(res.error);
        return;
      }
      toast.success(`Item #${entry.id} sent for review.`);
      await goToNextPage();
    } catch (error) {
      console.log("Error submitting the page:", error);
      toast.error("Failed to submit the page.");
    } finally {
      setFinishing(false);
    }
  };

  const release = async () => {
    try {
      const res = await releaseWorkEntry(token, entry.id);
      if (res.ok) {
        toast.success(`Item #${entry.id} is back in the queue.`);
        navigate("/backlog/work", { replace: true });
      } else if (res.error) {
        toast.error(res.error);
      }
    } catch (error) {
      console.log("Error releasing the page:", error);
      toast.error("Failed to release the page.");
    }
  };

  const cantRead = async (note: string) => {
    try {
      const res = await cantReadWorkEntry(token, entry.id, note, seconds);
      if (!res.ok) {
        if (res.error) toast.error(res.error);
        return false;
      }
      toast.success(`Item #${entry.id} returned to the owner.`);
      await goToNextPage();
      return true;
    } catch (error) {
      console.log("Error flagging the page:", error);
      toast.error("Failed to return the page.");
      return false;
    }
  };

  const approve = async () => {
    setFinishing(true);
    try {
      if (beforeFinish && !(await beforeFinish())) return;
      const res = await approveBacklogEntry(token, entry.id);
      if (!res.ok) {
        if (res.error) toast.error(res.error);
        return;
      }
      toast.success(`Item #${entry.id} approved.`);
      await goToNextReview();
    } catch (error) {
      console.log("Error approving the page:", error);
      toast.error("Failed to approve the page.");
    } finally {
      setFinishing(false);
    }
  };

  const sendBack = async (reason: string) => {
    try {
      // What the owner corrected before sending the page back is kept, as on
      // Approve: the entry person picks it up with those corrections in it.
      if (beforeFinish && !(await beforeFinish())) return false;
      const res = await sendBackBacklogEntry(token, entry.id, reason);
      if (!res.ok) {
        if (res.error) toast.error(res.error);
        return false;
      }
      toast.success(`Item #${entry.id} sent back to the queue.`);
      await goToNextReview();
      return true;
    } catch (error) {
      console.log("Error sending the page back:", error);
      toast.error("Failed to send the page back.");
      return false;
    }
  };

  const type = BACKLOG_TYPES[entry?.type] || { label: entry?.type, tone: "bg-gray-100 text-gray-700" };

  const aside = entry ? (
    <>
      <Pill tone={type.tone}>{type.label}</Pill>
      {entry.book_label && <Pill tone="bg-gray-100 text-gray-700">Book: {entry.book_label}</Pill>}
      {mode === "entry" && list ? (
        <span className="text-sm text-muted-foreground">Saved as you go - you can leave and come back</span>
      ) : mode === "entry" ? (
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground tabular-nums">
          <Clock className="h-4 w-4" />
          {formatSeconds(seconds)} on this item
        </span>
      ) : (
        <>
          <Pill tone="bg-yellow-100 text-yellow-700">Waiting for review</Pill>
          {review && (
            <span className="min-w-0 truncate text-sm text-muted-foreground">
              Entered by {personName(review.entered_by)} · {formatWhen(review.entered_at)}
              {review.seconds_spent ? ` · ${formatSeconds(review.seconds_spent)}` : ""}
            </span>
          )}
        </>
      )}
    </>
  ) : null;

  const actions = !entry ? null : mode === "entry" ? (
    <>
      {!list && (
        <Button type="button" variant="ghost" onClick={release}
          title="Put the page back in the queue for anyone to take">
          <Undo2 className="h-4 w-4 mr-2" />
          Release to queue
        </Button>
      )}
      <Button type="button" variant="outline" onClick={() => setGlossaryOpen(true)}>
        <BookOpen className="h-4 w-4 mr-2" />
        Glossary
      </Button>
      {/* "Return page" to the person entering; the owner's screens and the
          code still call it can't read (cant_read). */}
      <Button type="button" variant="outline" onClick={() => setCantReadOpen(true)}
        title="Send the page back to the owner with your reason">
        <CornerUpLeft className="h-4 w-4 mr-2" />
        Return page
      </Button>
      <SubmitButton type="button" pending={finishing} pendingLabel="Submitting…" onClick={submit}
        disabled={!hasOutputs && !beforeFinish}>
        {list ? "Mark page complete" : "Submit & next"}
        <ArrowRight className="h-4 w-4 ml-2" />
      </SubmitButton>
    </>
  ) : (
    <>
      {position && position.index > 0 && (
        <span className="text-sm text-muted-foreground tabular-nums">
          {position.index} of {position.total}
        </span>
      )}
      <Button type="button" variant="outline" onClick={() => setGlossaryOpen(true)}>
        <BookOpen className="h-4 w-4 mr-2" />
        Glossary
      </Button>
      <Button type="button" variant="outline" onClick={() => setSendBackOpen(true)}>
        <Undo2 className="h-4 w-4 mr-2" />
        Send back
      </Button>
      <SubmitButton type="button" pending={finishing} pendingLabel="Approving…" onClick={approve}>
        Approve &amp; next
        <ArrowRight className="h-4 w-4 ml-2" />
      </SubmitButton>
    </>
  );

  const dialogs = entry ? (
    <>
      <GlossaryDialog
        open={glossaryOpen}
        setOpen={setGlossaryOpen}
        entryId={entry.id}
        canSuggest={mode === "entry"}
      />
      <NoteDialog
        open={cantReadOpen}
        setOpen={setCantReadOpen}
        title="Return this page?"
        description={`Item #${entry.id} goes back to the owner with your note. Anything you entered from it is kept until they decide.`}
        label="Why are you returning it?"
        placeholder="The bottom half is cut off - the total and the last two lines are missing."
        confirmLabel="Return page & next"
        onConfirm={cantRead}
      />
      <NoteDialog
        open={sendBackOpen}
        setOpen={setSendBackOpen}
        title={`Send back item #${entry.id}?`}
        description="It goes back to the entry queue, at the top, with your reason."
        label="Reason"
        placeholder="The customer is Shafiq Ahmed, not Shafiq Traders."
        hint="The entry person sees this when they open the page again."
        confirmLabel="Send back & next"
        onConfirm={sendBack}
      />
    </>
  ) : null;

  return { aside, actions, dialogs, seconds };
}
