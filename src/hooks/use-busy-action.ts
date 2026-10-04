import { useCallback, useState } from "react";

/**
 * usePending, but it remembers WHICH action is in flight.
 *
 *   const { busy, run } = useBusyAction();
 *
 *   <Button disabled={!!busy || ...} onClick={run("cleared", handleMarkCleared)}>
 *     {busy === "cleared" ? <Spinner size={16} /> : <CheckCircle2 className="w-4 h-4" />}
 *     <span>Mark Cleared</span>
 *   </Button>
 *
 * The toolbars here hold several buttons that act on the same selected record -
 * Mark Cleared beside Mark Bounced, Restock beside Add Back to Sales Invoice,
 * Duplicate beside Delete. A single boolean would spin all of them at once; a
 * flag per button would let two conflicting writes run against the same row.
 * One key does both jobs: everything is disabled, only the button that was
 * clicked spins.
 *
 * Keyed by id rather than by name where the actions repeat per row, which is
 * what `removingId` already does by hand in payments.jsx.
 *
 * Wrapping at the call site rather than threading a flag through each handler
 * is the same choice usePending makes, and for the same reason: these handlers
 * have different shapes and several return early, so a finally added to every
 * one of them is a chance to miss a branch and strand a disabled button.
 */
export function useBusyAction() {
  const [busy, setBusy] = useState<string | null>(null);

  const run = useCallback(
    <A extends unknown[], R>(key: string, fn: (...args: A) => R | Promise<R>) =>
      async (...args: A): Promise<R | undefined> => {
        setBusy(key);
        try {
          return await fn(...args);
        } finally {
          // finally, not the success path: a handler that throws or returns
          // early must still release the toolbar.
          setBusy(null);
        }
      },
    [],
  );

  return { busy, run };
}
