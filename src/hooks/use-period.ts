import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ALL_TIME, loadPeriod, savePeriod, withPeriod } from "../../services/periods";

type Period = { key: string; from?: string; to?: string };

/**
 * A period that a dashboard card remembers in this browser, so the dashboard
 * opens the way it was left.
 */
export function usePersistentPeriod(storageKey: string, fallback: Period) {
  const [period, setPeriodState] = useState<Period>(() => loadPeriod(storageKey, fallback));
  const setPeriod = (next: Period) => {
    setPeriodState(next);
    savePeriod(storageKey, next);
  };
  return [period, setPeriod] as const;
}

/**
 * A list's search and its filters, kept apart and sent together.
 *
 * The search box and the filter dialog both call the page's fetch function
 * with a query string, and each used to replace the other: typing a search
 * dropped the applied filters, and applying filters dropped the search. The
 * argument now says what changed:
 *
 *   undefined           refetch with the current search and filters
 *                       (after a delete, a period change, first load)
 *   null                the search box was cleared
 *   "?search=..."       a new search (useDebouncedSearch / formatSearchQuery)
 *   "" or "?a=b&..."    new filters from the dialog ("" = cleared)
 *
 * and `track` returns both combined.
 *
 *   const list = useListQuery();
 *   const fetchRows = async (query?: string | null) => {
 *     const rows = await api.list(token, list.track(query));
 *   };
 */
export function useListQuery() {
  const searchRef = useRef("");
  const filtersRef = useRef("");

  const track = (query?: string | null) => {
    if (query === null) {
      searchRef.current = "";
    } else if (query !== undefined) {
      if (query.startsWith("?search=")) searchRef.current = query;
      else filtersRef.current = query;
    }
    return combineQueries(searchRef.current, filtersRef.current);
  };

  return { track };
}

/** "?search=ali" + "?status=C" -> "?search=ali&status=C" ("" when neither). */
export function combineQueries(...queries: string[]) {
  const params = new URLSearchParams();
  queries.forEach((query) => {
    new URLSearchParams((query || "").replace(/^\?/, "")).forEach((value, key) => params.set(key, value));
  });
  const text = params.toString();
  return text ? `?${text}` : "";
}

/**
 * Fetches whatever a card shows for a period, again whenever the period (or
 * refreshKey) changes.
 *
 *   loading     - true until the first answer: the whole card is a placeholder
 *   refreshing  - true while a later answer is on its way: only the figure is
 *
 * A slower, older request that lands after a newer one is dropped, so a card
 * never shows the figure for the period before last.
 */
export function usePeriodFetch<T>(
  fetcher: (period: Period) => Promise<T | null>,
  period: Period,
  errorMessage: string,
  refreshKey?: unknown,
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const latest = useRef(0);

  // The fetcher closes over the token and is a new function every render, so
  // it is read through a ref rather than made an effect dependency.
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const periodKey = JSON.stringify(period);
  useEffect(() => {
    const ticket = ++latest.current;
    setRefreshing(true);
    (async () => {
      try {
        const res = await fetcherRef.current(period);
        if (ticket !== latest.current) return;
        if (res == null) {
          toast.error(errorMessage);
        } else {
          setData(res);
        }
      } catch (error) {
        console.log(error);
        if (ticket === latest.current) toast.error(errorMessage);
      } finally {
        if (ticket === latest.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodKey, refreshKey]);

  return { data, loading, refreshing };
}

/**
 * The page switch on a list page, and the cards that summarise its table.
 *
 * The table's own search and filters arrive as a query string, from the
 * search box or the filter dialog. `track` remembers the latest one and hands
 * it back with the period added; the page fetches its rows with that, and the
 * summary is fetched here with the very same query - so the cards always
 * describe the rows on screen.
 *
 *   const list = useListPeriod((q) => getSalesSummary(token, q), "Failed to …");
 *   const fetchRows = async (query?: string | null) => {
 *     const q = list.track(query);          // see useListQuery for what query means
 *     const rows = await getSalesInvoiceList(token, q);
 *     …
 *   };
 *
 * Changing the period refetches nothing by itself; the page refetches its
 * rows in an effect on `list.period`, which calls track() again.
 */
export function useListPeriod(
  // The summaries come from plain-JS API helpers, so they are untyped here
  // the way every other API response in the app is.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fetchSummary: (query: string) => Promise<any>,
  errorMessage: string,
  initial: Period = ALL_TIME,
) {
  const [period, setPeriod] = useState<Period>(initial);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [summary, setSummary] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryRefreshing, setSummaryRefreshing] = useState(false);

  const query = useListQuery();
  const latest = useRef(0);
  // Read when track() runs, which may be from a closure older than the last
  // period change (the search hook's debounce), so it cannot be state alone.
  const periodRef = useRef(period);
  periodRef.current = period;

  const fetchRef = useRef(fetchSummary);
  useEffect(() => {
    fetchRef.current = fetchSummary;
  });

  const loadSummary = async (query: string) => {
    const ticket = ++latest.current;
    setSummaryRefreshing(true);
    try {
      const res = await fetchRef.current(query);
      if (ticket !== latest.current) return;
      if (res == null) {
        toast.error(errorMessage);
      } else {
        setSummary(res);
      }
    } catch (error) {
      console.log(error);
      if (ticket === latest.current) toast.error(errorMessage);
    } finally {
      if (ticket === latest.current) {
        setSummaryLoading(false);
        setSummaryRefreshing(false);
      }
    }
  };

  // The search and the filters (useListQuery's rules), with the period added.
  const track = (change?: string | null) => {
    const withThePeriod = withPeriod(query.track(change), periodRef.current);
    loadSummary(withThePeriod);
    return withThePeriod;
  };

  return { period, setPeriod, track, summary, summaryLoading, summaryRefreshing };
}

/**
 * Runs `effect` when `value` changes, but not on mount - for refetching on a
 * period change on pages that already fetch everything in a mount effect.
 */
export function useOnChange(value: unknown, effect: () => void) {
  const mounted = useRef(false);
  const key = JSON.stringify(value);
  const effectRef = useRef(effect);
  useEffect(() => {
    effectRef.current = effect;
  });
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    effectRef.current();
  }, [key]);
}
