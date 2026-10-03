import { cn } from "@/lib/utils"

/**
 * A placeholder that holds the shape of the content still loading.
 *
 * The sweep is a three-stop gradient moved by background-position (the
 * `shimmer` keyframe in tailwind.config.ts), not a translating child element,
 * so this stays a single div and every `className` a caller passes still
 * applies.
 *
 * Both stops are HSL tokens rather than literal greys. darkMode is enabled and
 * --muted / --background both flip, so a hardcoded grey-to-white sweep would
 * glow against a dark page.
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
        "rounded-md bg-muted",
        "bg-[linear-gradient(90deg,hsl(var(--muted))_25%,hsl(var(--background))_50%,hsl(var(--muted))_75%)]",
        "bg-[length:200%_100%] animate-shimmer motion-reduce:animate-none",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
