import { MetricCard } from "@/components/dashboard/MetricCard";
import { usePeriodFetch, usePersistentPeriod } from "@/hooks/use-period";
import { CARD_PERIODS, periodHint } from "../../../services/periods";

type Period = { key: string; from?: string; to?: string };
// The figures come from plain-JS API helpers, so they are untyped here the
// way every other API response in the app is.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Summary = any;

interface PeriodMetricCardProps {
  title: string;
  /** Remembers this card's period in the browser: "dashboard-sales-invoiced". */
  storageKey: string;
  defaultPeriod: Period;
  /** Asks for the figures for a period; the response carries `period`. */
  fetcher: (period: Period) => Promise<Summary | null>;
  /** Picks this card's figure out of the response, formatted. */
  pick: (data: Summary) => string | number;
  errorMessage: string;
}

/**
 * A metric card with its own period switch, for the dashboard: each card is
 * about one figure and keeps its own period, so it fetches for itself.
 */
export function PeriodMetricCard({
  title, storageKey, defaultPeriod, fetcher, pick, errorMessage,
}: PeriodMetricCardProps) {
  const [period, setPeriod] = usePersistentPeriod(storageKey, defaultPeriod);
  const { data, loading, refreshing } = usePeriodFetch(fetcher, period, errorMessage);

  return (
    <MetricCard
      title={title}
      value={data ? pick(data) : null}
      hint={periodHint(data?.period)}
      loading={loading}
      valueLoading={refreshing}
      period={period}
      periodOptions={CARD_PERIODS}
      onPeriodChange={setPeriod}
    />
  );
}
