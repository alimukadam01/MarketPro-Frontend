import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  /** Optional third line, e.g. "as of 1 Aug 2026 · PKR 5,000 left". */
  hint?: string;
  /**
   * True while the figure is still being fetched. The WHOLE card is replaced
   * by a placeholder, not just the number inside it.
   *
   * This matters more than it looks: every counter on these pages was seeded at
   * 0, so a loading page rendered "PKR 0" across the board - not a missing
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
  if (loading) {
    // The placeholder wraps the real structure rendered invisible, so it takes
    // exactly the card's height rather than a hardcoded one. A magic number
    // would quietly stop matching the first time the type scale or the padding
    // changed, and the row would jump as the data landed.
    return (
      <Skeleton className={cn("rounded-lg", className)}>
        <div className="invisible p-6" aria-hidden="true">
          <div className="text-sm mb-2">{title}</div>
          <div className="text-3xl font-bold">&nbsp;</div>
          {hint && <p className="mt-1 text-xs">&nbsp;</p>}
        </div>
      </Skeleton>
    );
  }

  return (
    <div className={cn("bg-card rounded-lg p-6 border", className)}>
      <div className="text-sm text-muted-foreground mb-2">{title}</div>
      <div className="text-3xl font-bold">{value}</div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
