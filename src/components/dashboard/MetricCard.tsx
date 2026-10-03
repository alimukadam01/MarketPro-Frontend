import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  /** Optional third line, e.g. "as of 1 Aug 2026 · PKR 5,000 left". */
  hint?: string;
  /**
   * True while the figure is still being fetched. The card shows a placeholder
   * bar instead of the value.
   *
   * This matters more than it looks: every counter on these pages was seeded at
   * 0, so a loading dashboard rendered "PKR 0" across the board - not a missing
   * figure but a confident claim that the business had done nothing. Never pass
   * a zero-initialised value with loading={false}.
   */
  loading?: boolean;
  className?: string;
}

/**
 * The one metric card.
 *
 * There used to be two: this component (6 pages) and a hand-rolled div
 * repeated on 15 more. They differed in size, border and spacing, so the same
 * figure looked different depending on which screen you were on. This keeps
 * the hand-rolled styling, which was the more common of the two, so those 15
 * pages are unchanged by the consolidation.
 */
export function MetricCard({ title, value, hint, loading = false, className }: MetricCardProps) {
  return (
    <div className={cn("bg-card rounded-lg p-6 border", className)}>
      <div className="text-sm text-muted-foreground mb-2">{title}</div>

      {loading ? (
        // Matches the 36px line box of text-3xl so the card does not resize
        // when the real figure lands.
        <div className="flex h-9 items-center">
          <Skeleton className="h-7 w-32" />
        </div>
      ) : (
        <div className="text-3xl font-bold">{value}</div>
      )}

      {hint && !loading && (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      )}
      {hint && loading && <Skeleton className="mt-1 h-3 w-40" />}
    </div>
  );
}
