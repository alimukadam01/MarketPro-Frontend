import { useRef } from "react";
import { toast } from "sonner";
import { patchResource } from "../../services/api";

/**
 * Autosaving form fields. Each field debounces on its own timer, so typing in
 * one field never cancels a pending save in another.
 *
 * Pass delay 0 for Selects and other one-click controls - there is nothing to
 * wait for, and the save should land while the user is still looking at it.
 */
export const useFieldPatch = (token) => {
    const debounceTimersRef = useRef({});

    const patchField = (endpoint, field, value, delay = 1500) => {
        const key = `${endpoint}:${field}`;
        if (debounceTimersRef.current[key]) clearTimeout(debounceTimersRef.current[key]);
        debounceTimersRef.current[key] = setTimeout(async () => {
            const success = await patchResource(token, endpoint, { [field]: value });
            if (!success) toast.error("Failed to save changes.");
        }, delay);
    };

    return patchField;
};
