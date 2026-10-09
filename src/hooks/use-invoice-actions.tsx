import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { toast } from "sonner";
import Invoice from "@/pages/Invoice";
import { useAuth } from "../../services/AuthProvider";
import {
  captureInvoiceCustomer,
  getInvoicePDFData,
  getInvoiceWhatsAppMessage,
  updateCustomer,
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

      // Nobody named yet: a counter sale is against the placeholder customer,
      // so the buyer has to be created before there is anywhere to send it.
      if (isWalkInCustomer(pdfData.customer)) {
        setCaptureFor({ invoiceId, pdfData, mode: "create" });
        return;
      }

      // Named, but unreachable. Checked here rather than left to fail at
      // whatsapp-message, because that only reports "no phone number saved" -
      // which told the user what was wrong and then offered no way to fix it.
      // The same form opens instead, on this customer's details.
      if (!String(pdfData.customer?.phone || "").trim()) {
        setCaptureFor({ invoiceId, pdfData, mode: "update" });
        return;
      }

      const whatsapp = await getInvoiceWhatsAppMessage(token, invoiceId);
      if (!whatsapp) {
        // A phone is saved and it still failed, so this is no longer a
        // guess at the cause.
        toast.error("Could not prepare the message. Please try again.");
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

  /**
   * Adds the phone number to the customer the invoice already points at.
   *
   * An update, not a capture: that customer exists and the invoice is already
   * theirs, so creating a second one and moving the invoice across would leave
   * the business with the same buyer twice - once without a number and once
   * with. Nothing about the invoice changes here, only the customer.
   *
   * Returns the same { invoice, whatsapp } shape capture-customer does, so the
   * caller below does not care which of the two ran.
   */
  const updateCustomerPhone = async (invoiceId, knownInvoice, form) => {
    const saved = await updateCustomer(token, knownInvoice.customer.id, form);
    // Only a failed write returns null, so the caller can say "nothing was
    // changed" and mean it.
    if (!saved) return null;

    // Re-read rather than patching the copy in hand: the PDF prints the
    // customer's details, and the message is built server-side from the
    // number that was just saved.
    const invoice = await getInvoicePDFData(token, invoiceId);
    if (!invoice?.id) {
      // The customer HAS been updated, so everything from here is a delivery
      // problem and must not be reported as a save failure. The copy in hand
      // with the new details merged keeps the caller on its "saved, but
      // WhatsApp could not be opened" path.
      return {
        invoice: {
          ...knownInvoice,
          customer: { ...knownInvoice.customer, ...form },
        },
        whatsapp: null,
      };
    }

    return { invoice, whatsapp: await getInvoiceWhatsAppMessage(token, invoiceId) };
  };

  const captureCustomer = async (form) => {
    if (!captureFor) return;
    const { invoiceId, pdfData, mode } = captureFor;

    let res = null;
    try {
      res = mode === "update"
        ? await updateCustomerPhone(invoiceId, pdfData, form)
        : await captureInvoiceCustomer(token, invoiceId, form);
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
      // Only passed when the buyer is already known, which is what puts the
      // dialog into its prefilled, update-the-customer mode. Left null for a
      // counter sale so the form opens blank.
      customer: captureFor?.mode === "update" ? captureFor.pdfData.customer : null,
      onSubmit: captureCustomer,
    },
  };
};

export default useInvoiceActions;
