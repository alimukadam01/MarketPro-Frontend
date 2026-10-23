import { useEffect, useMemo, useRef, useState } from "react";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { useAuth } from "../../../services/AuthProvider";
import { workLookup } from "../../../services/api";

export interface LookupItem {
  id: number | string;
  label: string;
  [key: string]: unknown;
}

interface LookupComboboxProps {
  /** variants, customers, suppliers, accounts, units, locations, attributes, projects */
  kind: string;
  /** The picked record's id, "" for none. */
  value: string | number | null;
  /**
   * The picked record's name. The options are only the latest search's
   * matches, so a record loaded with the page, or picked before the user typed
   * something else, would otherwise show its placeholder.
   */
  selectedLabel?: string;
  onChange: (item: LookupItem | null) => void;
  placeholder?: string;
  emptyText?: string;
  notFoundText?: string;
  clearable?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/**
 * A picker for the entry screens. It searches on the server as the user types
 * (/backlog-work/lookup/<kind>/), which answers with names only - never a
 * stock figure, a price or a balance - and at most 25 of them, so a shop with
 * thousands of products still opens instantly.
 */
export function LookupCombobox({
  kind,
  value,
  selectedLabel = "",
  onChange,
  placeholder = "Search",
  emptyText = "Nothing found.",
  notFoundText = "No match.",
  clearable = false,
  disabled = false,
  id,
  className,
}: LookupComboboxProps) {
  const { token } = useAuth();
  const [items, setItems] = useState<LookupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  // The answer to the latest query only: a slow reply to an earlier keystroke
  // must not replace the list for what is typed now.
  const latest = useRef(0);

  useEffect(() => {
    if (!token) return;
    const ticket = ++latest.current;
    const delay = setTimeout(async () => {
      try {
        const found = await workLookup(token, kind, query);
        if (ticket === latest.current) setItems(found || []);
      } catch (error) {
        console.log(`Error looking up ${kind}:`, error);
      } finally {
        if (ticket === latest.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(delay);
  }, [token, kind, query]);

  const options: ComboboxOption[] = useMemo(() => {
    const list = items.map((item) => ({ value: String(item.id), label: item.label }));
    const key = value === null || value === undefined ? "" : String(value);
    if (key && selectedLabel && !list.some((option) => option.value === key)) {
      list.unshift({ value: key, label: selectedLabel });
    }
    return list;
  }, [items, value, selectedLabel]);

  return (
    <Combobox
      id={id}
      className={className}
      options={options}
      value={value ?? ""}
      onChange={(picked) => {
        if (!picked) {
          onChange(null);
          return;
        }
        const item = items.find((row) => String(row.id) === picked)
          ?? { id: picked, label: selectedLabel };
        onChange(item);
      }}
      // Typing a name searches; picking one puts its label in the box, which
      // would search for exactly that - harmless, and it keeps the pick listed.
      onInputChange={setQuery}
      serverFiltered
      loading={loading}
      placeholder={placeholder}
      emptyText={query ? notFoundText : emptyText}
      notFoundText={notFoundText}
      clearable={clearable}
      disabled={disabled}
    />
  );
}

export default LookupCombobox;
