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
function DataTable({ columns, data, selectedRows = [], onRowClick, colsConfig = null, headerOnly = false, rowsOnly = false, loading = false, skeletonRows = 8 }) {

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
    Array.from({ length: skeletonRows }).map((_, idx) => (
      <Skeleton key={`skeleton-${idx}`} className="h-[35px] rounded-lg" />
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
