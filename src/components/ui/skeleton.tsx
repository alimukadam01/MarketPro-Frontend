import { cn } from "@/lib/utils"

/**
 * A placeholder that holds the shape of the content still loading.
 *
 * TINT STRENGTH. The two alphas below are the dial you want when a skeleton
 * reads too faint or too heavy: 0.10 is the body of the placeholder, 0.033 the
 * crest of the sweep. They are alphas over --foreground rather than fixed
 * greys, so one pair darkens a light page and lightens a dark one with no
 * second value to keep in sync.
 *
 * They must stay written out in full. Tailwind finds classes by scanning the
 * source for complete strings, so building this from constants - `${BASE}` -
 * compiles fine and then silently emits no CSS at all, exactly like the
 * grid-cols-${n} case elsewhere in this codebase.
 *
 * The first version used the --muted/--background token pair directly. In the
 * light theme those sit at 95.9% and 98% lightness, barely two points apart,
 * so the placeholder was nearly invisible against the page.
 *
 * The sweep is a three-stop gradient moved by background-position (the
 * `shimmer` keyframe in tailwind.config.ts), not a translating child element,
 * so this stays a single div and every `className` a caller passes still
 * applies.
 *
 * motion-reduce:animate-none matters more here than in most places: a list
 * page renders about eight of these at once, and that much synchronised
 * movement is a real vestibular problem. The gradient still reads as a
 * placeholder when it is standing still.
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-md",
        "bg-[linear-gradient(90deg,hsl(var(--foreground)/0.10)_25%,hsl(var(--foreground)/0.033)_50%,hsl(var(--foreground)/0.10)_75%)]",
        "bg-[length:200%_100%] animate-shimmer motion-reduce:animate-none",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
