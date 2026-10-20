import { StatCard } from "@/components/dashboard/StatCard";
import { RollingValue } from "@/components/dashboard/RollingValue";
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
   * True while the figure is still being fetched for the first time. The card
   * shows with the spinner beside its title and reads 0; the real figure
   * rolls up from 0 when it lands.
   */
  loading?: boolean;
  /**
   * True while a new figure is fetched for a card already showing one - after
   * a period change, a search or a filter. Same spinner; the old figure stays
   * until the new one rolls in.
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
    <StatCard title={title} loading={loading || valueLoading} className={className} action={action}>
      {/* tabular-nums keeps every digit the same width, so the figure does
          not shiver sideways as it rolls. */}
      <div className={cn("text-3xl font-bold tabular-nums", valueClassName)}>
        <RollingValue value={value} />
      </div>
      {hint && <p className="mt-1 text-base text-muted-foreground">{hint}</p>}
    </StatCard>
  );
}
