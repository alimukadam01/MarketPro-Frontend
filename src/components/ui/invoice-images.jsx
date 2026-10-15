import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Trash } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../../services/AuthProvider";
import {
  getInvoiceImages,
  uploadInvoiceImage,
  deleteInvoiceImage,
} from "../../../services/api";
import { getImageUrl, formatDate } from "../../../services/utils";

/**
 * The photos attached to one invoice: the signed delivery note, the goods as
 * they arrived, the supplier's own bill.
 *
 * Several per invoice, unlike a payment, which carries at most one. Only on
 * the update pages: an image is attached to an invoice id, and a create page
 * has none until it has saved.
 *
 * Fetched here rather than read off the invoice record, even though the detail
 * endpoint lists them inline, so that uploading or deleting one refreshes just
 * this panel instead of the whole form.
 */
function InvoiceImages({ invoiceId, isSalesInvoice }) {
  const { token } = useAuth();
  const [images, setImages] = useState([]);
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  // Keyed to the row, not a single flag: removing one photo must not spin
  // every other row's button.
  const [removingId, setRemovingId] = useState(null);

  const fetchImages = async () => {
    if (!invoiceId) return;
    try {
      const data = await getInvoiceImages(token, invoiceId, isSalesInvoice);
      if (data) {
        setImages(data);
      } else {
        toast.error("Failed to fetch invoice images.");
      }
    } catch (error) {
      console.log("Error fetching invoice images:", error);
      toast.error("Failed to fetch invoice images.");
    }
  };

  useEffect(() => {
    fetchImages();
  }, [token, invoiceId]);

  const handleUpload = async () => {
    if (!file) return toast.error("Choose a photo first.");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      if (caption.trim()) formData.append("caption", caption.trim());

      const success = await uploadInvoiceImage(
        token,
        invoiceId,
        isSalesInvoice,
        formData,
      );
      if (success) {
        toast.success("Photo added.");
        setFile(null);
        setCaption("");
        // The file input is uncontrolled — React cannot clear it by state.
        const input = document.getElementById("invoice-image-input");
        if (input) input.value = "";
        fetchImages();
      } else {
        toast.error("Failed to add the photo.");
      }
    } catch (error) {
      console.log("Error uploading invoice image:", error);
      toast.error("Failed to add the photo.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (imageId) => {
    setRemovingId(imageId);
    try {
      const success = await deleteInvoiceImage(
        token,
        invoiceId,
        isSalesInvoice,
        imageId,
      );
      if (success) {
        toast.success("Photo removed.");
        fetchImages();
      } else {
        toast.error("Failed to remove the photo.");
      }
    } catch (error) {
      console.log("Error deleting invoice image:", error);
      toast.error("Failed to remove the photo.");
    } finally {
      setRemovingId(null);
    }
  };

  if (!invoiceId) return null;

  return (
    <div className="space-y-3">
      <Label>Photos</Label>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <input
            id="invoice-image-input"
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium"
          />
        </div>
        <Input
          className="w-56"
          placeholder="Caption (optional)"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          disabled={uploading || !file}
          onClick={handleUpload}
        >
          {uploading ? <Spinner size={16} /> : "Add Photo"}
        </Button>
      </div>

      {images.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {images.map((image) => (
            <div
              key={image.id}
              className="w-28 rounded-lg border border-border p-2 space-y-1"
            >
              {/* getImageUrl leaves a presigned S3 link alone and puts the
                  host in front of a local /media/... path. */}
              <a
                href={getImageUrl(image.image)}
                target="_blank"
                rel="noreferrer"
              >
                <img
                  src={getImageUrl(image.image)}
                  alt={image.caption || "Invoice photo"}
                  className="h-20 w-full rounded object-cover"
                />
              </a>
              <div className="flex items-start justify-between gap-1">
                <div className="min-w-0">
                  {image.caption && (
                    <div className="text-xs truncate" title={image.caption}>
                      {image.caption}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {formatDate(image.uploaded_at)}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="unstyled"
                  className="p-0 hover:text-red-500 h-[10px]"
                  disabled={removingId === image.id}
                  onClick={() => handleDelete(image.id)}
                >
                  {removingId === image.id ? (
                    <Spinner size={14} />
                  ) : (
                    <Trash size={14} cursor="pointer" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default InvoiceImages;
