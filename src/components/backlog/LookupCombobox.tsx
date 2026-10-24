import { useEffect, useMemo, useRef, useState } from "react";
import { Combobox, type ComboboxCreateAction, type ComboboxOption } from "@/components/ui/combobox";
import { useAuth } from "../../../services/AuthProvider";
import { workLookup } from "../../../services/api";

export interface LookupItem {
  id: number | string;
  label: string;
  [key: string]: unknown;
}

interface LookupComboboxProps {
  /** variants, customers, suppliers, accounts, units, locations, attributes, projects, cities */
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
  /**
   * Offer to create what was typed when nothing is called exactly that: a
   * Create button takes the chevron's place at the right of the field, and
   * when nothing in the list matches at all, Enter does the same. Either
   * opens the page's create dialog with the name filled in.
   */
  onCreate?: (text: string) => void;
  /** What a created record is called: "customer", "product". */
  createNoun?: string;
  /**
   * On a list of variants: when the text is exactly a product's name, the
   * button adds variants to that product instead of creating a second one.
   */
  onExtend?: (product: { id: number | string; name: string }) => void;
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
  onCreate,
  createNoun = "",
  onExtend,
}: LookupComboboxProps) {
  const { token } = useAuth();
  const [items, setItems] = useState<LookupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  // The query the list in hand answers. Until the reply for what is typed now
  // arrives, the list is the previous query's - and offering to create a name
  // that may well be in the next reply would invite a duplicate.
  const [answered, setAnswered] = useState<string | null>(null);
  // The answer to the latest query only: a slow reply to an earlier keystroke
  // must not replace the list for what is typed now.
  const latest = useRef(0);

  useEffect(() => {
    if (!token) return;
    const ticket = ++latest.current;
    const delay = setTimeout(async () => {
      try {
        const found = await workLookup(token, kind, query);
        if (ticket === latest.current) {
          setItems(found || []);
          setAnswered(query);
        }
      } catch (error) {
        console.log(`Error looking up ${kind}:`, error);
      } finally {
        if (ticket === latest.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(delay);
  }, [token, kind, query]);

  // One object per option for the life of the picker. Base UI resets the
  // input to the picked item's label whenever the picked value changes
  // identity, and every search reply used to rebuild the options - so each
  // keystroke's reply put the full name back, and backspace never stuck.
  const optionCache = useRef(new Map<string, ComboboxOption>());
  const optionFor = (id: string, label: string) => {
    const cacheKey = `${id}|${label}`;
    let option = optionCache.current.get(cacheKey);
    if (!option) {
      option = { value: id, label };
      optionCache.current.set(cacheKey, option);
    }
    return option;
  };

  const options: ComboboxOption[] = useMemo(() => {
    const list = items.map((item) => optionFor(String(item.id), item.label));
    const key = value === null || value === undefined ? "" : String(value);
    if (key && selectedLabel && !list.some((option) => option.value === key)) {
      list.unshift(optionFor(key, selectedLabel));
    }
    return list;
  }, [items, value, selectedLabel]);

  const typed = query.trim();
  // Only once the server has answered for exactly what is typed: until then
  // the list is the previous query's, and the name may well be in the next.
  const createAction: ComboboxCreateAction | null = useMemo(() => {
    if (!onCreate || !typed || answered !== query) return null;
    const product = onExtend
      ? items.find((item) => String(item.product_name ?? "").trim().toLowerCase() === typed.toLowerCase())
      : undefined;
    if (product) {
      const group = { id: product.product as number, name: String(product.product_name) };
      // Enter opens it too, unless a variant is highlighted to pick.
      return { label: `Add variants to "${group.name}"`, buttonText: "Add variants", onCreate: () => onExtend(group), onEnter: true };
    }
    const exact = items.some((item) => item.label.trim().toLowerCase() === typed.toLowerCase());
    if (exact || typed === String(selectedLabel).trim()) return null;
    return {
      label: `Create ${createNoun ? `${createNoun} ` : ""}"${typed}"`,
      onCreate: () => onCreate(typed),
      // With matches listed, Enter picks the highlighted one instead.
      onEnter: items.length === 0,
    };
  }, [onCreate, onExtend, typed, answered, query, items, selectedLabel, createNoun]);

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
      emptyText={createAction ? `Not in MarketPro yet. Press Enter or Create to add it.` : query ? notFoundText : emptyText}
      notFoundText={notFoundText}
      clearable={clearable}
      disabled={disabled}
      autoHighlight={!!onCreate}
      createAction={createAction}
    />
  );
}

export default LookupCombobox;
