import { useState, useEffect } from "react";
import * as DialogUI from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { Spinner } from "@/components/ui/spinner";
import { Trash2, ImageIcon } from "lucide-react";
import { RowAction } from "@/components/invoice/InvoiceItemsTable";
import { toast } from "sonner";
import { useAuth } from "../../../services/AuthProvider";
import {
  getInvoiceImages,
  uploadInvoiceImage,
  deleteInvoiceImage,
} from "../../../services/api";
import { getImageUrl, formatDate } from "../../../services/utils";

// The file's own name, out of a stored path or a presigned S3 link.
const fileNameOf = (url) => {
  if (!url) return "";
  try {
    return decodeURIComponent(url.split("?")[0].split("/").pop() || "");
  } catch {
    return url;
  }
};

/**
 * The images on one invoice - the signed delivery note, the goods as they
 * arrived, the supplier's own bill. Laid out like the Payments dialog: the
 * fields, one full-width action, then a row per image.
 *
 * Two modes, chosen by whether there is an invoice yet:
 *
 *  - Live (update screens): uploads and deletes straight away.
 *  - Staged (create screens, no invoiceId): holds the files on the page, which
 *    sends them once the invoice is created (attachStagedToInvoice). Nothing
 *    reaches the server from here in this mode.
 *
 * `onCountChange` keeps the count on the title-row button right without the
 * page refetching the invoice, which would wipe whatever is being edited.
 */
function InvoiceImages({
  invoiceId,
  isSalesInvoice,
  open,
  setOpen,
  staged = [],
  onStagedChange,
  onCountChange,
}) {
  const { token } = useAuth();
  const isStaged = !invoiceId && typeof onStagedChange === "function";

  const [images, setImages] = useState([]);
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState("");
  // The file input is uncontrolled - React cannot clear it - so it is
  // remounted by key after each add.
  const [inputKey, setInputKey] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  const fetchImages = async () => {
    try {
      const data = await getInvoiceImages(token, invoiceId, isSalesInvoice);
      if (data) {
        setImages(data);
        if (onCountChange) onCountChange(data.length);
      } else {
        toast.error("Failed to fetch invoice images.");
      }
    } catch (error) {
      console.log("Error fetching invoice images:", error);
      toast.error("Failed to fetch invoice images.");
    }
  };

  useEffect(() => {
    if (open && invoiceId) fetchImages();
  }, [open, invoiceId]);

  const resetForm = () => {
    setFile(null);
    setCaption("");
    setInputKey((key) => key + 1);
  };

  const handleAdd = async () => {
    if (!file) return toast.error("Choose an image first.");

    if (isStaged) {
      onStagedChange([
        ...staged,
        {
          id: `staged-${Date.now()}-${staged.length}`,
          file,
          caption: caption.trim(),
          preview: URL.createObjectURL(file),
        },
      ]);
      resetForm();
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      if (caption.trim()) formData.append("caption", caption.trim());

      const success = await uploadInvoiceImage(token, invoiceId, isSalesInvoice, formData);
      if (success) {
        toast.success("Image added.");
        resetForm();
        fetchImages();
      } else {
        toast.error("Failed to add the image.");
      }
    } catch (error) {
      console.log("Error uploading invoice image:", error);
      toast.error("Failed to add the image.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (imageId) => {
    if (isStaged) {
      const removed = staged.find((image) => image.id === imageId);
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      onStagedChange(staged.filter((image) => image.id !== imageId));
      return;
    }

    setRemovingId(imageId);
    try {
      const success = await deleteInvoiceImage(token, invoiceId, isSalesInvoice, imageId);
      if (success) {
        toast.success("Image removed.");
        fetchImages();
      } else {
        toast.error("Failed to remove the image.");
      }
    } catch (error) {
      console.log("Error deleting invoice image:", error);
      toast.error("Failed to remove the image.");
    } finally {
      setRemovingId(null);
    }
  };

  // One shape for both modes, so the rows below do not branch.
  const rows = isStaged
    ? staged.map((image) => ({
        id: image.id,
        src: image.preview,
        name: image.file?.name || "",
        caption: image.caption,
        note: "Waiting to upload",
      }))
    : images.map((image) => ({
        id: image.id,
        src: getImageUrl(image.image),
        name: fileNameOf(image.image),
        caption: image.caption,
        note: formatDate(image.uploaded_at),
      }));

  return (
    <DialogUI.Dialog open={!!open} onOpenChange={(val) => { setOpen(val); if (!val) resetForm(); }}>
      <DialogUI.DialogContent className="max-w-2xl">
        <DialogUI.DialogHeader>
          <DialogUI.DialogTitle>Images</DialogUI.DialogTitle>
          {isStaged && (
            <DialogUI.DialogDescription>
              Uploaded to the invoice once it is created.
            </DialogUI.DialogDescription>
          )}
        </DialogUI.DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="space-y-1">
            <Label htmlFor="invoice-image">Image</Label>
            <input
              key={inputKey}
              id="invoice-image"
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium"
            />
            <p className="text-xs text-muted-foreground">
              The delivery note, the goods, or a handwritten slip.
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="invoice-image-caption">Caption</Label>
            <Input
              id="invoice-image-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Optional"
            />
          </div>

          <SubmitButton
            type="button"
            pending={uploading}
            pendingLabel="Uploading…"
            onClick={handleAdd}
            className="w-full"
            disabled={!file}
          >
            Add Image
          </SubmitButton>
        </div>

        <div className="mt-2 flex flex-col gap-1">
          {rows.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              {isStaged ? "No images added yet." : "No images on this invoice."}
            </p>
          )}
          {rows.map((row) => (
            <div key={row.id} className="flex items-center gap-2">
              {/* The thumbnail sits inside the row, on the left. */}
              <div className="flex flex-1 min-w-0 items-center gap-3 rounded-lg border border-border px-2 py-1.5">
                <a href={row.src} target="_blank" rel="noreferrer" className="shrink-0">
                  {row.src ? (
                    <img
                      src={row.src}
                      alt={row.caption || row.name}
                      className="h-10 w-10 rounded object-cover border border-border"
                    />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded border border-border bg-muted">
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    </span>
                  )}
                </a>
                <div className="flex-1 min-w-0 truncate font-medium">
                  {row.caption || row.name}
                  {row.caption && (
                    <span className="text-muted-foreground font-normal"> · {row.name}</span>
                  )}
                </div>
                <span className="shrink-0 text-sm text-muted-foreground">{row.note}</span>
              </div>
              {/* The same delete control as the invoice item rows. */}
              <RowAction
                label={`Remove ${row.caption || row.name}`}
                onClick={() => handleDelete(row.id)}
                disabled={removingId === row.id}
              >
                {removingId === row.id ? <Spinner size={16} /> : <Trash2 className="h-5 w-5" />}
              </RowAction>
            </div>
          ))}
        </div>
      </DialogUI.DialogContent>
    </DialogUI.Dialog>
  );
}

export default InvoiceImages;
