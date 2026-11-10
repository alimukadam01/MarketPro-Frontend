import { ChartCard } from "@/components/dashboard/ChartCard";
import { usePeriodFetch, usePersistentPeriod } from "@/hooks/use-period";
import { CARD_PERIODS, periodHint } from "../../../services/periods";

type Period = { key: string; from?: string; to?: string };
type Trend = {
  trend: { label: string; value: number }[];
  period?: { key: string; date_from: string | null; date_to: string | null };
};

interface PeriodChartCardProps {
  title: string;
  /** Remembers this chart's period in the browser: "dashboard-sales-trend". */
  storageKey: string;
  defaultPeriod: Period;
  /** Asks for the trend for a period: { trend, period }. */
  fetcher: (period: Period) => Promise<Trend | null>;
  color: string;
  errorMessage: string;
}

/**
 * A trend chart with its own period switch, for the dashboard. The backend
 * cuts the period into buckets - hours today, days for a week or a month,
 * weeks for a quarter, months for a year - so the line keeps a readable shape.
 */
export function PeriodChartCard({
  title, storageKey, defaultPeriod, fetcher, color, errorMessage,
}: PeriodChartCardProps) {
  const [period, setPeriod] = usePersistentPeriod(storageKey, defaultPeriod);
  const { data, loading, error } = usePeriodFetch(fetcher, period, errorMessage);

  return (
    <ChartCard
      title={title}
      data={data ? data.trend : null}
      color={color}
      loading={loading}
      error={error}
      hint={periodHint(data?.period)}
      period={period}
      periodOptions={CARD_PERIODS}
      onPeriodChange={setPeriod}
    />
  );
}
