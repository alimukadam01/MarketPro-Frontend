import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Check, FileArchive, FolderOpen, Images, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { SubmitButton } from "@/components/ui/submit-button";
import { MODULE_ICONS } from "@/components/layout/module-icons";
import { PhoneShell } from "@/components/phone/PhoneShell";
import { PhoneSegmented } from "@/components/phone/PhoneSegmented";
import { PhoneUploadProgress } from "@/components/phone/PhoneUploadProgress";
import { UPLOAD_PRIORITIES, UPLOAD_TYPES, useBacklogUpload } from "@/hooks/use-backlog-upload";
import { cn } from "@/lib/utils";

// Each type's row: the section's icon and what its pages look like.
const TYPE_ROWS = {
  stock_list: { icon: MODULE_ICONS.inventory, hint: "What's on the shelves" },
  purchase_invoice: { icon: MODULE_ICONS.purchases, hint: "Bills from suppliers" },
  sales_invoice: { icon: MODULE_ICONS.sales, hint: "Bills to customers" },
};

// What each picker opens. Take photos goes straight to the camera, a photo a
// tap. Folder picks several files: phone browsers cannot pick a folder, and
// with no type set it opens the phone's files rather than its photos. A zip
// is unpacked on the server.
const PICKERS = [
  { key: "camera", label: "Take photos", short: "Take more", icon: Camera, input: { accept: "image/*", capture: "environment" as const } },
  { key: "gallery", label: "From gallery", short: "From gallery", icon: Images, input: { accept: "image/*", multiple: true } },
  { key: "folder", label: "Folder", short: "Folder", icon: FolderOpen, input: { multiple: true } },
  { key: "zip", label: "Zip file", short: "Zip file", icon: FileArchive, input: { accept: ".zip,application/zip" } },
];

// The thumbnails are four to a row; the eighth place says how many more.
const PREVIEW_LIMIT = 7;

/**
 * The upload form on a phone (/backlog/upload via PhoneOr). One column, the
 * Upload button pinned under it, and back to the dashboard once the pages are
 * in the queue - the computer's page goes on to the backlog, which a phone
 * does not open.
 */
export default function PhoneUpload() {
  const navigate = useNavigate();
  const {
    type, setType, bookLabel, setBookLabel, notes, setNotes, priority, setPriority, isDaily, setIsDaily,
    files, addFiles, removeFile, clearFiles, zipCount, photoCount, previews, selectionLabel, preparing,
    progress, sent, startedAt, stage, uploading, upload, cancel,
  } = useBacklogUpload(PREVIEW_LIMIT, { copyOnPick: true });
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const morePhotos = photoCount - previews.length;

  const handleUpload = async () => {
    if (await upload()) {
      // The button is at the foot of a long form; the dashboard opens at its top.
      window.scrollTo(0, 0);
      navigate("/");
    }
  };

  const uploadButton = (
    <SubmitButton
      type="button"
      className="w-full h-12 gap-2 text-[15px]"
      disabled={files.length === 0 && !preparing}
      pending={uploading || !!preparing}
      pendingLabel={preparing ? "Opening the photos…" : stage === "saving" ? "Saving the pages…" : progress !== null ? `Uploading… ${progress}%` : "Uploading…"}
      onClick={handleUpload}
    >
      <Upload className="w-[18px] h-[18px]" />
      {files.length === 0 ? "Add photos to upload" : zipCount ? "Upload" : `Upload ${photoCount} page${photoCount === 1 ? "" : "s"}`}
    </SubmitButton>
  );

  return (
    <PhoneShell footer={uploadButton}>
      {stage && (
        <PhoneUploadProgress what={selectionLabel} stage={stage} sent={sent} startedAt={startedAt} onCancel={cancel} />
      )}
      {PICKERS.map(({ key, input }) => (
        <input
          key={key}
          ref={(el) => { inputs.current[key] = el; }}
          type="file"
          className="hidden"
          {...input}
          onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
        />
      ))}

      <div className="-ml-3 flex items-center gap-1">
        <button
          type="button"
          aria-label="Back to the dashboard"
          onClick={() => navigate("/")}
          className="w-11 h-11 shrink-0 flex items-center justify-center text-muted-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[22px] font-bold">Upload pages</h1>
          <p className="text-sm text-muted-foreground">Each photo becomes one page in the entry queue.</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold">What are these?</span>
        <div role="group" aria-label="Page type" className="flex flex-col gap-2">
          {UPLOAD_TYPES.map((option) => {
            const { icon: Icon, hint } = TYPE_ROWS[option.value];
            const selected = type === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={() => setType(option.value)}
                className={cn(
                  "min-h-[60px] flex items-center gap-3 rounded-[10px] bg-card px-3.5 py-2.5 text-left",
                  selected ? "border-2 border-primary bg-primary/5 px-[13px] py-[9px]" : "border",
                )}
              >
                <span className={cn(
                  "w-9 h-9 shrink-0 rounded-lg flex items-center justify-center",
                  selected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                )}>
                  <Icon className="w-[18px] h-[18px]" />
                </span>
                <span className="flex flex-1 flex-col gap-0.5">
                  <span className="text-[15px] font-semibold">{option.label}</span>
                  <span className="text-[13px] text-muted-foreground">{hint}</span>
                </span>
                {selected ? (
                  <span className="w-5 h-5 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Check className="w-3 h-3" strokeWidth={3} />
                  </span>
                ) : (
                  <span className="w-5 h-5 shrink-0 rounded-full border-2 border-input" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {preparing && (
          // Each photo is read into memory as it is picked (useBacklogUpload's
          // copyOnPick); one from Google Drive downloads first, which shows.
          <div role="status" className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 text-sm">
            <Spinner size={18} className="text-primary" />
            <span className="flex-1 font-semibold">
              Opening {preparing.total} photo{preparing.total === 1 ? "" : "s"}…
            </span>
            <span className="tabular-nums text-muted-foreground">{preparing.done} of {preparing.total}</span>
          </div>
        )}
        {files.length === 0 ? (
          <>
            <span className="text-sm font-semibold">Pages</span>
            <div className="grid grid-cols-2 gap-3">
              {PICKERS.map(({ key, label, icon: Icon }, index) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => inputs.current[key]?.click()}
                  className={cn(
                    "h-24 flex flex-col items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed bg-card text-sm font-semibold",
                    index === 0 ? "border-primary/60" : "border-input",
                  )}
                >
                  <Icon className={cn("w-[26px] h-[26px]", index === 0 ? "text-primary" : "text-muted-foreground")} />
                  {label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Pages · {selectionLabel}</span>
              <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={clearFiles} disabled={uploading}>
                Clear
              </Button>
            </div>
            {previews.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {previews.map((preview, index) => (
                  <div key={`${preview.name}-${preview.index}`} className="relative aspect-[3/4] overflow-hidden rounded-lg border">
                    <img src={preview.url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      aria-label={`Remove photo ${index + 1}`}
                      onClick={() => removeFile(preview.index)}
                      disabled={uploading}
                      className="absolute top-[3px] right-[3px] w-[30px] h-[30px] rounded-full bg-foreground/60 text-background flex items-center justify-center"
                    >
                      <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </button>
                  </div>
                ))}
                {morePhotos > 0 && (
                  <span className="aspect-[3/4] rounded-lg border bg-muted flex items-center justify-center font-semibold text-muted-foreground">
                    +{morePhotos}
                  </span>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {PICKERS.map(({ key, short, icon: Icon }, index) => (
                <Button
                  key={key}
                  type="button"
                  variant="outline"
                  className="h-11 gap-2"
                  onClick={() => inputs.current[key]?.click()}
                  disabled={uploading}
                >
                  <Icon className={cn("w-[18px] h-[18px]", index === 0 ? "text-primary" : "text-muted-foreground")} />
                  {short}
                </Button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="book_label" className="font-semibold">Book label</Label>
        {/* 16px text: anything smaller makes iOS zoom the page on focus. */}
        <Input id="book_label" className="h-12 text-base" value={bookLabel}
          onChange={(e) => setBookLabel(e.target.value)} placeholder="Sales 2019 · Vol 3" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="upload_notes" className="font-semibold">Notes</Label>
        <Textarea id="upload_notes" rows={3} className="text-base resize-none" value={notes}
          onChange={(e) => setNotes(e.target.value)} placeholder="Pages 40-52 are returns, not sales." />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold">Priority</span>
        <PhoneSegmented label="Priority" options={UPLOAD_PRIORITIES} value={priority} onChange={setPriority} tall />
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl border bg-card px-4 py-3.5">
        <div className="flex flex-col gap-0.5">
          <Label htmlFor="is_daily" className="text-[15px] font-semibold">Today's pages</Label>
          <p className="text-[13px] text-muted-foreground">Entered first, by the end of the next working day (Friday is off)</p>
        </div>
        <Switch id="is_daily" checked={isDaily} onCheckedChange={setIsDaily} />
      </div>
    </PhoneShell>
  );
}
