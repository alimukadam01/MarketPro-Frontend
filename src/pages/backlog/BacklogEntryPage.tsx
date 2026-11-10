import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { INVOICE_TYPES, type OwnerEntry, type WorkEntry } from "@/components/backlog/meta";
import BacklogInvoiceEntry from "./BacklogInvoiceEntry";
import BacklogListEntry from "./BacklogListEntry";
import { useAuth } from "../../../services/AuthProvider";
import { backlogEntriesAPIPackage, getWorkEntry } from "../../../services/api";

/**
 * /backlog/work/:id - a page the entry person has taken.
 * /backlog/review/:id - the same screen, for the owner checking it.
 *
 * Loads the page through the work endpoint either way, so both see exactly
 * what was entered; the owner also gets who entered it and how long it took.
 */
export function BacklogEntryPage({ mode }: { mode: "entry" | "review" }) {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<WorkEntry | null>(null);
  const [review, setReview] = useState<OwnerEntry | null>(null);

  const load = useCallback(async () => {
    if (!token || !id) return;
    try {
      const res = await getWorkEntry(token, id);
      if (res.ok) {
        setEntry(res.data);
        return;
      }
      if (res.status !== 403 && res.error) toast.error(res.error);
      navigate(mode === "review" ? "/backlog" : "/backlog/work", { replace: true });
    } catch (error) {
      console.log("Error loading the page:", error);
      toast.error("Failed to load the page.");
    }
  }, [token, id, mode, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (mode !== "review" || !token || !id) return;
    const fetchReview = async () => {
      try {
        const data = await backlogEntriesAPIPackage.detail(token, id);
        if (data) setReview(data);
      } catch (error) {
        console.log("Error loading the page's history:", error);
      }
    };
    fetchReview();
  }, [mode, token, id]);

  if (!entry) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Spinner size={24} label="Loading" color="hsl(var(--spinner))" />
      </div>
    );
  }

  return INVOICE_TYPES.includes(entry.type)
    ? <BacklogInvoiceEntry entry={entry} mode={mode} review={review} />
    : <BacklogListEntry entry={entry} mode={mode} review={review} reload={load} />;
}

/** Keyed on the page, so Submit & next starts the next page from a clean screen. */
export function BacklogWorkRoute() {
  const { id } = useParams();
  return <BacklogEntryPage key={`work-${id}`} mode="entry" />;
}

export function BacklogReviewRoute() {
  const { id } = useParams();
  return <BacklogEntryPage key={`review-${id}`} mode="review" />;
}
