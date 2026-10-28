import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileArchive, FolderOpen, Images, Upload } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import { UPLOAD_PRIORITIES, UPLOAD_TYPES, useBacklogUpload } from "@/hooks/use-backlog-upload";

// What each picker opens. A folder arrives as its files, one by one; a zip
// is unpacked on the server.
const PICKERS = [
  { key: "photos", label: "Photos", icon: Images, accept: "image/*", multiple: true, folder: false },
  { key: "folder", label: "Folder", icon: FolderOpen, accept: undefined, multiple: true, folder: true },
  { key: "zip", label: "Zip", icon: FileArchive, accept: ".zip,application/zip", multiple: false, folder: false },
];

function Segmented({ options, value, onChange }) {
  return (
    // The options share the full width equally, so none looks missing.
    <div
      className="grid gap-1 rounded-md bg-muted p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      role="group"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`h-9 px-3 rounded text-sm font-medium truncate ${value === option.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/**
 * /backlog/upload - photos of the shop's books, a folder of them or a zip.
 * Each image becomes one page in the entry queue. MarketPro's usual sidebar
 * and header, with the form in one narrow column. A phone gets PhoneUpload,
 * laid out for it; the form's state and sending are shared (useBacklogUpload).
 */
export default function BacklogUpload() {
  const navigate = useNavigate();
  const {
    type, setType, bookLabel, setBookLabel, notes, setNotes, priority, setPriority, isDaily, setIsDaily,
    files, addFiles, clearFiles, zipCount, photoCount, previews, selectionLabel, progress, stage, uploading, upload,
  } = useBacklogUpload(5);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleUpload = async () => {
    if (await upload()) navigate("/backlog");
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar onCollapseChange={setSidebarCollapsed} />
      <div className={`${sidebarCollapsed ? "ml-16" : "ml-64"} transition-all duration-300 flex flex-col`}>
        <Header />
        <main className="flex-1 p-6 space-y-6">
          <div className="space-y-1">
            <DynamicBreadCrumb />
            <div className="flex items-center space-x-3">
              <ArrowLeft className="w-5 h-5 text-muted-foreground cursor-pointer hover:text-primary" onClick={() => navigate("/backlog")} />
              <div>
                <h1 className="text-2xl font-semibold">Upload pages</h1>
                <p className="text-sm text-muted-foreground">Each photo becomes one page in the entry queue.</p>
              </div>
            </div>
          </div>

          <div className="w-full max-w-md space-y-6">
            <div className="space-y-2">
              <Label>What are these?</Label>
              <Segmented options={UPLOAD_TYPES} value={type} onChange={setType} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="book_label">Book label</Label>
              <Input id="book_label" value={bookLabel} onChange={(e) => setBookLabel(e.target.value)} placeholder="Sales 2019 · Vol 3" />
            </div>

            <div className="space-y-1">
              <Label htmlFor="upload_notes">Notes</Label>
              <Textarea id="upload_notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Pages 40-52 are returns, not sales." />
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Segmented options={UPLOAD_PRIORITIES} value={priority} onChange={setPriority} />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border bg-card px-4 py-3">
              <div>
                <Label htmlFor="is_daily">Today's pages</Label>
                <p className="text-xs text-muted-foreground">Entered first, by the end of the next working day (Friday is off)</p>
              </div>
              <Switch id="is_daily" checked={isDaily} onCheckedChange={setIsDaily} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              {PICKERS.map(({ key, label, icon: Icon, accept, multiple, folder }) => (
                <div key={key}>
                  <input
                    ref={(el) => { inputs.current[key] = el; }}
                    type="file"
                    className="hidden"
                    accept={accept}
                    multiple={multiple}
                    {...(folder ? { webkitdirectory: "", directory: "" } : {})}
                    onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
                  />
                  <button
                    type="button"
                    onClick={() => inputs.current[key]?.click()}
                    className="w-full h-20 rounded-lg border border-dashed bg-card flex flex-col items-center justify-center gap-1 text-sm font-medium hover:border-primary"
                  >
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    {label}
                  </button>
                </div>
              ))}
            </div>

            {files.length > 0 && (
              <div className="rounded-lg border bg-card px-4 py-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{selectionLabel} selected</span>
                  <Button variant="ghost" size="sm" onClick={clearFiles} disabled={uploading}>Clear</Button>
                </div>
                {previews.length > 0 && (
                  <div className="flex gap-2">
                    {previews.map((preview, index) => (
                      <img key={`${preview.name}-${index}`} src={preview.url} alt=""
                        className="h-14 w-14 rounded object-cover border" />
                    ))}
                    {photoCount > previews.length && (
                      <span className="h-14 w-14 rounded border bg-muted flex items-center justify-center text-sm text-muted-foreground">
                        +{photoCount - previews.length}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            <SubmitButton type="button" className="w-full h-11" pending={uploading}
              pendingLabel={stage === "saving" ? "Saving the pages…" : progress !== null ? `Uploading… ${progress}%` : "Uploading…"}
              onClick={handleUpload}>
              <Upload className="h-4 w-4 mr-2" />
              {files.length === 0 ? "Upload pages" : zipCount ? "Upload" : `Upload ${photoCount} page${photoCount === 1 ? "" : "s"}`}
            </SubmitButton>
          </div>
        </main>
      </div>
    </div>
  );
}
