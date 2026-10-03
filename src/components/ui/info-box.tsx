import * as React from "react"
import { Info, CircleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

type Variant = "info" | "error" | "loading"

const STYLES: Record<Variant, string> = {
  info: "border-border bg-muted/50 text-muted-foreground",
  error: "border-red-200 bg-red-50 text-red-700",
  loading: "border-border bg-muted/50 text-muted-foreground",
}

export interface InfoBoxProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: Variant
  /** Renders a Retry button on the right. Pair with variant="error". */
  onRetry?: () => void
  retryLabel?: string
}

/**
 * A short status message in a bordered box.
 *
 * Lifted out of record-payment-dialog.jsx, which grew the first one inline.
 * 13px is the sonner toast font-size, so an inline message and a toast read as
 * the same voice rather than two different systems.
 *
 * `error` carries a Retry, because the thing it most often replaces is a
 * surface that failed to load and currently shows nothing at all once the
 * toast has faded - leaving the user unable to tell a failure from an empty
 * list, and with no way to try again short of reloading the page.
 */
function InfoBox({
  variant = "info",
  onRetry,
  retryLabel = "Retry",
  className,
  children,
  ...props
}: InfoBoxProps) {
  const Icon = variant === "error" ? CircleAlert : Info

  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2 text-[13px] leading-5",
        STYLES[variant],
        className
      )}
      {...props}
    >
      {variant === "loading" ? (
        <Spinner size={16} className="mt-0.5" />
      ) : (
        <Icon className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden="true" />
      )}
      <span className="min-w-0 flex-1">{children}</span>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 shrink-0 px-2.5"
          onClick={onRetry}
        >
          {retryLabel}
        </Button>
      )}
    </div>
  )
}

export { InfoBox }
export default InfoBox
