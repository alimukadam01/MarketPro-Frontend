import { cn } from "@/lib/utils";

interface PhoneSegmentedProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  /** Names the group for a screen reader: "Period". */
  label: string;
  /** 40px options instead of 36px, for a form. */
  tall?: boolean;
}

/**
 * One choice from a few, across the full width of a phone. The options share
 * the width equally, so none looks missing.
 */
export function PhoneSegmented({ options, value, onChange, label, tall = false }: PhoneSegmentedProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className="grid gap-1 rounded-[10px] bg-muted p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-md px-1 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              tall ? "h-10 text-sm" : "h-9 text-[13px]",
              selected ? "bg-background font-semibold text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
