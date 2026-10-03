import MoonLoader from "react-spinners/MoonLoader"
import { cn } from "@/lib/utils"

interface SpinnerProps {
  /**
   * Rendered size in px, edge to edge. Defaults to 16 to match the `h-4 w-4`
   * lucide icons used on buttons throughout the app.
   */
  size?: number
  className?: string
  /** Screen-reader label. Omit inside a control that already says "Saving…". */
  label?: string
}

/**
 * The one spinner in the app.
 *
 * Wraps react-spinners' MoonLoader so no call site passes a colour or does the
 * size arithmetic:
 *
 *  - `currentColor` is the whole point of the wrapper. MoonLoader writes the
 *    colour straight into backgroundColor/border with no rgba parsing, so it
 *    inherits from whatever it sits in - white on a primary button, foreground
 *    on an outline one - and no variant prop is needed.
 *
 *  - MoonLoader INFLATES the box: it renders at `size + 2 * round(size / 7)`,
 *    so a naive size={16} occupies 20px and knocks button text out of
 *    alignment. The conversion below means callers pass the size they actually
 *    want to see.
 */
export function Spinner({ size = 16, className, label }: SpinnerProps) {
  // Invert MoonLoader's own inflation: rendered = s + 2 * round(s / 7).
  const inner = Math.max(Math.round((size * 7) / 9), 1)

  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <MoonLoader size={inner} color="currentColor" speedMultiplier={0.9} />
    </span>
  )
}

export default Spinner
