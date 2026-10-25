import { AreaChart, Area, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { StatCard } from "@/components/dashboard/StatCard";
import { PeriodSwitch } from "@/components/ui/period-switch";

type Period = { key: string; from?: string; to?: string };

interface ChartCardProps {
  title: string;
  /**
   * One point per bucket - an hour, a day, a week or a month, as the period
   * decides - labelled for the axis. Null while loading; never pass a
   * zero-filled array (see `loading`).
   */
  data: { label?: string; day?: string; value: number }[] | null;
  color?: string;
  valueLabel?: string;
  /**
   * True while the trend is still being fetched.
   *
   * The dashboard used to seed both trends with Array(30).fill(0), so before
   * the data arrived it drew a confident flat line along zero for a month.
   * That is worse than an empty card: it is a readable, wrong answer. Seed the
   * state as null and pass loading instead.
   */
  loading?: boolean;
  /**
   * True when the trend could not be fetched. Without it a chart whose fetch
   * failed kept `data` null and spun for ever; now a red hazard sign says it
   * failed.
   */
  error?: boolean;
  /** The period line, set beside the heading in a smaller size. */
  hint?: string;
  /** Give all three to put a period switch in the card's corner. */
  period?: Period;
  periodOptions?: { key: string; label: string }[];
  onPeriodChange?: (period: Period) => void;
  /** How the tooltip shows a point. Money unless told otherwise. */
  formatValue?: (value: number) => string;
}

const formatCurrency = (amount) => `PKR ${Number(amount || 0).toLocaleString()}`;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Older trends (the Accounting cash chart) send { day: "YYYY-MM-DD" } rather
// than a ready label; they get "20 Oct".
const withLabels = (data) => data && data.map((point) => {
  if (point.label || !point.day) return point;
  const [, month, day] = point.day.split("-").map(Number);
  return { ...point, label: `${day} ${MONTHS[month - 1]}` };
});

/**
 * A trend on a card: a line with the area under it shaded in its colour.
 *
 * Shares StatCard with MetricCard, so the chrome, the title and the whole-card
 * placeholder are defined once. They stay separate components because this one
 * pulls in recharts (~5 MB) and is used on two pages, where MetricCard is used
 * on twenty - merging them would drag the charting library into every list
 * page's chunk.
 */
export function ChartCard({
  title, data, color = "#8b5cf6", valueLabel = "Amount", loading = false,
  error = false, hint, period, periodOptions, onPeriodChange, formatValue = formatCurrency,
}: ChartCardProps) {
  // Unique per chart: two charts sharing a gradient id would both paint with
  // whichever was defined first.
  const gradientId = `chart-fill-${title.replace(/\W+/g, "-").toLowerCase()}`;

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
    // overflow-hidden is the backstop: ResponsiveContainer measures its parent
    // and writes a fixed pixel width onto the chart, so if it ever lags behind
    // a shrinking container the chart must be clipped to the card rather than
    // drawn over whatever sits beside it. min-w-0 lets the card shrink inside
    // a grid/flex parent.
    <StatCard
      title={title}
      // The chart frame stays on screen while it loads; the spinner beside
      // the title says so, and the line draws in when the data lands.
      loading={loading || (!data && !error)}
      error={error}
      className="overflow-hidden min-w-0"
      titleClassName="text-foreground whitespace-nowrap"
      titleAside={hint ? (
        <span className="truncate text-base text-muted-foreground">{hint}</span>
      ) : null}
      action={action}
    >
      <div className="h-48 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={withLabels(data) || []} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <YAxis hide />
            {/* No x axis: the period line beside the heading says what the
                chart covers, and the tooltip names each point. */}
            <Tooltip
              labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ""}
              formatter={(value) => [formatValue(Number(value)), valueLabel]}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
                fontSize: "0.875rem",
              }}
              labelStyle={{ color: "hsl(var(--muted-foreground))" }}
              itemStyle={{ color: "hsl(var(--foreground))" }}
              cursor={{ stroke: "hsl(var(--border))" }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              // Every point always shown, not only the one under the cursor.
              dot={{ r: 3, fill: color, stroke: color, strokeWidth: 1 }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </StatCard>
  );
}
