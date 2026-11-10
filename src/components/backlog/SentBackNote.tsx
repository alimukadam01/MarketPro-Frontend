import { Undo2 } from "lucide-react";

/**
 * The owner's reason, on a page they sent back. What was entered before is
 * still on the page, loaded for correcting, so this says what to look at.
 */
export function SentBackNote({ entry }: { entry: { rejection_count?: number; review_note?: string } }) {
  if (!entry?.rejection_count || !entry.review_note) return null;
  return (
    <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <Undo2 className="h-4 w-4 mt-0.5 shrink-0" />
      <div>
        <span className="font-semibold">Sent back by the owner: </span>
        {entry.review_note}
        <span className="block text-xs text-red-700/80 mt-0.5">
          What was entered before is loaded below. Correct it, then submit again.
        </span>
      </div>
    </div>
  );
}

export default SentBackNote;
