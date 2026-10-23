import type { ReactNode } from "react";

export interface InvoiceItemsRow {
  key: string | number;
  /** Product, quantity, unit price or cost, total - in that order. */
  cells: ReactNode[];
  /** A returned line: still listed, but no longer counted. */
  dimmed?: boolean;
  /** Icon buttons, rendered outside the row the way the invoice screens always have. */
  actions?: ReactNode;
  /** Clicking the row: the backlog entry screens load it into the add row to correct it. */
  onClick?: () => void;
  /** The row being corrected, outlined the way a selected list row is. */
  selected?: boolean;
}

interface InvoiceItemsTableProps {
  columns: string[];
  rows: InvoiceItemsRow[];
  /** How many icon buttons each row carries, so the header lines up with them. */
  actionCount?: number;
  emptyText?: string;
  /**
   * Render only one half, so the header can sit in a section's sticky block
   * while the rows scroll under it - the split data-table.jsx offers the list
   * pages. Both halves must get the same columns and actionCount.
   */
  headerOnly?: boolean;
  rowsOnly?: boolean;
}

// The product takes whatever width is left; quantity, price and total are
// narrow fixed columns held together at the right of the row, right-aligned so
// the figures line up digit for digit down the list.
const GRID = "grid grid-cols-[40px_minmax(0,1fr)_72px_104px_112px] items-center gap-4 w-full";

// The first column after S.no is the product; the rest are figures.
const align = (index: number) => (index === 0 ? "" : "text-right tabular-nums");

/**
 * Market Pro's table, as data-table.jsx draws it: a bordered header card, then
 * one bordered card per row, 10px apart, "S.no" first.
 *
 * The icons sit outside the row, which is how the invoice item lists have
 * always done it; the header gets an empty slot per icon so the columns line
 * up with the rows below.
 */
export function InvoiceItemsTable({
  columns,
  rows,
  actionCount = 1,
  emptyText = "No items yet.",
  headerOnly = false,
  rowsOnly = false,
}: InvoiceItemsTableProps) {
  const actionSlots = Array.from({ length: actionCount }).map((_, index) => (
    <div key={index} className="w-5 shrink-0" />
  ));

  const header = (
    <div className="flex items-center gap-2">
      <div className="bg-card rounded-lg border h-[35px] flex flex-1 items-center px-4">
        <div className={`${GRID} text-sm font-medium text-muted-foreground`}>
          <div>S.no</div>
          {columns.map((column, index) => (
            <div key={column} className={`truncate ${align(index)}`}>{column}</div>
          ))}
        </div>
      </div>
      {actionSlots}
    </div>
  );

  const body = rows.length === 0 ? (
    <p className="text-sm text-muted-foreground text-center py-4">{emptyText}</p>
  ) : (
    rows.map((row, idx) => (
      <div key={row.key} className="flex items-center gap-2">
        <div
          onClick={row.onClick}
          className={`bg-card rounded-lg h-[35px] flex flex-1 items-center px-4 ${row.selected ? "border-2 border-[#4285F4]" : "border border-border"} ${row.onClick ? "cursor-pointer" : ""} ${row.dimmed ? "opacity-50" : ""}`}
        >
          <div className={`${GRID} text-sm`}>
            <div>{idx + 1}</div>
            {row.cells.map((cell, index) => (
              <div
                key={index}
                className={`min-w-0 truncate ${align(index)} ${index === 0 ? "font-medium" : ""} ${index === row.cells.length - 1 ? "font-semibold" : ""}`}
              >
                {cell}
              </div>
            ))}
          </div>
        </div>
        {row.actions}
      </div>
    ))
  );

  if (headerOnly) return header;
  if (rowsOnly) return <div className="space-y-[10px]">{body}</div>;

  return (
    <div className="space-y-[10px]">
      {header}
      {body}
    </div>
  );
}

/**
 * One icon button beside a row. A plain <button> rather than <Button>: the
 * screens used variant="unstyled", which Button does not define, so it only
 * ever rendered by accident - and failed the type check every time.
 */
export function RowAction({
  label,
  onClick,
  disabled = false,
  tone = "danger",
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "danger" | "primary";
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`w-5 shrink-0 inline-flex items-center justify-center text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${tone === "danger" ? "hover:text-destructive" : "hover:text-primary"}`}
    >
      {children}
    </button>
  );
}
