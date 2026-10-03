import { cn } from "@/lib/utils"

/**
 * A placeholder that holds the shape of the content still loading.
 *
 * TINT. Brand purple rather than neutral grey: the body is --primary at 0.22
 * and the crest of the sweep is the same hue at 0.06, so the highlight falls
 * back to near-white page and the whole thing reads purple-to-white. Those two
 * alphas are the dial if it wants to be stronger or softer.
 *
 * The alphas are higher than the grey version's 0.10/0.033 because they have
 * to be. --primary sits at 57.8% lightness where --foreground sits at 4.1%, so
 * the same alpha over the same page is far weaker; 0.22 lands the body at
 * roughly the contrast the grey version had.
 *
 * They must stay written out in full. Tailwind finds classes by scanning the
 * source for complete strings, so building this from constants - `${BASE}` -
 * compiles fine and then silently emits no CSS at all, exactly like the
 * grid-cols-${n} case elsewhere in this codebase.
 *
 * ON DARK MODE. --primary is only purple in the light theme; the dark block in
 * index.css overrides it to a near-white 210 40% 98%. Dark mode is dormant
 * today - next-themes is referenced only inside shadcn's sonner.tsx and no
 * ThemeProvider is mounted - so this reads purple everywhere it can currently
 * be seen. If dark mode is ever switched on, the placeholder degrades to
 * white-on-dark: still legible, no longer brand-coloured. Giving it a purple
 * that survives both themes means a token that does not exist yet.
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
        "bg-[linear-gradient(90deg,hsl(var(--primary)/0.22)_25%,hsl(var(--primary)/0.06)_50%,hsl(var(--primary)/0.22)_75%)]",
        "bg-[length:200%_100%] animate-shimmer motion-reduce:animate-none",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
