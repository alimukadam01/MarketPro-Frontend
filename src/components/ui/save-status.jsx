import { Check, CircleAlert, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * What autosave is doing, in one line.
 *
 * Autosave used to say nothing at all unless it FAILED, 1.5s after you stopped
 * typing, so a slow save and a dropped edit looked identical. Pair this with
 * useFieldPatch, which reports the state.
 *
 * Red and green differ in lightness as well as hue, so the two are still
 * distinguishable without colour vision.
 */
function SaveStatus({ status, onRetry, className = "" }) {
    const state = status?.state || "idle";

    if (state === "idle") {
        // Nothing to report yet, so the card stays quiet. The element is kept
        // so the header does not reflow the moment you start typing.
        return <div className={`h-5 ${className}`} aria-hidden="true" />;
    }

    if (state === "saving") {
        return (
            <div
                role="status"
                className={`flex shrink-0 items-center gap-1.5 text-[13px] leading-5 text-muted-foreground ${className}`}
            >
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                Saving…
            </div>
        );
    }

    if (state === "saved") {
        return (
            <div
                role="status"
                className={`flex shrink-0 items-center gap-1.5 text-[13px] leading-5 text-emerald-700 ${className}`}
            >
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                All changes saved
            </div>
        );
    }

    return (
        <div className={`flex shrink-0 items-center gap-2 ${className}`}>
            <span
                role="status"
                className="flex items-center gap-1.5 text-[13px] leading-5 text-red-700"
            >
                <CircleAlert className="h-3.5 w-3.5" strokeWidth={2.5} />
                Couldn't save{status?.field ? ` ${label(status.field)}` : ""}
            </span>
            {onRetry && (
                <Button variant="outline" size="sm" className="h-7 px-2.5" onClick={onRetry}>
                    Retry
                </Button>
            )}
        </div>
    );
}

const label = (field) =>
    field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, " ");

export default SaveStatus;
