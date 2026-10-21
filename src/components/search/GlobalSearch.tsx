import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SearchField } from "@/components/ui/search-field";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useAuth } from "../../../services/AuthProvider";
import { formatCurrency, formatDate } from "../../../services/utils";
import { SearchHit, useGlobalSearch } from "@/hooks/use-global-search";
import { TONE_CLASSES, iconFor } from "./search-types";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

// Focus belongs to whatever the person is typing in; "/" only summons search
// from elsewhere on the page.
const isTypingIn = (target: EventTarget | null) => {
  const element = target as HTMLElement | null;
  if (!element) return false;
  const tag = element.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || element.isContentEditable;
};

/** The title with every occurrence of the query marked. */
function Highlighted({ text, query }: { text: string; query: string }) {
  const needle = query.trim();
  if (!needle) return <>{text}</>;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "ig"));
  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === needle.toLowerCase() ? (
          <mark key={index} className="rounded-sm bg-primary/15 px-0.5 text-foreground">{part}</mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
}

/**
 * The search box in the header: anything in Market Pro, from one place.
 *
 * Results come grouped by type from GET /global-search/ - five per group, with
 * the group's full count - already limited to what this user may see. Every
 * type renders through the one row below; the backend supplies its label,
 * link and status colour, so a newly registered type needs nothing here.
 *
 * Keyboard: Ctrl+K / ⌘K or "/" focuses the box; ↑ ↓ move through the
 * results, Enter opens one, Esc closes the panel and keeps the text.
 */
export function GlobalSearch() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { term, setTerm, state } = useGlobalSearch(token);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  // Every hit in display order, for the arrow keys.
  const flat = useMemo(() => {
    if (state.kind !== "results") return [] as { hit: SearchHit; type: string }[];
    return state.groups.flatMap((group) => group.hits.map((hit) => ({ hit, type: group.type })));
  }, [state]);

  useEffect(() => setActive(-1), [state]);

  // Ctrl+K / ⌘K anywhere, "/" when not typing in a field.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const shortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
      const slash = event.key === "/" && !isTypingIn(event.target);
      if (shortcut || slash) {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // A click anywhere outside closes the panel.
  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const close = () => {
    setOpen(false);
    setActive(-1);
  };

  // Plain navigation, never `replace`: Back returns to where the search began.
  const openHit = (hit: SearchHit) => {
    if (!hit.link) return;
    close();
    inputRef.current?.blur();
    navigate(hit.link.path, { state: hit.link.state });
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!flat.length) return;
      event.preventDefault();
      setOpen(true);
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((current) => (current + step + flat.length) % flat.length);
    } else if (event.key === "Enter") {
      if (active >= 0 && flat[active]) {
        event.preventDefault();
        openHit(flat[active].hit);
      }
    } else if (event.key === "Escape") {
      close();
    }
  };

  const showPanel = open && state.kind !== "idle";
  const optionId = (index: number) => `${listboxId}-option-${index}`;
  let index = -1;

  return (
    <div className="relative w-full" ref={containerRef}>
      <SearchField
        placeholder="Search invoices, customers, products, payments and more"
        className="w-full pr-16"
        value={term}
        onChange={(value) => {
          setTerm(value);
          setOpen(true);
        }}
        pending={state.kind === "loading"}
        onFocus={() => setOpen(true)}
        inputRef={inputRef}
        inputProps={{
          role: "combobox",
          "aria-label": "Search Market Pro",
          "aria-expanded": showPanel,
          "aria-controls": listboxId,
          "aria-autocomplete": "list",
          "aria-activedescendant": active >= 0 ? optionId(active) : undefined,
          onKeyDown,
          autoComplete: "off",
        }}
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
        {isMac ? "⌘K" : "Ctrl K"}
      </kbd>

      {showPanel && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 max-h-[500px] overflow-y-auto rounded-lg border border-border bg-popover py-2 shadow-lg">
          {state.kind === "loading" && (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
              <Spinner size={16} color="hsl(var(--spinner))" />
              Searching…
            </div>
          )}

          {state.kind === "empty" && (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              No results for “{term.trim()}”.
            </p>
          )}

          {state.kind === "error" && (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              Search failed. Try again.
            </p>
          )}

          {state.kind === "results" && (
            <div id={listboxId} role="listbox" aria-label="Search results">
              {state.groups.map((group) => {
                return (
                  <div key={group.type} role="group" aria-label={group.label} className="pb-2">
                    <div className="flex items-baseline justify-between gap-3 px-4 pb-1 pt-2">
                      <span className="text-sm font-semibold text-foreground">{group.label}</span>
                      {group.total > group.hits.length && (
                        <span className="text-xs text-muted-foreground">
                          {group.hits.length} of {group.total}
                        </span>
                      )}
                    </div>
                    {group.breakdown && group.breakdown.length > 0 && (
                      <p className="px-4 pb-1 text-xs text-muted-foreground">
                        {group.breakdown.map((row) => `${row.label} ${row.count}`).join(" · ")}
                      </p>
                    )}

                    {group.hits.map((hit) => {
                      index += 1;
                      const position = index;
                      const selected = position === active;
                      const Icon = iconFor(group.type, hit.link);
                      const body = (
                        <>
                          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              <Highlighted text={hit.title} query={term} />
                            </p>
                            {hit.subtitle && (
                              <p className="truncate text-xs text-muted-foreground">{hit.subtitle}</p>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            {hit.status && (
                              <span className={cn(
                                "whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
                                TONE_CLASSES[hit.status.tone] || TONE_CLASSES.neutral,
                              )}>
                                {hit.status.label}
                              </span>
                            )}
                            {(hit.amount !== null || hit.date) && (
                              <div className="text-right">
                                {hit.amount !== null && (
                                  <p className="text-sm font-medium tabular-nums text-foreground">
                                    {formatCurrency(hit.amount)}
                                  </p>
                                )}
                                {hit.date && (
                                  <p className="text-xs text-muted-foreground">{formatDate(hit.date)}</p>
                                )}
                              </div>
                            )}
                          </div>
                        </>
                      );
                      const rowClass = cn(
                        "mx-2 flex items-center gap-3 rounded-md px-2 py-2 outline-none transition-colors",
                        selected ? "bg-accent" : "hover:bg-accent",
                      );
                      return hit.link ? (
                        <Link
                          key={`${group.type}-${hit.id}`}
                          id={optionId(position)}
                          role="option"
                          aria-selected={selected}
                          to={hit.link.path}
                          state={hit.link.state}
                          onClick={close}
                          onMouseEnter={() => setActive(position)}
                          className={rowClass}
                        >
                          {body}
                        </Link>
                      ) : (
                        <div
                          key={`${group.type}-${hit.id}`}
                          id={optionId(position)}
                          role="option"
                          aria-selected={selected}
                          className={rowClass}
                        >
                          {body}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GlobalSearch;
