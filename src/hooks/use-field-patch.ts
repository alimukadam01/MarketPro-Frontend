import { useCallback, useRef, useState } from "react";
import { patchResource } from "../../services/api";

/**
 * Autosaving form fields. Each field debounces on its own timer, so typing in
 * one field never cancels a pending save in another.
 *
 * Pass delay 0 for Selects and other one-click controls - there is nothing to
 * wait for, and the save should land while the user is still looking at it.
 *
 * The hook also reports what autosave is doing. It used to be silent unless it
 * FAILED, 1.5s after you stopped typing, which read as nothing happening at
 * all. `status` goes "saving" on the keystroke rather than when the request
 * leaves, so the debounce is visible instead of looking like a dropped edit.
 *
 *   const { patchField, status, retry } = useFieldPatch(token)
 *
 *   status.state  "idle" | "saving" | "saved" | "error"
 *   status.field  the field that failed, for "Couldn't save Phone"
 *   retry()       re-sends the last failed save
 *
 * "saved" is settled from two counters rather than one: a save is finished
 * only when nothing is still SCHEDULED and nothing is still IN FLIGHT. One
 * counter cannot express that - a field edited again while its own request was
 * in flight could leave the count standing above zero, and the line then sat
 * on "Saving…" for ever. "saved" also persists until the next edit instead of
 * clearing itself after a few seconds, so a save that has landed always says
 * so rather than flashing past.
 */
export const useFieldPatch = (token) => {
    const timersRef = useRef({});
    const inFlightRef = useRef(0);
    const failedRef = useRef(null);
    const [status, setStatus] = useState({ state: "idle", field: null });

    /** Report only once the whole form is quiet. */
    const settle = useCallback(() => {
        if (Object.keys(timersRef.current).length > 0) return;
        if (inFlightRef.current > 0) return;

        const failed = failedRef.current;
        setStatus(
            failed
                ? { state: "error", field: failed.field }
                : { state: "saved", field: null },
        );
    }, []);

    const send = useCallback(async (endpoint, field, value) => {
        inFlightRef.current += 1;
        let saved = false;
        try {
            saved = await patchResource(token, endpoint, { [field]: value });
        } finally {
            inFlightRef.current -= 1;
        }

        if (saved) {
            // Only this field's failure is resolved; another field's is not.
            if (failedRef.current?.field === field) failedRef.current = null;
        } else {
            failedRef.current = { endpoint, field, value };
        }

        settle();
    }, [token, settle]);

    const patchField = useCallback((endpoint, field, value, delay = 1500) => {
        const key = `${endpoint}:${field}`;
        if (timersRef.current[key]) clearTimeout(timersRef.current[key]);

        setStatus({ state: "saving", field });

        timersRef.current[key] = setTimeout(() => {
            delete timersRef.current[key];
            send(endpoint, field, value);
        }, delay);
    }, [send]);

    const retry = useCallback(() => {
        const failed = failedRef.current;
        if (!failed) return;
        setStatus({ state: "saving", field: failed.field });
        send(failed.endpoint, failed.field, failed.value);
    }, [send]);

    return { patchField, status, retry };
};
