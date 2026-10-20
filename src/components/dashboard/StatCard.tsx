import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  /**
   * True while the body is being fetched - the first load or a refetch after
   * a period, search or filter change. The card stays on screen and the brand
   * spinner turns beside the title; the figure rolls up once it lands.
   */
  loading?: boolean;
  className?: string;
  /** Extra classes for the title - a chart's heading is black, not grey. */
  titleClassName?: string;
  /** Set beside the title, e.g. a chart's period line. */
  titleAside?: React.ReactNode;
  /** At the right end of the title row, e.g. a period switch. */
  action?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * The shell every dashboard card shares: the chrome, the title row and the
 * loading spinner.
 *
 * MetricCard and ChartCard both sat on their own copy of this, which is how
 * they drifted. They are still two components rather than one with a variant
 * prop, and the reason is weight, not taste: ChartCard pulls in recharts
 * (~5 MB), and it is used on two pages where MetricCard is used on twenty. One
 * merged component would drag the charting library into every list page's
 * chunk.
 *
 * Loading used to replace the whole card with a skeleton. Now the card keeps
 * its real shape throughout - nothing jumps when the data lands - and the
 * spinner beside the title says work is under way.
 */
export function StatCard({
  title, loading = false, className, titleClassName, titleAside, action, children,
}: StatCardProps) {
  return (
    <div className={cn("bg-card rounded-lg p-6 border animate-in fade-in duration-300", className)}>
      {/* The title is a heading's size and weight, on the 32px line the
          period switch sits on, so the two read as one row whether or not
          there is one. */}
      <div className="mb-2 flex min-h-8 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className={cn("text-xl leading-8 font-semibold text-muted-foreground", titleClassName)}>
            {title}
          </div>
          {loading && (
            <Spinner size={18} color="hsl(var(--spinner))" label={`Loading ${title}`} />
          )}
          {titleAside}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
