import { cn } from "@/lib/utils"

/**
 * A placeholder that holds the shape of the content still loading.
 *
 * TINT. Brand purple, from --skeleton-base and --skeleton-crest in index.css.
 * Both carry --primary's exact hue and saturation (262.1 83.3%) and differ
 * only in lightness, which is the whole trick: the placeholder reads as the
 * same purple the sidebar and the buttons use, while staying pale enough not
 * to compete with the content about to replace it.
 *
 * It is deliberately NOT `hsl(var(--primary) / 0.15)`. Alpha scales chroma and
 * lightness together, so putting the brand purple behind a low alpha drops it
 * to 66% saturation and it reads as washed-out mauve - pale and off-brand at
 * the same time. Setting the colour outright keeps saturation at 83.3% and
 * lets lightness alone decide how loud it is. Lightness is the dial: raise
 * --skeleton-base toward 98% to calm it, lower it toward 85% to strengthen it,
 * and leave the first two numbers alone so it stays the brand hue.
 *
 * The classes must stay written out in full. Tailwind finds classes by
 * scanning the source for complete strings, so composing them from constants
 * compiles fine and then silently emits no CSS, exactly like the
 * grid-cols-${n} case elsewhere in this codebase.
 *
 * Tokens rather than literals because the dark theme needs the opposite move -
 * lightness above the page instead of below it - and because --primary itself
 * is not purple there, so deriving from it would have gone white-on-dark the
 * day dark mode was switched on.
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
        "bg-[linear-gradient(90deg,hsl(var(--skeleton-base))_25%,hsl(var(--skeleton-crest))_50%,hsl(var(--skeleton-base))_75%)]",
        "bg-[length:200%_100%] animate-shimmer motion-reduce:animate-none",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
