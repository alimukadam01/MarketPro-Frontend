import { useEffect, useState } from "react";
import {
  getCitiesList, getCustomersList, getEmployeesList, getLocationsList, getUnitsList,
  moneyAccountsAPIPackage, productsAPIPackage, projectsAPIPackage, suppliersAPIPackage,
} from "../../services/api";
import { AccountTypeMap, formatPartyLabel } from "../../services/utils";

export type FilterOption = { value: string; label: string; keywords?: string[] };

export type FilterOptionKind =
  | "customers" | "suppliers" | "products" | "projects" | "accounts"
  | "units" | "cities" | "locations" | "staff";

type Loaded = Record<FilterOptionKind, FilterOption[]>;
type Loading = Record<FilterOptionKind, boolean>;

// Every option's value is the record's id, as a string (the dialog's inputs
// hold strings). Filtering by id keeps two customers who share a name apart;
// the keywords let the dropdown still be searched by phone or city.
const LOADERS: Record<FilterOptionKind, (token: string, user) => Promise<FilterOption[] | null>> = {
  customers: async (token) => (await getCustomersList(token))?.map((c) => ({
    value: String(c.id), label: c.name,
    keywords: [c.phone, c.phone_number, c.city?.name].filter(Boolean),
  })),
  suppliers: async (token) => (await suppliersAPIPackage.list(token))?.map((s) => ({
    // "name (business name)": the firm is what a user recognises.
    value: String(s.id), label: formatPartyLabel(s), keywords: [s.business_name, s.phone].filter(Boolean),
  })),
  products: async (token) => (await productsAPIPackage.list(token))?.map((p) => ({
    value: String(p.id), label: p.name, keywords: [p.code].filter(Boolean),
  })),
  projects: async (token) => (await projectsAPIPackage.list(token))?.map((p) => ({
    value: String(p.id), label: p.name,
  })),
  accounts: async (token) => (await moneyAccountsAPIPackage.list(token))?.map((a) => ({
    value: String(a.id), label: `${a.name} (${AccountTypeMap[a.type] || a.type})`,
  })),
  units: async (token) => (await getUnitsList(token))?.map((u) => ({
    value: String(u.id), label: u.name,
  })),
  cities: async (token) => (await getCitiesList(token))?.map((c) => ({
    value: String(c.id), label: c.name,
  })),
  locations: async (token) => (await getLocationsList(token))?.map((l) => ({
    value: String(l.id), label: l.name,
  })),
  // Whoever can enter an invoice: the owner (when it is the owner looking)
  // and the employees. The employee list is the admin's to read, so for an
  // employee it can fail - they then see themselves only.
  staff: async (token, user) => {
    const self = user?.id ? [{ value: String(user.id), label: `${user.first_name} ${user.last_name}`.trim() }] : [];
    const businessId = localStorage.getItem("mp-business-id");
    const employees = businessId ? await getEmployeesList(token, businessId) : null;
    const others = (employees || [])
      .map((e) => ({ value: String(e.user?.id), label: e.user?.name || e.user?.email }))
      .filter((o) => o.value && o.value !== self[0]?.value);
    return [...self, ...others];
  },
};

/**
 * The option lists a page's filter dialog needs, loaded with the page so a
 * dropdown is never empty on first open.
 *
 *   const options = useFilterOptions(token, user, ["customers", "projects"]);
 *   options.customers         // [{ value: "12", label: "Ali Traders", keywords }]
 *   options.loading.customers // true until it lands
 */
export function useFilterOptions(token: string | null, user, kinds: FilterOptionKind[]) {
  const [options, setOptions] = useState<Partial<Loaded>>({});
  const [loading, setLoading] = useState<Partial<Loading>>(
    () => Object.fromEntries(kinds.map((kind) => [kind, true])));
  const key = kinds.join(",");

  useEffect(() => {
    if (!token) return;
    kinds.forEach(async (kind) => {
      try {
        // No toast on failure: some lists are another module's (money
        // accounts need accounting access), and a user without it should
        // see an empty dropdown, not an error about something they never
        // asked for.
        const list = await LOADERS[kind](token, user);
        if (list) setOptions((prev) => ({ ...prev, [kind]: list }));
      } catch (error) {
        console.log(`Error loading ${kind} for the filter:`, error);
      } finally {
        setLoading((prev) => ({ ...prev, [kind]: false }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, key]);

  return {
    ...Object.fromEntries(kinds.map((kind) => [kind, options[kind] || []])),
    loading,
  } as Record<FilterOptionKind, FilterOption[]> & { loading: Partial<Loading> };
}
