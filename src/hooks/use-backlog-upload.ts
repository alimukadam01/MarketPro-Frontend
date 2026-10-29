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

// The server skips any one file over this (backlog/uploads.py MAX_IMAGE_BYTES).
const MAX_PAGE_BYTES = 25 * 1024 * 1024;

class TooLarge extends Error {}

const isZip = (file: File) => file.name.toLowerCase().endsWith(".zip");

/**
 * The file's bytes, held in memory. A phone's picker hands over a link, not
 * the file: a photo from Google Drive is downloaded only when it is read, and
 * Chrome on Android reads every one again when the upload starts. If any of
 * them reads differently then - still downloading, or Drive reporting another
 * size - Chrome drops the whole request before a byte is sent, and the server
 * never hears of it. Read once, here, the upload no longer depends on Drive.
 * A zip is left as picked: it can be far larger than a phone wants in memory.
 */
async function inMemory(file: File) {
  if (isZip(file)) return file;
  if (file.size > MAX_PAGE_BYTES) throw new TooLarge();
  const bytes = await file.arrayBuffer();
  return new File([bytes], file.name, { type: file.type, lastModified: file.lastModified });
}

export const megabytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

// "a.jpg", "a.jpg and b.jpg", "a.jpg, b.jpg and 3 more".
const namesOf = (names: string[]) =>
  names.length <= 2 ? names.join(" and ") : `${names.slice(0, 2).join(", ")} and ${names.length - 2} more`;

/**
 * The upload form's state and its sending, shared by the computer's page
 * (BacklogUpload) and the phone's (PhoneUpload), which lay it out
 * differently. `previewLimit` is how many thumbnails the page has room for.
 * `copyOnPick` reads each file into memory as it is picked (see inMemory);
 * the phone sets it. The computer's files are on its disk, and a book's
 * folder there would be gigabytes of memory.
 */
export function useBacklogUpload(previewLimit: number, { copyOnPick = false } = {}) {
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

  // Files picked but not yet read into memory (copyOnPick), across picks.
  const [preparing, setPreparing] = useState<{ done: number; total: number } | null>(null);
  const reading = useRef({ done: 0, total: 0 });
  // Bumped by Clear, so files still being read for an earlier pick are dropped.
  const generation = useRef(0);

  const addFiles = async (list: FileList | null) => {
    if (!list) return;
    const picked = Array.from(list);
    if (!copyOnPick) {
      setFiles((prev) => [...prev, ...picked]);
      return;
    }
    const pick = generation.current;
    reading.current.total += picked.length;
    setPreparing({ ...reading.current });
    const kept: File[] = [];
    const unreadable: string[] = [];
    const tooLarge: string[] = [];
    let next = 0;
    // Three at a time: a Drive photo is downloaded as it is read.
    const worker = async () => {
      while (next < picked.length) {
        const index = next++;
        const file = picked[index];
        try {
          kept[index] = await inMemory(file);
        } catch (error) {
          console.log(`Could not read ${file.name}:`, error);
          (error instanceof TooLarge ? tooLarge : unreadable).push(file.name);
        }
        reading.current.done += 1;
        setPreparing({ ...reading.current });
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    if (reading.current.done >= reading.current.total) {
      reading.current = { done: 0, total: 0 };
      setPreparing(null);
    }
    if (pick !== generation.current) return;
    setFiles((prev) => [...prev, ...kept.filter(Boolean)]);
    if (unreadable.length) {
      toast.error(`Couldn't open ${namesOf(unreadable)}. If ${unreadable.length === 1 ? "it is" : "they are"} on Google Drive, download ${unreadable.length === 1 ? "it" : "them"} to the phone and pick ${unreadable.length === 1 ? "it" : "them"} again.`);
    }
    if (tooLarge.length) {
      toast.error(`Left out ${namesOf(tooLarge)}: over 25 MB, too large to be a page.`);
    }
  };
  const removeFile = (index: number) => setFiles((prev) => prev.filter((_, i) => i !== index));
  const clearFiles = () => {
    generation.current += 1;
    setFiles([]);
  };

  const zipCount = files.filter(isZip).length;
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
    if (preparing) {
      toast.error("Wait for the photos to finish opening.");
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
    let last: { loaded: number; total: number | null } = { loaded: 0, total: null };
    const onProgress = (progress: typeof last) => { last = progress; setSent(progress); };
    try {
      const res = await uploadBacklogBatch(token, body, onProgress, abort.current.signal);
      // With no answer, how far it got is the only clue to what went wrong.
      if (!res.ok && !res.cancelled && res.status === null && last.loaded > 0) {
        res.error = last.total && last.loaded >= last.total
          ? "The photos were sent, but the server's answer never arrived. Some pages may already be in the queue - check the backlog before uploading them again."
          : `The upload stopped after ${megabytes(last.loaded)}${last.total ? ` of ${megabytes(last.total)}` : ""}. Nothing was added. Check the connection and try again.`;
      }
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
    files, addFiles, removeFile, clearFiles, zipCount, photoCount, previews, selectionLabel, preparing,
    progress, sent, startedAt, stage, uploading, upload, cancel,
  };
}
