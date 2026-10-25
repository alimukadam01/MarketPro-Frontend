import { useState } from "react";
import { Maximize, RotateCcw, RotateCw, ZoomIn, ZoomOut, ImageOff } from "lucide-react";
import { getImageUrl } from "../../../services/utils";

const STEPS = [50, 75, 100, 125, 150, 200, 250, 300];

/**
 * The photo of the page being entered. Zoom and rotate, because a phone
 * photo of a ledger is rarely square to the camera and the figures are small.
 * The frame scrolls, so a zoomed page is read by moving around it.
 */
export function PagePhoto({ src, className = "" }: { src: string | null; className?: string }) {
  const [zoom, setZoom] = useState(100);
  const [turns, setTurns] = useState(0);
  const url = src ? getImageUrl(src) : null;
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
