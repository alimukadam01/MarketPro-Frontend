import { useEffect, useRef, useState } from "react";
import { Lock } from "lucide-react";

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

function DataTable({ columns, data, selectedRows = [], onRowClick, colsConfig = null }) {

  return (
    <div className="space-y-[10px]">
      {/* Table Header */}
      <div className="bg-card rounded-lg border h-[35px] flex items-center px-4">
        <div
          className={`grid grid-cols-${colsConfig ? colsConfig : columns.length} gap-4 w-full text-sm font-medium text-muted-foreground`}
        >
          <div key={-1} className="min-w-0">
            S.no
          </div>
          {columns.filter((col) => col.key !== 'id').map((col) => (
            <div key={col.key} className="min-w-0">
              {col.label}
            </div>
          ))}
        </div>
      </div>

      {/* Table Rows */}
      {data ? data.map((row, idx) => (
        <div
          key={row.id}
          onClick={() => onRowClick && onRowClick(row.id)}
          className={`bg-card rounded-lg h-[35px] flex items-center px-4 cursor-pointer transition-colors hover:bg-muted/20 ${
            selectedRows.includes(row.id)
              ? "border-2 border-[#4285F4]"
              : "border border-border"
          }`}
        >
          <div className={`grid grid-cols-${colsConfig ? colsConfig : columns.length} gap-4 w-full text-sm`}>
            <MarqueeCell key={`${row.id}-${idx}`}>
              {idx + 1}
            </MarqueeCell>
            {columns.filter((col) => col.key !== 'id').map((col) => (
              <MarqueeCell key={col.key}>
                {col.render ? col.render(row[col.key], row) : row[col.key]}
              </MarqueeCell>
            ))}
          </div>
        </div>
      )) :
        <div className="flex items-center gap-2 justify-center flex-1 mt-4">
          <Lock className="w-4 h-4" />
          <p>Access not granted. Please contact Admin.</p>
        </div>
      }
    </div>
  );
};

export default DataTable;
