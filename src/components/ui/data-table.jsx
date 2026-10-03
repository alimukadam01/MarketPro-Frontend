import { useEffect, useRef, useState } from "react";
import { Lock } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { ACCESS_DENIED_MESSAGE } from "../../../services/utils";

/**
 * Renders a single cell. When the content is wider than the cell, it scrolls
 * itself back and forth instead of showing a scrollbar.
 */
function MarqueeCell({ children }) {
  const cellRef = useRef(null);
  const contentRef = useRef(null);
  const [shift, setShift] = useState(0);

  useEffect(() => {
    const cell = cellRef.current;
    const content = contentRef.current;
    if (!cell || !content) return;

    const overflow = content.scrollWidth - cell.clientWidth;
    setShift(overflow > 0 ? overflow : 0);
  }, [children]);

  return (
    <div
      ref={cellRef}
      className="font-medium min-w-0 overflow-hidden whitespace-nowrap"
    >
      <span
        ref={contentRef}
        className={`inline-block ${shift > 0 ? "animate-marquee" : ""}`}
        style={shift > 0 ? { "--marquee-shift": `-${shift}px` } : undefined}
      >
        {children}
      </span>
    </div>
  );
}

/**
 * headerOnly / rowsOnly split the table so a page can pin its column header.
 *
 * A list page wants its section heading, its action row and the column header to
 * stay put once they reach the top, while the rows keep scrolling under them.
 * Pinning them separately would mean giving the column header a top offset equal
 * to the height of everything above it - a number that differs per page and
 * silently drifts whenever a heading or a button changes. Rendering the header
 * inside the same sticky container as the rest removes the arithmetic.
 *
 * Neither flag: unchanged, header and rows together, as every page had it.
 *
 * `loading` is deliberately separate from `data`. A null `data` already means
 * "this user may not view the table" and renders the access-denied lock, so
 * overloading it would make a slow fetch look like a permissions failure.
 * Pages pass loading while their first request is in flight.
 */
/** Shimmering more rows than arrive looks like something was removed, so an
 *  unknown count guesses LOW. Growing into more rows reads as data landing. */
const DEFAULT_SKELETON_ROWS = 5;
const MAX_SKELETON_ROWS = 12;
const REMEMBERED_ROWS_KEY = "mp-table-rows";

/**
 * A stable id for this table, taken from its own columns - so nothing has to
 * be passed in from the 18 pages that render one.
 */
const tableKey = (columns) => columns.map((col) => col.key).join("|");

/** localStorage throws in private mode and with site data blocked, and this is
 *  only a placeholder hint, so every access fails quietly back to null. */
const readRemembered = (key) => {
  try {
    const all = JSON.parse(window.localStorage.getItem(REMEMBERED_ROWS_KEY) || "{}");
    const n = Number(all[key]);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
};

const writeRemembered = (key, count) => {
  try {
    const all = JSON.parse(window.localStorage.getItem(REMEMBERED_ROWS_KEY) || "{}");
    all[key] = count;
    window.localStorage.setItem(REMEMBERED_ROWS_KEY, JSON.stringify(all));
  } catch {
    /* no-op: a missing hint only costs a slightly wrong row count */
  }
};

function DataTable({ columns, data, selectedRows = [], onRowClick, colsConfig = null, headerOnly = false, rowsOnly = false, loading = false, skeletonRows = null }) {

  // How many rows to shimmer. Two sources, because they fix different moments:
  // the ref covers REFETCHES on a mounted page - search, filter, delete - where
  // the real count is already on screen and a shrink is most obvious; the
  // stored value covers the FIRST paint on a page visited before, which the ref
  // cannot because it is gone with the unmount.
  const key = tableKey(columns);
  const lastCount = useRef(null);
  if (lastCount.current === null) lastCount.current = readRemembered(key);

  // In an effect, not during render: writeRemembered touches localStorage, and
  // a side effect on the render path runs twice under StrictMode and on every
  // re-render that changes nothing. The skeleton reads the value on the next
  // loading cycle, so landing one commit later costs nothing.
  useEffect(() => {
    if (loading || !Array.isArray(data) || data.length === 0) return;
    if (data.length === lastCount.current) return;
    lastCount.current = data.length;
    writeRemembered(key, data.length);
  }, [loading, data, key]);

  const placeholderRows = Math.min(
    skeletonRows ?? lastCount.current ?? DEFAULT_SKELETON_ROWS,
    MAX_SKELETON_ROWS,
  );

  // The one place the grid is defined, so skeleton cells land on exactly the
  // same tracks as real ones and nothing shifts when data arrives.
  const gridCols = `grid-cols-${colsConfig ? colsConfig : columns.length}`;
  const visibleColumns = columns.filter((col) => col.key !== 'id');

  const tableHeader = (
      <div className="bg-card rounded-lg border h-[35px] flex items-center px-4">
        <div
          className={`grid ${gridCols} gap-4 w-full text-sm font-medium text-muted-foreground`}
        >
          <div key={-1} className="min-w-0">
            S.no
          </div>
          {visibleColumns.map((col) => (
            <div key={col.key} className="min-w-0">
              {col.label}
            </div>
          ))}
        </div>
      </div>
  );

  // The whole row is the placeholder, not a row of chrome with little bars
  // inside it. h-[35px] is the real row height, so nothing shifts when the
  // data lands.
  const skeletonBody = (
    Array.from({ length: placeholderRows }).map((_, idx) => (
      // The offset is what makes this read ROW-WISE rather than as one block
      // of shimmering colour. It has to be a real fraction of the animation
      // cycle: at 90ms, eight rows spanned under a third of a 2.2s sweep and
      // sat at almost the same phase. 220ms spreads eight rows across a whole
      // cycle, so each row is visibly at its own point.
      <Skeleton
        key={`skeleton-${idx}`}
        className="h-[35px] rounded-lg"
        style={{ animationDelay: `${idx * 220}ms` }}
      />
    ))
  );

  const tableRows = (
    loading ? skeletonBody :
    data ? data.map((row, idx) => (
        <div
          key={row.id}
          onClick={() => onRowClick && onRowClick(row.id)}
          className={`bg-card rounded-lg h-[35px] flex items-center px-4 cursor-pointer transition-colors hover:bg-muted/20 ${
            selectedRows.includes(row.id)
              ? "border-2 border-[#4285F4]"
              : "border border-border"
          }`}
        >
          <div className={`grid ${gridCols} gap-4 w-full text-sm`}>
            <MarqueeCell key={`${row.id}-${idx}`}>
              {idx + 1}
            </MarqueeCell>
            {visibleColumns.map((col) => (
              <MarqueeCell key={col.key}>
                {col.render ? col.render(row[col.key], row) : row[col.key]}
              </MarqueeCell>
            ))}
          </div>
        </div>
      )) :
        <div className="flex items-center gap-2 justify-center flex-1 mt-4">
          <Lock className="w-4 h-4" />
          <p>{ACCESS_DENIED_MESSAGE}</p>
        </div>
  );

  if (headerOnly) return tableHeader;
  if (rowsOnly) return <div className="space-y-[10px]">{tableRows}</div>;

  return (
    <div className="space-y-[10px]">
      {tableHeader}
      {tableRows}
    </div>
  );
};

export default DataTable;
