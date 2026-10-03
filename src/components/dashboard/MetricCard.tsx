import { StatCard } from "@/components/dashboard/StatCard";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  /** Optional third line, e.g. "as of 1 Aug 2026 · PKR 5,000 left". */
  hint?: string;
  /**
   * True while the figure is still being fetched. StatCard replaces the whole
   * card, not the number inside it.
   *
   * This matters more than it looks: every counter on these pages was seeded at
   * 0, so a loading page rendered "PKR 0" across the board - not a missing
   * figure but a confident claim that the business had done nothing. Never pass
   * a zero-initialised value with loading={false}.
   */
  loading?: boolean;
  className?: string;
  /**
   * Extra classes for the figure itself. Some counters colour the number to
   * carry meaning - "Total Restocks Required" is red - and that is part of
   * what the card says, not decoration.
   */
  valueClassName?: string;
}

/**
 * A single figure on a card.
 *
 * There used to be two of these: this component and a hand-rolled div repeated
 * across the list pages, differing in size, border and spacing, so the same
 * figure looked different depending on the screen. This keeps the hand-rolled
 * styling, which was the more common of the two.
 */
export function MetricCard({ title, value, hint, loading = false, className, valueClassName }: MetricCardProps) {
  return (
    <StatCard title={title} loading={loading} className={className}>
      {/* ?? not ||: a real 0 must still render as 0. While loading the
          value is null, and an empty block generates no line box, so the
          placeholder would be a full text-3xl line shorter than the card
          it stands in for. */}
      <div className={cn("text-3xl font-bold", valueClassName)}>{value ?? " "}</div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </StatCard>
  );
}
