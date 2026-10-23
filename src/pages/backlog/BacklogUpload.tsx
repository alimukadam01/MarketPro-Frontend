import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
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
import { useAuth } from "../../../services/AuthProvider";
import { uploadBacklogBatch } from "../../../services/api";

const TYPES = [
  { value: "sales_invoice", label: "Sales invoices" },
  { value: "purchase_invoice", label: "Purchase invoices" },
  { value: "product_list", label: "Product list" },
  { value: "price_list", label: "Price list" },
  { value: "stock_list", label: "Stock list" },
];

const PRIORITIES = [
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
];

// What each picker opens. A folder arrives as its files, one by one; a zip
// is unpacked on the server.
const PICKERS = [
  { key: "photos", label: "Photos", icon: Images, accept: "image/*", multiple: true, folder: false },
  { key: "folder", label: "Folder", icon: FolderOpen, accept: undefined, multiple: true, folder: true },
  { key: "zip", label: "Zip", icon: FileArchive, accept: ".zip,application/zip", multiple: false, folder: false },
];

function Segmented({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-md bg-muted p-1" role="group">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`h-9 px-3 rounded text-sm font-medium whitespace-nowrap ${value === option.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
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
 * and header, with the form in one narrow column, so it still works on a
 * phone at the counter with the book open.
 */
export default function BacklogUpload() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [type, setType] = useState("sales_invoice");
  const [bookLabel, setBookLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState("normal");
  const [isDaily, setIsDaily] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)]);
  };

  const zipCount = files.filter((file) => file.name.toLowerCase().endsWith(".zip")).length;
  const photoCount = files.length - zipCount;
  const previews = useMemo(
    () => files.filter((file) => file.type.startsWith("image/")).slice(0, 5)
      .map((file) => ({ name: file.name, url: URL.createObjectURL(file) })),
    [files]);
  useEffect(() => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)), [previews]);
  const selectionLabel = [
    photoCount && `${photoCount} photo${photoCount > 1 ? "s" : ""}`,
    zipCount && `${zipCount} zip${zipCount > 1 ? "s" : ""}`,
  ].filter(Boolean).join(" and ");

  const upload = async () => {
    if (files.length === 0) {
      toast.error("Choose some photos, a folder or a zip first.");
      return;
    }
    const body = new FormData();
    files.forEach((file) => body.append("files", file));
    body.append("type", type);
    body.append("book_label", bookLabel.trim());
    body.append("notes", notes.trim());
    body.append("priority", priority);
    body.append("is_daily", isDaily ? "true" : "false");

    setUploading(true);
    setProgress(0);
    try {
      const res = await uploadBacklogBatch(token, body, setProgress);
      if (res.ok) {
        const { pages, skipped } = res.data;
        toast.success(`${pages} page${pages === 1 ? "" : "s"} added to the queue${skipped ? `. ${skipped} file${skipped === 1 ? " was" : "s were"} not an image and skipped.` : "."}`);
        navigate("/backlog");
      } else if (res.error) {
        toast.error(res.error);
      }
    } catch (error) {
      console.log("Error uploading pages:", error);
      toast.error("Failed to upload the pages.");
    } finally {
      setUploading(false);
      setProgress(null);
    }
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
              <Segmented options={TYPES} value={type} onChange={setType} />
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
              <Segmented options={PRIORITIES} value={priority} onChange={setPriority} />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border bg-card px-4 py-3">
              <div>
                <Label htmlFor="is_daily">Today's pages</Label>
                <p className="text-xs text-muted-foreground">Entered first, by the end of tomorrow</p>
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
                  <Button variant="ghost" size="sm" onClick={() => setFiles([])} disabled={uploading}>Clear</Button>
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
              pendingLabel={progress !== null ? `Uploading… ${progress}%` : "Uploading…"} onClick={upload}>
              <Upload className="h-4 w-4 mr-2" />
              {files.length === 0 ? "Upload pages" : zipCount ? "Upload" : `Upload ${photoCount} page${photoCount === 1 ? "" : "s"}`}
            </SubmitButton>
          </div>
        </main>
      </div>
    </div>
  );
}
