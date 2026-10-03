import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  /**
   * True while the body is still being fetched. The WHOLE card is replaced by
   * a placeholder - never just the figure or the chart inside it.
   */
  loading?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * The shell every dashboard card shares: the chrome, the title, and the
 * whole-card loading placeholder.
 *
 * MetricCard and ChartCard both sat on their own copy of this, which is how
 * they drifted - one skeletoned the entire card while the other skeletoned
 * only its chart area and left a titled empty box behind.
 *
 * They are still two components rather than one with a variant prop, and the
 * reason is weight, not taste: ChartCard pulls in recharts (~5 MB), and it is
 * used on two pages where MetricCard is used on twenty. One merged component
 * would drag the charting library into every list page's chunk.
 *
 * The placeholder wraps the real structure rendered invisible, so it takes the
 * card's exact height rather than a hardcoded one. A magic number would stop
 * matching the first time the padding or the type scale changed, and the row
 * would jump as the data landed - the reflow the placeholder exists to avoid.
 */
export function StatCard({ title, loading = false, className, children }: StatCardProps) {
  const body = (
    <>
      <div className="text-sm text-muted-foreground mb-2">{title}</div>
      {children}
    </>
  );

  if (loading) {
    return (
      // border-transparent, not no border: the loaded card has a 1px border and
      // box-sizing is border-box, so without it the placeholder is 2px smaller
      // in both axes and the card visibly resizes as data lands.
      <Skeleton className={cn("rounded-lg border border-transparent", className)}>
        <div className="invisible p-6" aria-hidden="true">
          {body}
        </div>
      </Skeleton>
    );
  }

  return (
    // fade-in on the real card: the placeholder and the content are the same
    // size now, so the only thing left to soften is the swap itself.
    <div
      className={cn(
        "bg-card rounded-lg p-6 border",
        "animate-in fade-in duration-300",
        className
      )}
    >
      {body}
    </div>
  );
}
