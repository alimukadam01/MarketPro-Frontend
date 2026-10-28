import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../../services/AuthProvider";
import { uploadBacklogBatch } from "../../services/api";

// In the order pages are entered: stock first, then purchases, then sales.
export const UPLOAD_TYPES = [
  { value: "stock_list", label: "Stock lists" },
  { value: "purchase_invoice", label: "Purchase invoices" },
  { value: "sales_invoice", label: "Sales invoices" },
];

export const UPLOAD_PRIORITIES = [
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
];

/**
 * The upload form's state and its sending, shared by the computer's page
 * (BacklogUpload) and the phone's (PhoneUpload), which lay it out
 * differently. `previewLimit` is how many thumbnails the page has room for.
 */
export function useBacklogUpload(previewLimit: number) {
  const { token } = useAuth();
  const [type, setType] = useState("sales_invoice");
  const [bookLabel, setBookLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState("normal");
  const [isDaily, setIsDaily] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  // Bytes sent and when sending began, for the bar and the time left.
  const [sent, setSent] = useState<{ loaded: number; total: number | null } | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const abort = useRef<AbortController | null>(null);

  const progress = sent?.total ? Math.min(100, Math.round((sent.loaded / sent.total) * 100)) : null;
  // Once every byte is out the server unpacks, checks and stores each page,
  // which on a big batch takes a while of its own - not a stuck 100%.
  const stage: "sending" | "saving" | null = !uploading ? null : progress === 100 ? "saving" : "sending";

  // A long upload dies with the page: warn before leaving it, and keep a
  // phone's screen from locking, which can suspend the tab mid-send.
  useEffect(() => {
    if (!uploading) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    let lock: WakeLockSentinel | null = null;
    let released = false;
    // Absent on older browsers, and refused on a page that is not visible.
    navigator.wakeLock?.request("screen")
      .then((sentinel) => { if (released) sentinel.release(); else lock = sentinel; })
      .catch((error) => console.log("Could not keep the screen on:", error));
    return () => {
      released = true;
      window.removeEventListener("beforeunload", warn);
      lock?.release().catch(() => {});
    };
  }, [uploading]);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)]);
  };
  const removeFile = (index: number) => setFiles((prev) => prev.filter((_, i) => i !== index));
  const clearFiles = () => setFiles([]);

  const zipCount = files.filter((file) => file.name.toLowerCase().endsWith(".zip")).length;
  const photoCount = files.length - zipCount;
  // Each carries its file's place in `files`, so a thumbnail can remove it.
  const previews = useMemo(
    () => files
      .map((file, index) => ({ file, index }))
      .filter(({ file }) => file.type.startsWith("image/"))
      .slice(0, previewLimit)
      .map(({ file, index }) => ({ name: file.name, index, url: URL.createObjectURL(file) })),
    [files, previewLimit]);
  useEffect(() => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)), [previews]);
  const selectionLabel = [
    photoCount && `${photoCount} photo${photoCount > 1 ? "s" : ""}`,
    zipCount && `${zipCount} zip${zipCount > 1 ? "s" : ""}`,
  ].filter(Boolean).join(" and ");

  /** Sends the batch and says how it went. True when the pages are in the queue. */
  const upload = async () => {
    if (files.length === 0) {
      toast.error("Choose some photos, a folder or a zip first.");
      return false;
    }
    const body = new FormData();
    files.forEach((file) => body.append("files", file));
    body.append("type", type);
    body.append("book_label", bookLabel.trim());
    body.append("notes", notes.trim());
    body.append("priority", priority);
    body.append("is_daily", isDaily ? "true" : "false");

    abort.current = new AbortController();
    setUploading(true);
    setSent({ loaded: 0, total: null });
    setStartedAt(Date.now());
    try {
      const res = await uploadBacklogBatch(token, body, setSent, abort.current.signal);
      if (res.ok) {
        const { pages, skipped } = res.data;
        toast.success(`${pages} page${pages === 1 ? "" : "s"} added to the queue${skipped ? `. ${skipped} file${skipped === 1 ? " was" : "s were"} not an image and skipped.` : "."}`);
        return true;
      }
      if (res.cancelled) toast("Upload cancelled. Your photos are still here.");
      else if (res.error) toast.error(res.error);
      return false;
    } catch (error) {
      console.log("Error uploading pages:", error);
      toast.error("Failed to upload the pages.");
      return false;
    } finally {
      abort.current = null;
      setUploading(false);
      setSent(null);
      setStartedAt(null);
    }
  };

  /** Stops the upload while it is still sending; nothing reaches the queue. */
  const cancel = () => abort.current?.abort();

  return {
    type, setType, bookLabel, setBookLabel, notes, setNotes, priority, setPriority, isDaily, setIsDaily,
    files, addFiles, removeFile, clearFiles, zipCount, photoCount, previews, selectionLabel,
    progress, sent, startedAt, stage, uploading, upload, cancel,
  };
}
