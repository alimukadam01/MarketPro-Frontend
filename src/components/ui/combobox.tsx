import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  /** What the form stores - usually the record's id, as a string. */
  value: string;
  label: string;
  /**
   * Extra text to match a search against, beyond the label: a business name, a
   * phone number, a variant. The id in `value` is always searchable too, so a
   * user who knows the record number can type it.
   */
  keywords?: string[];
  disabled?: boolean;
}

interface ComboboxProps {
  options: ComboboxOption[];
  /** "" means nothing selected. */
  value?: string;
  onChange: (value: string) => void;
  /** Trigger text when nothing is selected. */
  placeholder?: string;
  searchPlaceholder?: string;
  /** Shown when the list came back empty - say what is missing, not "no results". */
  emptyText?: string;
  /** Shown when a search matches none of the loaded options. */
  notFoundText?: string;
  /** True while the options are still being fetched. */
  loading?: boolean;
  disabled?: boolean;
  /** Adds a row that sets the value back to "" - for nullable fields. */
  clearable?: boolean;
  clearLabel?: string;
  id?: string;
  className?: string;
}

/**
 * A searchable picker for options that come from the API.
 *
 * Use it wherever the options are a fetched queryset - customers, suppliers,
 * products, accounts, projects. Plain Select is still right for a fixed set of
 * statuses or types: those are short, never load, and have nothing to search.
 *
 * Three things it does that Select cannot:
 *
 *  - Search. A business with four hundred products cannot scroll a Select.
 *  - Say that options are still loading. An empty Select is indistinguishable
 *    from "this business has no customers", which is a different and much more
 *    alarming statement than "not loaded yet".
 *  - Say that the list is genuinely empty, in words, naming what is missing.
 *
 * FILTERING. cmdk matches the search against an item's `value` plus its
 * `keywords`, so `value` holding a numeric id would make a search for a name
 * match nothing at all. The label therefore goes into `keywords`, which is also
 * what makes the id searchable alongside it rather than instead of it.
 *
 * `onSelect` is deliberately ignored in favour of a closure: cmdk hands it the
 * item's value lowercased, which would corrupt any id that is not numeric.
 */
export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  searchPlaceholder = "Search…",
  emptyText = "Nothing to choose from yet.",
  notFoundText = "No match.",
  loading = false,
  disabled = false,
  clearable = false,
  clearLabel = "Clear selection",
  id,
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const selected = value ? options.find((o) => o.value === value) : undefined;

  // A set value with no matching option means the options have not arrived yet -
  // Update pages reset() the form from one request and load the list in another.
  // Showing the placeholder there would read as "nothing selected", so the
  // trigger waits visibly instead of making a claim.
  const awaitingLabel = Boolean(value) && !selected && loading;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !selected && !awaitingLabel && "text-muted-foreground",
            className,
          )}
        >
          {awaitingLabel ? (
            <Spinner size={16} label="Loading" />
          ) : (
            <span className="truncate">{selected ? selected.label : placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      {/* Matching the trigger's width keeps long product labels from blowing the
          popover out to the edge of the viewport. */}
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
      >
        <Command loop>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            {loading ? (
              // No CommandEmpty while loading, or an empty list would flash
              // "No match" before the first option has had a chance to arrive.
              <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                <Spinner size={14} />
                <span>Loading…</span>
              </div>
            ) : options.length === 0 ? (
              <div className="px-3 py-4 text-sm text-muted-foreground">{emptyText}</div>
            ) : (
              <>
                <CommandEmpty>{notFoundText}</CommandEmpty>
                <CommandGroup>
                  {clearable && (
                    <CommandItem
                      value="__clear__"
                      keywords={[clearLabel]}
                      onSelect={() => {
                        onChange("");
                        setOpen(false);
                      }}
                      className="text-muted-foreground"
                    >
                      <X className="mr-2 h-4 w-4" />
                      {clearLabel}
                    </CommandItem>
                  )}
                  {options.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      keywords={[option.label, ...(option.keywords ?? [])]}
                      disabled={option.disabled}
                      onSelect={() => {
                        onChange(option.value);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          option.value === value ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="truncate">{option.label}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default Combobox;
