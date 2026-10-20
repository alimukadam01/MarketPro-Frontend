import { StatCard } from "@/components/dashboard/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import { PeriodSwitch } from "@/components/ui/period-switch";
import { cn } from "@/lib/utils";

type Period = { key: string; from?: string; to?: string };

interface MetricCardProps {
  title: string;
  value: string | number;
  /**
   * The line under the figure. On a period card it names the period - "This
   * month · 1 Oct – 20 Oct 2026" - and on a balance card it says "As of today".
   */
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
  /**
   * True while a new figure is fetched for a card already on screen - after a
   * period change, a search or a filter. Only the figure and its line wait;
   * the card, and the switch that was just clicked, stay put.
   */
  valueLoading?: boolean;
  className?: string;
  /**
   * Extra classes for the figure itself. Some counters colour the number to
   * carry meaning - "Total Restocks Required" is red - and that is part of
   * what the card says, not decoration.
   */
  valueClassName?: string;
  /** Give all three to put a period switch in the card's corner. */
  period?: Period;
  periodOptions?: { key: string; label: string }[];
  onPeriodChange?: (period: Period) => void;
}

/**
 * A single figure on a card.
 *
 * There used to be two of these: this component and a hand-rolled div repeated
 * across the list pages, differing in size, border and spacing, so the same
 * figure looked different depending on the screen. This keeps the hand-rolled
 * styling, which was the more common of the two.
 */
export function MetricCard({
  title, value, hint, loading = false, valueLoading = false, className,
  valueClassName, period, periodOptions, onPeriodChange,
}: MetricCardProps) {
  const action = period && periodOptions && onPeriodChange ? (
    <PeriodSwitch
      size="card"
      label={`${title} period`}
      options={periodOptions}
      value={period}
      onChange={onPeriodChange}
    />
  ) : null;

  return (
    <StatCard title={title} loading={loading} className={className} action={action}>
      {valueLoading ? (
        <div aria-busy="true">
          <Skeleton className="h-9 w-44 rounded-md" />
          {hint && <Skeleton className="mt-1 h-6 w-56 rounded-sm" />}
        </div>
      ) : (
        <>
          {/* ?? not ||: a real 0 must still render as 0. While loading the
              value is null, and an empty block generates no line box, so the
              placeholder would be a full text-3xl line shorter than the card
              it stands in for. */}
          <div className={cn("text-3xl font-bold", valueClassName)}>{value ?? " "}</div>
          {hint && <p className="mt-1 text-base text-muted-foreground">{hint}</p>}
        </>
      )}
    </StatCard>
  );
}
