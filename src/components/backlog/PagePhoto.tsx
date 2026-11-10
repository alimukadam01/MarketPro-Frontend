import { useEffect, useState } from "react";
import { Maximize, RotateCcw, RotateCw, ZoomIn, ZoomOut, ImageOff, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EntryPage } from "./meta";
import { getImageUrl } from "../../../services/utils";

const STEPS = [50, 75, 100, 125, 150, 200, 250, 300];

interface PagePhotoProps {
  src: string | null;
  className?: string;
  /**
   * Every page of an invoice that runs across several (BUGS #003), the first
   * being `src`'s. With more than one, tabs pick the page on show.
   */
  pages?: EntryPage[];
  /** Detach a joined page: its tab gets an x. Entry only, never in review. */
  onDetach?: (pageId: number) => void;
}

/**
 * The photo of the page being entered. Zoom and rotate, because a phone
 * photo of a ledger is rarely square to the camera and the figures are small.
 * The frame scrolls, so a zoomed page is read by moving around it.
 */
export function PagePhoto({ src, className = "", pages, onDetach }: PagePhotoProps) {
  const [zoom, setZoom] = useState(100);
  const [turns, setTurns] = useState(0);
  const many = (pages?.length || 0) > 1;
  const [shown, setShown] = useState(0);
  // A page detached, or a new one added: stay in range, and show the newest.
  useEffect(() => {
    setShown((index) => Math.min(index, Math.max((pages?.length || 1) - 1, 0)));
  }, [pages?.length]);
  const showPage = (index: number) => {
    setShown(index);
    setZoom(100);
    setTurns(0);
  };
  const current = many ? pages![shown]?.image ?? null : src;
  const url = current ? getImageUrl(current) : null;
  const name = url ? decodeURIComponent(url.split("?")[0].split("/").pop() || "") : "";

  const step = (direction: 1 | -1) => {
    const index = STEPS.indexOf(zoom);
    const next = STEPS[Math.min(Math.max(index + direction, 0), STEPS.length - 1)];
    setZoom(next ?? 100);
  };

  const tools = [
    { label: "Zoom out", icon: ZoomOut, onClick: () => step(-1) },
    { label: "Zoom in", icon: ZoomIn, onClick: () => step(1) },
    { label: "Rotate left", icon: RotateCcw, onClick: () => setTurns((t) => t - 1) },
    { label: "Rotate right", icon: RotateCw, onClick: () => setTurns((t) => t + 1) },
    { label: "Fit to screen", icon: Maximize, onClick: () => { setZoom(100); setTurns(0); } },
  ];

  return (
    <section className={`flex flex-col min-h-0 rounded-lg border bg-card overflow-hidden ${className}`}>
      <div className="shrink-0 flex items-center justify-between gap-2 border-b px-3 h-11">
        <div className="flex items-center gap-1">
          {tools.map(({ label, icon: Icon, onClick }) => (
            <button
              key={label}
              type="button"
              title={label}
              aria-label={label}
              onClick={onClick}
              disabled={!url}
              className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
        <span className="min-w-0 truncate text-xs text-muted-foreground" title={name}>
          {zoom}%{name ? ` · ${name}` : ""}
        </span>
      </div>

      {many && (
        <div role="tablist" aria-label="Pages of this invoice" className="shrink-0 flex flex-wrap gap-1 border-b px-2 py-1.5">
          {pages!.map((page, index) => (
            <span
              key={page.id}
              className={cn(
                "inline-flex items-center rounded-md text-xs font-medium",
                index === shown ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
              )}
            >
              <button
                type="button"
                role="tab"
                aria-selected={index === shown}
                onClick={() => showPage(index)}
                className="px-2 py-1"
              >
                Page {index + 1}
              </button>
              {onDetach && index > 0 && (
                <button
                  type="button"
                  title={`Detach page ${index + 1}: it goes back to the queue on its own`}
                  aria-label={`Detach page ${index + 1}`}
                  onClick={() => onDetach(page.id)}
                  className="mr-1 rounded p-0.5 hover:bg-foreground/10"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-auto bg-muted">
        {url ? (
          <div
            className="min-h-full flex items-center justify-center p-3"
            style={{ width: `${zoom}%`, minWidth: "100%" }}
          >
            <img
              src={url}
              alt="The page being entered"
              className="max-w-full h-auto shadow-md transition-transform"
              style={{ transform: `rotate(${turns * 90}deg)` }}
            />
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <ImageOff className="h-6 w-6" />
            No photo
          </div>
        )}
      </div>
    </section>
  );
}

export default PagePhoto;
