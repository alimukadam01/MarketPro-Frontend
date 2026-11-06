import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import * as DialogUI from "@/components/ui/dialog";
import { formatWhen, type WorkEntry } from "./meta";
import { useAuth } from "../../../services/AuthProvider";
import { addWorkPage, getJoinablePages } from "../../../services/api";
import { getImageUrl } from "../../../services/utils";

interface JoinPagesProps {
  entryId: number;
  /** Whether a page was uploaded after this invoice's last one. */
  canAdd: boolean;
  /** The page as the server has it after a join: its pages and can_add_page. */
  onChanged: (entry: WorkEntry) => void;
}

/**
 * Under the page photo on an invoice entry screen (BUGS #003): an invoice
 * that runs across several pages is entered once, from all of them.
 *
 * "Add the next page" joins the page uploaded right after this invoice's
 * last; "Choose..." picks another of the same upload, for pages photographed
 * out of order. Both buttons are the list pages' Create button, and together
 * they are the photo's width.
 */
export function JoinPages({ entryId, canAdd, onChanged }: JoinPagesProps) {
  const { token } = useAuth();
  const [joining, setJoining] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [choices, setChoices] = useState<{ id: number; image: string | null; created_at: string }[] | null>(null);

  const join = async (pageId: number | null = null) => {
    setJoining(true);
    try {
      const res = await addWorkPage(token, entryId, pageId);
      if (res.ok) {
        onChanged(res.data);
        setChoosing(false);
        const pages = res.data.pages || [];
        toast.success(`Page ${pages.length} added. Enter the invoice from all ${pages.length} pages.`);
      } else if (res.error) {
        toast.error(res.error);
      }
    } catch (error) {
      console.log("Error adding a page:", error);
      toast.error("Failed to add the page.");
    } finally {
      setJoining(false);
    }
  };

  const openChooser = async () => {
    setChoosing(true);
    setChoices(null);
    try {
      const res = await getJoinablePages(token, entryId);
      if (res.ok) {
        setChoices(res.data);
      } else {
        if (res.error) toast.error(res.error);
        setChoosing(false);
      }
    } catch (error) {
      console.log("Error fetching the pages of this upload:", error);
      toast.error("Failed to fetch the pages of this upload.");
      setChoosing(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1 flex items-center space-x-2"
          disabled={!canAdd || joining}
          title={canAdd ? "Join the page uploaded after this one" : "No more pages in this upload"}
          onClick={() => join()}
        >
          {joining ? <Spinner size={16} /> : <Plus className="w-4 h-4" />}
          <span>Add the next page</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={joining}
          title="Pick another page of this upload"
          onClick={openChooser}
        >
          <span>Choose…</span>
        </Button>
      </div>

      <DialogUI.Dialog open={choosing} onOpenChange={setChoosing}>
        <DialogUI.DialogContent className="max-w-3xl">
          <DialogUI.DialogHeader>
            <DialogUI.DialogTitle>Add a page of this upload</DialogUI.DialogTitle>
            <DialogUI.DialogDescription>
              The pages still waiting in the same upload, in upload order. Pick the one that continues this invoice.
            </DialogUI.DialogDescription>
          </DialogUI.DialogHeader>
          {choices === null ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Spinner size={16} /> Loading the pages…
            </div>
          ) : choices.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">No other page of this upload is waiting.</p>
          ) : (
            <div className="grid max-h-[60vh] grid-cols-4 gap-3 overflow-y-auto">
              {choices.map((page) => (
                <button
                  key={page.id}
                  type="button"
                  disabled={joining}
                  onClick={() => join(page.id)}
                  className="flex flex-col gap-1 rounded-lg border bg-card p-2 text-left hover:border-primary disabled:opacity-60"
                >
                  <div className="aspect-[3/4] overflow-hidden rounded-md bg-muted">
                    {page.image && <img src={getImageUrl(page.image)} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <span className="text-sm font-medium">Item #{page.id}</span>
                  <span className="text-xs text-muted-foreground">{formatWhen(page.created_at)}</span>
                </button>
              ))}
            </div>
          )}
        </DialogUI.DialogContent>
      </DialogUI.Dialog>
    </>
  );
}

export default JoinPages;
