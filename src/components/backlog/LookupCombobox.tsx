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
   * The picked record's name. Shown until the list arrives, and for a record
   * the list does not have yet - one created from this page a moment ago.
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
  /** What a created record is called: "customer", "supplier", "product". */
  createNoun?: string;
  /**
   * On a list of variants (a stock page): when the text is exactly a
   * product's name, the button adds variants to that product instead of
   * creating a second one.
   */
  onExtend?: (product: { id: number | string; name: string }) => void;
  /**
   * Variants on a sales page: label what has run out "- out of stock", as
   * the sales screens do - but leave it pickable, since the bill is history.
   */
  markOutOfStock?: boolean;
}

/**
 * A picker for the entry screens - the invoice screens' picker. The whole
 * list is loaded once (/backlog-work/lookup/<kind>/?all=1, names only, never
 * a stock figure, a price or a balance) and filtered on the page as the user
 * types, so typing sends nothing to the server.
 *
 * It used to search the server on every change of the text. The field is
 * also set by the picker itself - to the picked name, whenever the picked
 * option changes - and a saved page names a customer "Wajid Ali" while the
 * search names them "Wajid Ali · 0331...": each search relabelled the pick,
 * which set the field, which searched again, four times a second for as
 * long as the page was open.
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
  markOutOfStock = false,
}: LookupComboboxProps) {
  const { token } = useAuth();
  const [items, setItems] = useState<LookupItem[]>([]);
  const [loading, setLoading] = useState(true);
  // What is typed, for the Create button only: the list filters itself.
  const [query, setQuery] = useState("");

  // Once per picker, as the invoice screens load theirs.
  useEffect(() => {
    if (!token) return;
    let current = true;
    const fetchItems = async () => {
      try {
        const found = await workLookup(token, kind, "", markOutOfStock, true);
        if (current) setItems(found || []);
      } catch (error) {
        console.log(`Error loading ${kind}:`, error);
      } finally {
        if (current) setLoading(false);
      }
    };
    fetchItems();
    return () => { current = false; };
  }, [token, kind, markOutOfStock]);

  // One object per option for the life of the picker. Base UI resets the
  // input to the picked item's label whenever the picked value changes
  // identity, so a rebuilt option would put the full name back mid-edit.
  const optionCache = useRef(new Map<string, ComboboxOption>());
  const optionFor = (id: string, label: string, keywords: string[] = []) => {
    const cacheKey = `${id}|${label}`;
    let option = optionCache.current.get(cacheKey);
    if (!option) {
      option = { value: id, label, keywords };
      optionCache.current.set(cacheKey, option);
    }
    return option;
  };

  const options: ComboboxOption[] = useMemo(() => {
    const list = items.map((item) => optionFor(
      String(item.id),
      item.in_stock === false ? `${item.label} - out of stock` : item.label,
      // A SKU or a product code, and a variant's bare names, so a search
      // finds what the label does not spell out.
      [...((item.keywords as string[] | undefined) ?? []), item.name, item.product_name]
        .filter(Boolean).map(String),
    ));
    const key = value === null || value === undefined ? "" : String(value);
    if (key && selectedLabel && !list.some((option) => option.value === key)) {
      list.unshift(optionFor(key, selectedLabel));
    }
    return list;
  }, [items, value, selectedLabel]);

  const typed = query.trim();
  const createAction: ComboboxCreateAction | null = useMemo(() => {
    if (!onCreate || !typed) return null;
    const product = onExtend
      ? items.find((item) => String(item.product_name ?? "").trim().toLowerCase() === typed.toLowerCase())
      : undefined;
    if (product) {
      const group = { id: product.product as number, name: String(product.product_name) };
      // Enter opens it too, unless a variant is highlighted to pick.
      return { label: `Add variants to "${group.name}"`, buttonText: "Add variants", onCreate: () => onExtend(group), onEnter: true };
    }
    const exact = options.some((option) => option.label.trim().toLowerCase() === typed.toLowerCase())
      || items.some((item) => item.label.trim().toLowerCase() === typed.toLowerCase());
    if (exact || typed === String(selectedLabel).trim()) return null;
    return {
      label: `Create ${createNoun ? `${createNoun} ` : ""}"${typed}"`,
      onCreate: () => onCreate(typed),
      // Enter creates, matches listed or not; a match is picked by arrowing
      // onto it (BUGS #001).
      onEnter: true,
    };
  }, [onCreate, onExtend, typed, items, options, selectedLabel, createNoun]);

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
      onInputChange={setQuery}
      loading={loading}
      placeholder={placeholder}
      emptyText={createAction ? `Not in MarketPro yet. Press Enter or Create to add it.` : emptyText}
      notFoundText={notFoundText}
      clearable={clearable}
      disabled={disabled}
      createAction={createAction}
    />
  );
}

export default LookupCombobox;
