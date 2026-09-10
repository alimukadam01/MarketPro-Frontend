import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { toast } from "sonner";
import Invoice from "@/pages/Invoice";
import { useAuth } from "../../services/AuthProvider";
import {
  captureInvoiceCustomer,
  getInvoicePDFData,
  getInvoiceWhatsAppMessage,
} from "../../services/api";
import { isWalkInCustomer } from "../../services/utils";

const fileNameFor = (pdfData, invoiceId) =>
  `Invoice-${pdfData?.invoice_number || invoiceId}.pdf`;

const saveBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

/**
 * The two things you can do with a finished sales invoice: download it, or send
 * it to the customer on WhatsApp. Shared by the Sales list and the Update
 * Invoice page so both behave the same.
 *
 * Download never prompts for anything.
 *
 * Sending does, but only when it has to: a counter sale is raised against the
 * business's Walk-In Customer, who has no phone number, so there is nobody to
 * send to until the buyer is named. That is what the capture dialog is for.
 *
 * Once the capture saves, the invoice IS reassigned — everything after that is
 * a delivery problem, and the user is never told "failed" about a change the
 * database has already made.
 */
/** The GenerateInvoiceSerializer payload, as far as this hook reads it. */
type InvoicePayload = {
  id: number;
  invoice_number?: string;
  customer?: {
    id: number;
    name?: string;
    phone?: string;
    email?: string;
    city?: { id: number };
  };
};

export const useInvoiceActions = ({
  onInvoiceUpdated,
}: { onInvoiceUpdated?: (invoice: InvoicePayload) => void } = {}) => {
  const { token } = useAuth();
  const [captureFor, setCaptureFor] = useState(null);
  const [busy, setBusy] = useState(null);

  const loadInvoice = async (invoiceId, knownPdfData) => {
    // The Sales list does not hold the customer — transformSalesInvoice drops
    // it — so it fetches here. The Update page passes what it already has.
    const pdfData = knownPdfData || (await getInvoicePDFData(token, invoiceId));
    if (!pdfData?.id) {
      toast.error("Could not load the invoice. Please try again.");
      return null;
    }
    return pdfData;
  };

  // Rendered from data already in hand — <Invoice>'s own fetch would not have
  // resolved by the time the document is generated.
  const renderInvoice = (pdfData) => pdf(<Invoice invoice={pdfData} />).toBlob();

  const handOffToWhatsApp = async (blob, pdfData, invoiceId, whatsapp) => {
    const fileName = fileNameFor(pdfData, invoiceId);
    const file = new File([blob], fileName, { type: "application/pdf" });

    // The share sheet is the only route that carries the PDF into WhatsApp;
    // a wa.me link can only ever take text.
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text: whatsapp.message });
      } catch (error) {
        // Dismissing the share sheet is a cancel, not a failure.
        if (error?.name !== "AbortError") console.log(error);
      }
      return;
    }

    // Otherwise hand over the PDF and open the chat with the message ready, so
    // the invoice is one attach away.
    saveBlob(blob, fileName);
    const chat = window.open(whatsapp.whatsapp_url, "_blank");
    if (!chat) {
      toast.error("Allow pop-ups to open the WhatsApp chat.");
      return;
    }
    toast.info("Invoice downloaded — attach it in the WhatsApp chat.");
  };

  const downloadInvoice = async (invoiceId, knownPdfData = null) => {
    if (!invoiceId || busy) return;

    setBusy("download");
    try {
      const pdfData = await loadInvoice(invoiceId, knownPdfData);
      if (!pdfData) return;

      saveBlob(await renderInvoice(pdfData), fileNameFor(pdfData, invoiceId));
    } catch (error) {
      console.log("Error downloading invoice:", error);
      toast.error("Failed to download the invoice.");
    } finally {
      setBusy(null);
    }
  };

  const sendOnWhatsApp = async (invoiceId, knownPdfData = null) => {
    if (!invoiceId || busy) return;

    setBusy("whatsapp");
    try {
      const pdfData = await loadInvoice(invoiceId, knownPdfData);
      if (!pdfData) return;

      // No phone to send to yet — name the buyer first.
      if (isWalkInCustomer(pdfData.customer)) {
        setCaptureFor({ invoiceId, pdfData });
        return;
      }

      const whatsapp = await getInvoiceWhatsAppMessage(token, invoiceId);
      if (!whatsapp) {
        toast.error("Could not prepare the message. Check the customer's phone number.");
        return;
      }

      await handOffToWhatsApp(
        await renderInvoice(pdfData), pdfData, invoiceId, whatsapp,
      );
    } catch (error) {
      console.log("Error sending invoice:", error);
      toast.error("Failed to send the invoice.");
    } finally {
      setBusy(null);
    }
  };

  const captureCustomer = async (form) => {
    if (!captureFor) return;
    const { invoiceId } = captureFor;

    let res = null;
    try {
      res = await captureInvoiceCustomer(token, invoiceId, form);
    } catch (error) {
      console.log("Error saving the customer:", error);
    }

    if (!res?.invoice) {
      // The write is atomic, so a failure means nothing was written at all.
      // Leave the dialog open with the form intact — retrying is safe.
      toast.error("Could not save the customer. Nothing was changed — please try again.");
      return;
    }

    // Past this line the invoice IS reassigned.
    onInvoiceUpdated?.(res.invoice);
    setCaptureFor(null);
    toast.success("Customer saved to this invoice.");

    try {
      if (!res.whatsapp) {
        toast.warning("Customer saved, but WhatsApp could not be opened for this number.");
        return;
      }
      await handOffToWhatsApp(
        await renderInvoice(res.invoice), res.invoice, invoiceId, res.whatsapp,
      );
    } catch (error) {
      console.log("Error preparing the invoice:", error);
      toast.error(
        "Customer saved. The invoice could not be prepared — press Send on WhatsApp again.",
      );
    }
  };

  return {
    downloadInvoice,
    sendOnWhatsApp,
    isDownloading: busy === "download",
    isSending: busy === "whatsapp",
    isBusy: !!busy,
    walkInDialogProps: {
      open: !!captureFor,
      setOpen: (open) => {
        if (!open) setCaptureFor(null);
      },
      // The placeholder's own city preselects the dropdown; it rides along in
      // the print payload via SimpleCustomerSerializer.
      defaultCityId: captureFor?.pdfData?.customer?.city?.id,
      onSubmit: captureCustomer,
    },
  };
};

export default useInvoiceActions;
