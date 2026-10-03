import * as React from "react";
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  /** What the form stores - usually the record's id, as a string. */
  value: string;
  label: string;
  /**
   * Extra text a search should match, beyond the label: a business name, a
   * phone number, a variant. The id is searchable too, so a user who knows the
   * record number can type that instead.
   */
  keywords?: string[];
  disabled?: boolean;
}

interface ComboboxProps {
  options: ComboboxOption[];
  /** "" means nothing selected. */
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Shown when the list came back empty - say what is missing, not "no results". */
  emptyText?: string;
  /** Shown when what the user typed matches none of the loaded options. */
  notFoundText?: string;
  /** True while the options are still being fetched. */
  loading?: boolean;
  disabled?: boolean;
  /**
   * For nullable fields: once something is selected, the chevron becomes a clear
   * button. Base UI's Clear resets the value and the input text together, which a
   * "none" row in the list could not do - that row had to be a real option with a
   * sentinel value, and the field then showed it as though it were a selection.
   */
  clearable?: boolean;
  id?: string;
  className?: string;
}

/**
 * A type-to-search picker for options that come from the API.
 *
 * Use it wherever the options are a fetched queryset - customers, suppliers,
 * products, accounts, projects. Plain Select is still right for a fixed set of
 * statuses or types: those are short, never load, and have nothing to search.
 *
 * Built on Base UI's Combobox, which is the primitive shadcn's own Combobox is
 * built on. What shadcn ships on top of it could not be dropped in here: it is
 * styled entirely through a `cn-combobox-*` CSS layer this project does not
 * have, its structural classes are Tailwind v4 syntax (`w-(--anchor-width)`,
 * `outline-hidden`) which emits nothing on 3.4, and it pulls in an input-group
 * component and an app-internal icon placeholder. So the engine is theirs and
 * the styling is this project's, lifted from select.tsx so the popup and the
 * rows are the ones already used everywhere else.
 *
 * Base UI owns the input text, the filtering and the focus. The first version of
 * this file did all three by hand on cmdk and had to fight every one: two pieces
 * of state so the current label did not filter the list down to itself,
 * preventDefault on mousedown so clicking a row did not blur the field first,
 * manual restore of the label on blur. None of that is here, which is the point.
 *
 * The value crossing this boundary is a string id, because that is what
 * react-hook-form stores and what the API wants. Base UI works in whole items,
 * so the option object goes down and the id comes back up.
 */
export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  emptyText = "Nothing to choose from yet.",
  notFoundText = "No match.",
  loading = false,
  disabled = false,
  clearable = false,
  id,
  className,
}: ComboboxProps) {
  const selected = React.useMemo(
    () => (value ? options.find((o) => o.value === value) ?? null : null),
    [options, value],
  );

  // A set value with no matching option means the options have not arrived yet:
  // Update pages reset() the form from one request and load the list in another.
  const awaitingLabel = Boolean(value) && !selected && loading;

  return (
    <ComboboxPrimitive.Root
      items={options}
      value={selected}
      onValueChange={(option: ComboboxOption | null) => onChange(option ? option.value : "")}
      itemToStringLabel={(option: ComboboxOption) => option.label}
      filter={(option: ComboboxOption, query: string) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return [option.label, option.value, ...(option.keywords ?? [])].some((text) =>
          String(text ?? "").toLowerCase().includes(q),
        );
      }}
      disabled={disabled}
      openOnInputClick
    >
      <div className={cn("relative", className)}>
        <ComboboxPrimitive.Input
          id={id}
          placeholder={placeholder}
          // the project's Input, verbatim, plus room for the chevron
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-9 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
        />
        {/* One control in the slot, never two: with a selection to clear, the X
            replaces the chevron rather than crowding beside it, so the input's
            pr-9 stays right. Clicking the field opens the list anyway. */}
        {clearable && selected && !awaitingLabel ? (
          <ComboboxPrimitive.Clear
            aria-label="Clear selection"
            disabled={disabled}
            className={cn(
              "absolute right-0 top-0 flex h-10 w-9 items-center justify-center",
              "text-muted-foreground outline-none hover:text-foreground",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            <X className="h-4 w-4 opacity-50" />
          </ComboboxPrimitive.Clear>
        ) : (
          <ComboboxPrimitive.Trigger
            aria-label="Show options"
            disabled={disabled}
            className="absolute right-0 top-0 flex h-10 w-9 items-center justify-center text-muted-foreground outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            {awaitingLabel ? (
              <Spinner size={16} label="Loading" />
            ) : (
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            )}
          </ComboboxPrimitive.Trigger>
        )}
      </div>

      <ComboboxPrimitive.Portal>
        <ComboboxPrimitive.Positioner sideOffset={4} align="start" className="z-50">
          <ComboboxPrimitive.Popup
            className={cn(
              // select.tsx's SelectContent, so the panel is the one already in the
              // app: no visible scrollbar, and a width that starts at the field's
              // and grows to the longest option, capped at the space Base UI
              // reports so a long product name cannot push it off screen
              "relative overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md",
              "max-h-96 w-auto min-w-[var(--anchor-width)] max-w-[var(--available-width)]",
              "origin-[var(--transform-origin)]",
              "data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 data-[closed]:zoom-out-95 data-[open]:zoom-in-95",
            )}
          >
            {loading ? (
              // Branching before List rather than leaning on Empty: an empty list
              // while loading would read as "no match" before the first option has
              // had a chance to arrive.
              <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                <Spinner size={14} />
                <span>Loading…</span>
              </div>
            ) : options.length === 0 ? (
              <div className="px-3 py-4 text-sm text-muted-foreground">{emptyText}</div>
            ) : (
              <>
                <ComboboxPrimitive.Empty className="px-3 py-4 text-sm text-muted-foreground">
                  {notFoundText}
                </ComboboxPrimitive.Empty>
                <ComboboxPrimitive.List className="max-h-96 overflow-y-auto overscroll-contain p-1 no-scrollbar">
                  {(option: ComboboxOption) => (
                    <ComboboxPrimitive.Item
                      key={option.value}
                      value={option}
                      disabled={option.disabled}
                      className={cn(
                        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none",
                        "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
                        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                      )}
                    >
                      {/* Absolute, like SelectItem's: Base UI renders the
                          indicator only for the selected row, so in the flow it
                          would shift every other row's text. */}
                      <ComboboxPrimitive.ItemIndicator className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                        <Check className="h-4 w-4" />
                      </ComboboxPrimitive.ItemIndicator>
                      <span>{option.label}</span>
                    </ComboboxPrimitive.Item>
                  )}
                </ComboboxPrimitive.List>
              </>
            )}
          </ComboboxPrimitive.Popup>
        </ComboboxPrimitive.Positioner>
      </ComboboxPrimitive.Portal>
    </ComboboxPrimitive.Root>
  );
}

export default Combobox;
