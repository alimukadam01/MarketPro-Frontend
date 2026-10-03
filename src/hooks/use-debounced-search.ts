import { useEffect, useRef, useState } from "react";
import { formatSearchQuery } from "../../services/utils";

/**
 * The search box on a list page: the term, the 400ms debounce, and whether a
 * refetch is currently in flight.
 *
 *   const { searchTerm, setSearchTerm, searching } = useDebouncedSearch(fetchSuppliers);
 *   <SearchField placeholder="Search Suppliers" value={searchTerm}
 *                onChange={setSearchTerm} pending={searching} />
 *
 * Call it AFTER the fetcher's own `const` declaration - the hook reads the
 * function during render, so a call placed above it hits the temporal dead
 * zone.
 *
 * This replaced the same eleven-line effect copy-pasted onto twelve pages. The
 * copies had already drifted in small ways, and none of them reported that a
 * search was running: the table kept showing the previous query's rows with no
 * indication that newer ones were on the way.
 *
 * Deliberately NOT part of the table's `loading` flag. A list page sets that
 * once, for the first load, and leaves it alone afterwards, so a search refetch
 * keeps the current rows on screen instead of collapsing the table into
 * placeholders on every keystroke. The spinner in the search field is what says
 * work is happening.
 */
export function useDebouncedSearch(
  fetcher: (query: string | null) => unknown,
  delay = 400,
) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);

  // The fetcher closes over token and page state, so it is a new function every
  // render and cannot be an effect dependency: the debounce would be rescheduled
  // on each render and, since the effect itself sets state, never fire at all.
  // The ref keeps the effect keyed on the term alone while still calling the
  // current version.
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  // Counted rather than a boolean: if the user keeps typing while a slow request
  // is still open, two can overlap, and the first one to return must not clear a
  // flag the second still needs. Same shape as the in-flight count in
  // use-field-patch.ts.
  const inFlight = useRef(0);

  const mounted = useRef(false);

  useEffect(() => {
    // Skip the mount run. Every one of these pages already fetches its list in
    // a [token, isDeleted] effect, so firing here too meant two identical
    // requests on every page load - and the second one would have shown a
    // spinner for a search the user never typed.
    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    const timer = setTimeout(async () => {
      inFlight.current += 1;
      setSearching(true);
      try {
        // The untrimmed term goes to formatSearchQuery, matching what the pages
        // did before: trim decides whether to search, not what is searched for.
        await fetcherRef.current(searchTerm.trim() ? formatSearchQuery(searchTerm) : null);
      } finally {
        inFlight.current -= 1;
        if (inFlight.current === 0) {
          setSearching(false);
        }
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [searchTerm, delay]);

  return { searchTerm, setSearchTerm, searching };
}
