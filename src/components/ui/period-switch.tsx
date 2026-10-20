import { useEffect, useId, useState } from "react";
import { Check, X } from "lucide-react";
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
 * and the From / To fields grow into the room they leave, with an apply (✓)
 * and a clear (✕) button. Every part animates on max-width, padding, margin
 * and opacity.
 *
 * Nothing applies until ✓ is pressed (or Enter in a date field): picking two
 * dates is several steps, and refetching the page after each one would show
 * figures for ranges nobody asked for. ✕ leaves Custom and goes back to
 * `clearTo` - All time on a list page.
 */
export function PeriodSwitch({
  options, value, onChange, size = "page", allowCustom = false, clearTo, label,
}: PeriodSwitchProps) {
  const applied = value.key === "custom";
  const page = size === "page";
  const id = useId();

  // Open while a range is applied or being picked. The range in the fields is
  // a draft until it is applied.
  const [editing, setEditing] = useState(false);
  const open = applied || editing;
  const [draft, setDraft] = useState({ from: value.from || "", to: value.to || "" });

  // An applied range shows in the fields; leaving Custom from outside (a
  // parent reset) closes them.
  useEffect(() => {
    if (applied) setDraft({ from: value.from || "", to: value.to || "" });
    else setEditing(false);
  }, [applied, value.from, value.to]);

  const valid = Boolean(draft.from && draft.to && draft.from <= draft.to);
  const unchanged = applied && draft.from === value.from && draft.to === value.to;

  const startCustom = () => {
    if (open) return;
    const fresh = defaultCustomRange();
    setDraft({ from: fresh.from, to: fresh.to });
    setEditing(true);
  };

  const apply = () => {
    if (!valid || unchanged) return;
    onChange({ key: "custom", from: draft.from, to: draft.to });
    setEditing(false);
  };

  const clear = () => {
    setEditing(false);
    onChange(clearTo || { key: options[0].key });
  };

  const onFieldKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      apply();
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

  const iconButton = cn(
    "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
          aria-pressed={!applied && value.key === option.key}
          aria-hidden={open}
          disabled={open}
          tabIndex={open ? -1 : 0}
          onClick={() => onChange({ key: option.key })}
          className={segment(!open && value.key === option.key, open)}
        >
          {option.label}
        </button>
      ))}

      {allowCustom && (
        <>
          <button
            type="button"
            aria-pressed={open}
            onClick={startCustom}
            className={segment(open, false)}
          >
            Custom
          </button>

          <div
            aria-hidden={!open}
            className={cn(
              "flex items-center gap-2 overflow-hidden whitespace-nowrap transition-all duration-300",
              open ? "ml-1.5 max-w-[480px] opacity-100" : "ml-0 max-w-0 opacity-0",
            )}
          >
            <label htmlFor={`${id}-from`} className="text-sm text-muted-foreground">From</label>
            <input
              id={`${id}-from`}
              type="date"
              value={draft.from}
              max={draft.to || undefined}
              disabled={!open}
              onChange={(e) => setDraft({ ...draft, from: e.target.value })}
              onKeyDown={onFieldKey}
              className="h-8 rounded-sm border-0 bg-white px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <label htmlFor={`${id}-to`} className="text-sm text-muted-foreground">To</label>
            <input
              id={`${id}-to`}
              type="date"
              value={draft.to}
              min={draft.from || undefined}
              disabled={!open}
              onChange={(e) => setDraft({ ...draft, to: e.target.value })}
              onKeyDown={onFieldKey}
              className="h-8 rounded-sm border-0 bg-white px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="button"
              aria-label="Apply custom range"
              title="Apply"
              disabled={!open || !valid || unchanged}
              onClick={apply}
              className={cn(
                iconButton,
                "text-primary hover:bg-white disabled:pointer-events-none disabled:text-gray-400",
              )}
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Clear custom range"
              title="Clear"
              disabled={!open}
              onClick={clear}
              className={cn(iconButton, "text-gray-600 hover:bg-white hover:text-foreground")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
