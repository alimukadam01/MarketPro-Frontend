import { useEffect, useId, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { defaultCustomRange } from "../../../services/periods";

type PeriodOption = { key: string; label: string };
type Period = { key: string; from?: string; to?: string };

interface PeriodSwitchProps {
  options: PeriodOption[];
  value: Period;
  onChange: (period: Period) => void;
  /** "page": 40px, beside a page title. "card": 32px, in a card's corner. */
  size?: "page" | "card";
  /** Adds a last "Custom" option that opens From / To fields in place. */
  allowCustom?: boolean;
  /** Where clearing a custom range goes back to. Defaults to the first option. */
  clearTo?: Period;
  /** Names the group for a screen reader: "Period for the cards and the table". */
  label: string;
}

/**
 * The period switch on metric cards, charts and list pages.
 *
 * A light grey track (bg-muted) with no border; the chosen option is white.
 *
 * Custom opens in place rather than in a pop-up, so the switch never gets
 * longer: the other options collapse to nothing, Custom slides to the left,
 * and the From / To fields and a clear button grow into the room they leave.
 * Every part animates on max-width, padding, margin and opacity. A changed
 * date applies at once - there is no Apply step - and only when the range is
 * whole and in order.
 */
export function PeriodSwitch({
  options, value, onChange, size = "page", allowCustom = false, clearTo, label,
}: PeriodSwitchProps) {
  const custom = value.key === "custom";
  const page = size === "page";
  const id = useId();

  // The fields are edited here and only reach onChange as a valid range, so a
  // half-typed date never refetches the page.
  const [draft, setDraft] = useState({ from: value.from || "", to: value.to || "" });
  useEffect(() => {
    if (custom) setDraft({ from: value.from || "", to: value.to || "" });
  }, [custom, value.from, value.to]);

  const editDate = (field: "from" | "to", text: string) => {
    const next = { ...draft, [field]: text };
    setDraft(next);
    if (next.from && next.to && next.from <= next.to) {
      onChange({ key: "custom", from: next.from, to: next.to });
    }
  };

  const segment = (selected: boolean, hidden: boolean) => cn(
    "inline-flex shrink-0 items-center justify-center overflow-hidden whitespace-nowrap rounded-sm font-medium",
    "transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    page ? "h-8 text-sm" : "h-7 text-xs",
    hidden
      ? "pointer-events-none max-w-0 px-0 mr-0 opacity-0"
      : cn("max-w-[140px] opacity-100", page ? "px-3 mr-0.5" : "px-2.5 mr-0.5"),
    selected ? "bg-white text-foreground shadow-sm" : "text-gray-600 hover:text-foreground",
  );

  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 items-center rounded-md bg-muted",
        page ? "h-10 p-1" : "h-8 p-0.5",
      )}
    >
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          aria-pressed={!custom && value.key === option.key}
          aria-hidden={custom}
          disabled={custom}
          tabIndex={custom ? -1 : 0}
          onClick={() => onChange({ key: option.key })}
          className={segment(!custom && value.key === option.key, custom)}
        >
          {option.label}
        </button>
      ))}

      {allowCustom && (
        <>
          <button
            type="button"
            aria-pressed={custom}
            onClick={() => { if (!custom) onChange(defaultCustomRange()); }}
            className={segment(custom, false)}
          >
            Custom
          </button>

          <div
            aria-hidden={!custom}
            className={cn(
              "flex items-center gap-2 overflow-hidden whitespace-nowrap transition-all duration-300",
              custom ? "ml-1.5 max-w-[440px] opacity-100" : "ml-0 max-w-0 opacity-0",
            )}
          >
            <label htmlFor={`${id}-from`} className="text-sm text-muted-foreground">From</label>
            <input
              id={`${id}-from`}
              type="date"
              value={draft.from}
              max={draft.to || undefined}
              disabled={!custom}
              onChange={(e) => editDate("from", e.target.value)}
              className="h-8 rounded-sm border-0 bg-white px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <label htmlFor={`${id}-to`} className="text-sm text-muted-foreground">To</label>
            <input
              id={`${id}-to`}
              type="date"
              value={draft.to}
              min={draft.from || undefined}
              disabled={!custom}
              onChange={(e) => editDate("to", e.target.value)}
              className="h-8 rounded-sm border-0 bg-white px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="button"
              aria-label="Clear custom range"
              disabled={!custom}
              onClick={() => onChange(clearTo || { key: options[0].key })}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-gray-600 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
