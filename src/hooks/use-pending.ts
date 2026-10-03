import { useCallback, useState } from "react";

/**
 * Tracks whether a submit is in flight, without touching the handler.
 *
 *   const { pending, run } = usePending();
 *   <form onSubmit={handleSubmit(run(onSubmit))}>
 *   <SubmitButton pending={pending}>Create Invoice</SubmitButton>
 *
 * Wrapping at the call site rather than editing each handler is deliberate:
 * there are 26 of these across the Create and Update pages, each with a
 * different body, several with early returns. Threading setPending(true) and a
 * finally through every one of them is 26 chances to miss a branch and leave a
 * button disabled for ever. This way the guard is identical everywhere and the
 * handlers are untouched.
 *
 * `run` returns a NEW function each render, which is fine for a form's
 * onSubmit - it is read at submit time, never used as a dependency or
 * compared.
 *
 * Most of these handlers navigate away on success, so the component is often
 * gone by the time the finally runs. React 18 dropped the "setState on an
 * unmounted component" warning for exactly this shape, and clearing a flag
 * nobody reads is harmless.
 */
export function usePending() {
  const [pending, setPending] = useState(false);

  const run = useCallback(
    <A extends unknown[], R>(fn: (...args: A) => R | Promise<R>) =>
      async (...args: A): Promise<R | undefined> => {
        setPending(true);
        try {
          return await fn(...args);
        } finally {
          // finally, not the success path: a handler that throws or returns
          // early must still release the button.
          setPending(false);
        }
      },
    [],
  );

  return { pending, run };
}
