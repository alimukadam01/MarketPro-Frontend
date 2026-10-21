import { useEffect, useRef, useState } from "react";
import { globalSearch } from "../../services/api";

export type SearchStatus = { code: string; label: string; tone: "success" | "warning" | "danger" | "neutral" };

export type SearchHit = {
  id: number;
  title: string;
  subtitle: string;
  amount: number | null;
  date: string | null;
  status: SearchStatus | null;
  link: { path: string; state: Record<string, unknown> } | null;
};

export type SearchGroup = {
  type: string;
  label: string;
  total: number;
  hits: SearchHit[];
  breakdown?: { label: string; count: number }[];
};

export type SearchState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "results"; groups: SearchGroup[] }
  | { kind: "empty" }
  | { kind: "error" };

// The same rule the backend applies (root/search/matching.py): two
// characters, or any number. Shorter is never sent.
const NUMBER = /^\d[\d,]*(\.\d+)?$/;
export const isSearchable = (text: string) => text.length >= 2 || NUMBER.test(text);

/**
 * The header search: the term, a 400ms debounce, and one state at a time -
 * idle, loading, results, empty or error.
 *
 * Each request is numbered and only the newest one may set the state, so a
 * slow answer to "al" can never land on top of the answer to "ali".
 */
export function useGlobalSearch(token: string | null, delay = 400) {
  const [term, setTerm] = useState("");
  const [state, setState] = useState<SearchState>({ kind: "idle" });
  const latest = useRef(0);

  useEffect(() => {
    const query = term.trim();
    const ticket = ++latest.current;
    if (!token || !isSearchable(query)) {
      setState({ kind: "idle" });
      return;
    }

    setState({ kind: "loading" });
    const timer = setTimeout(async () => {
      try {
        const res = await globalSearch(token, query);
        if (ticket !== latest.current) return;
        if (!res) {
          setState({ kind: "error" });
        } else if (!res.groups || res.groups.length === 0) {
          setState({ kind: "empty" });
        } else {
          setState({ kind: "results", groups: res.groups });
        }
      } catch (error) {
        console.log("Error performing search:", error);
        if (ticket === latest.current) setState({ kind: "error" });
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [term, token, delay]);

  return { term, setTerm, state };
}
