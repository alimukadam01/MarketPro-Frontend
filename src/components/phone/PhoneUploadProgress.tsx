import { useEffect, useState } from "react";
import { CloudUpload, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface PhoneUploadProgressProps {
  /** What is going up: "12 photos", "1 zip". */
  what: string;
  stage: "sending" | "saving";
  sent: { loaded: number; total: number | null } | null;
  startedAt: number | null;
  onCancel: () => void;
}

const megabytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

// Guessed from the speed so far, once there is enough of it to go on.
function timeLeft(sent: PhoneUploadProgressProps["sent"], startedAt: number | null, now: number) {
  if (!sent?.total || !startedAt || sent.loaded === 0) return null;
  const elapsed = (now - startedAt) / 1000;
  if (elapsed < 3) return null;
  const seconds = (sent.total - sent.loaded) / (sent.loaded / elapsed);
  if (seconds < 60) return "less than a minute left";
  return `about ${Math.round(seconds / 60)} min left`;
}

/**
 * The phone's upload screen, over the form while a batch goes up. A book's
 * worth of photos takes minutes on a phone's connection, and a spinner on a
 * button at the foot of the page looked like nothing was happening.
 *
 * Two stages: sending, with the bytes, a bar and the time left, and then
 * saving, while the server unpacks and stores each page - with no bytes left
 * to count, a clock shows it is still working rather than stuck at 100%.
 * Cancel is offered only while sending; once the photos are on the server
 * the pages are being made and stopping here would not stop that.
 */
export function PhoneUploadProgress({ what, stage, sent, startedAt, onCancel }: PhoneUploadProgressProps) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  const sending = stage === "sending";
  const percent = sent?.total ? Math.min(100, Math.round((sent.loaded / sent.total) * 100)) : null;
  const left = timeLeft(sent, startedAt, now);
  const elapsed = startedAt ? (now - startedAt) / 1000 : 0;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="upload-progress-title"
      aria-describedby="upload-progress-detail"
      className="fixed inset-0 z-50 flex flex-col bg-background px-6 py-10"
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
          {sending ? <CloudUpload className="w-8 h-8" /> : <Spinner size={30} />}
        </div>

        <div className="flex flex-col gap-1.5">
          <h1 id="upload-progress-title" className="text-[22px] font-bold">
            {sending ? `Uploading ${what}` : "Adding the pages to the queue"}
          </h1>
          <p id="upload-progress-detail" className="text-[15px] text-muted-foreground">
            {sending
              ? "This can take a few minutes on a phone's connection."
              : "The photos are sent. Each one is being checked and saved as a page."}
          </p>
        </div>

        <div className="w-full flex flex-col gap-2" aria-live="polite">
          <Progress
            value={sending ? percent ?? 0 : 100}
            aria-label={sending ? "Sent" : "Saving"}
            className={cn("h-2.5", !sending && "animate-pulse")}
          />
          <div className="flex justify-between gap-3 text-sm tabular-nums text-muted-foreground">
            {sending ? (
              <>
                <span>{sent?.total ? `${megabytes(sent.loaded)} of ${megabytes(sent.total)}` : "Sending…"}</span>
                <span className="font-semibold text-foreground">{percent !== null ? `${percent}%` : ""}</span>
              </>
            ) : (
              <>
                <span>Still working</span>
                <span>{clock(elapsed)}</span>
              </>
            )}
          </div>
          {sending && left && <p className="text-sm text-muted-foreground text-left">{left[0].toUpperCase() + left.slice(1)}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-xl border bg-card px-4 py-3.5 text-left">
          <Smartphone className="w-5 h-5 shrink-0 mt-0.5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Keep this screen open until it finishes. Locking the phone or switching apps can stop the upload.
          </p>
        </div>
        {sending && (
          <Button variant="outline" className="w-full h-12 text-[15px]" onClick={onCancel}>
            Cancel upload
          </Button>
        )}
      </div>
    </div>
  );
}
