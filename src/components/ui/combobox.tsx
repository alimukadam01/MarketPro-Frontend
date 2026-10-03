import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  /** What the form stores - usually the record's id, as a string. */
  value: string;
  label: string;
  /**
   * Extra text a search should match, beyond the label: a business name, a
   * phone number, a variant. The id in `value` is always searchable too, so a
   * user who knows the record number can type that instead.
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
  /** Adds a row that sets the value back to "" - for nullable fields. */
  clearable?: boolean;
  clearLabel?: string;
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
 * THE FIELD IS THE SEARCH BOX. There is no separate search row inside the
 * popup: the trigger is a real text input, so the user types straight into the
 * field they are filling in and the list below narrows as they go.
 *
 * Built on cmdk and Radix Popover, like the other 64 components here, rather
 * than on the Base UI combobox the shadcn docs now show. Base UI is a second
 * primitive family and a second dependency; this delivers the same behaviour
 * with the primitives already in the project.
 *
 * The popup is deliberately indistinguishable from a Select's: `overflow-hidden`
 * with the scrollbar suppressed on the list, `max-h-96`, and a width that starts
 * at the field's and grows to fit the longest option, capped at the space Radix
 * says is available so a long product name cannot push it off screen.
 *
 * TWO PIECES OF STATE, not one. `query` is what the user has typed; the field
 * shows the selected option's label whenever they are not typing. Keeping them
 * separate is what lets the list show everything when the field is focused -
 * with a single value, the field would arrive pre-filled with the current
 * label, cmdk would filter by it, and the only option offered would be the one
 * already chosen.
 *
 * FILTERING. cmdk matches a search against each item's `value` plus its
 * `keywords`, so holding a numeric id in `value` - which is what the form
 * stores - would make a search by name match nothing. The label goes into
 * `keywords` instead, which also leaves the id searchable alongside it.
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
  clearLabel = "Clear selection",
  id,
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [typing, setTyping] = React.useState(false);

  const selected = value ? options.find((o) => o.value === value) : undefined;

  // A set value with no matching option means the options have not arrived yet:
  // Update pages reset() the form from one request and load the list in another.
  const awaitingLabel = Boolean(value) && !selected && loading;

  const shown = typing ? query : selected?.label ?? "";

  const close = React.useCallback(() => {
    setOpen(false);
    setTyping(false);
    setQuery("");
  }, []);

  const commit = (option: ComboboxOption) => {
    onChange(option.value);
    close();
  };

  return (
    <Popover open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      {/* Command wraps BOTH the field and the list: cmdk needs one provider
          around its Input and its List, and React context reaches through the
          portal the popup renders into. */}
      <Command
        loop
        className="overflow-visible bg-transparent"
        // The field is outside the popup, so cmdk's own "jump to first item"
        // behaviour would otherwise fight the input's cursor.
        shouldFilter={!loading}
      >
        <PopoverAnchor asChild>
          <div className={cn("relative", className)}>
            <CommandPrimitive.Input
              id={id}
              value={shown}
              disabled={disabled}
              placeholder={placeholder}
              onValueChange={(next) => {
                setQuery(next);
                setTyping(true);
                setOpen(true);
              }}
              // Focusing clears the field so the whole list is offered rather
              // than just the option already selected. Blur puts the label back.
              onFocus={() => {
                setTyping(true);
                setQuery("");
                setOpen(true);
              }}
              onBlur={() => {
                setTyping(false);
                setQuery("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  close();
                  return;
                }
                if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
                  setOpen(true);
                }
              }}
              className={cn(
                // the project's Input, verbatim, so the field is
                // indistinguishable from the ones beside it
                "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-9 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
              )}
            />
            {/* Decorative: the input already opens on focus, and a focusable
                control here would steal focus out of the field on mousedown. */}
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {awaitingLabel ? (
                <Spinner size={16} label="Loading" />
              ) : (
                <ChevronsUpDown className="h-4 w-4 opacity-50" />
              )}
            </span>
          </div>
        </PopoverAnchor>

        <PopoverContent
          align="start"
          // Focus stays in the field; the popup is a list the field drives.
          onOpenAutoFocus={(event) => event.preventDefault()}
          className={cn(
            "w-auto p-0",
            "min-w-[var(--radix-popover-trigger-width)]",
            "max-w-[var(--radix-popover-content-available-width)]",
            "max-h-96 overflow-hidden",
          )}
        >
          <CommandList
            className={cn(
              "max-h-96",
              // no-scrollbar is this project's own utility, already on the
              // sidebar: the list still scrolls by wheel and cmdk still scrolls
              // the active item into view, there is just no bar to see - which
              // is how a Select's popup looks.
              "no-scrollbar",
            )}
          >
            {loading ? (
              // No CommandEmpty while loading, or an empty list would read as
              // "no match" before the first option has had a chance to arrive.
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
                      onMouseDown={(event) => event.preventDefault()}
                      onSelect={() => {
                        onChange("");
                        close();
                      }}
                      className="text-muted-foreground"
                    >
                      <X className="mr-2 h-4 w-4 shrink-0" />
                      {clearLabel}
                    </CommandItem>
                  )}
                  {options.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      keywords={[option.label, ...(option.keywords ?? [])]}
                      disabled={option.disabled}
                      // Without this the field blurs on mousedown, which resets
                      // the query and closes the popup before the click lands.
                      onMouseDown={(event) => event.preventDefault()}
                      onSelect={() => commit(option)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          option.value === value ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {/* No truncate: the popup grows to the longest option, the
                          way a Select's does. */}
                      <span>{option.label}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </PopoverContent>
      </Command>
    </Popover>
  );
}

export default Combobox;
