import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { formatDate } from "../../../services/utils";

type EarlyInvoice = { label: string; date: string };

/**
 * A payment on an invoice, dated before that invoice (fix plan 4, rule 3).
 * The khaata keeps such a payment for its invoice as an advance until the
 * invoice's date, so it is allowed; this only asks whether an advance on
 * account was meant instead. Nothing is blocked.
 *
 * `onOnAccount` is offered where the form can make the switch itself (the
 * Record Payment dialog unticks the invoices); elsewhere `hint` says how.
 */
export const EarlyPaymentDialog = ({
  open,
  onOpenChange,
  paymentDate,
  invoices,
  onKeep,
  onOnAccount = null,
  hint = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentDate: string;
  invoices: EarlyInvoice[];
  onKeep: () => void;
  onOnAccount?: (() => void) | null;
  hint?: string | null;
}) => {
  const names = invoices.map((item) => `${item.label} (${formatDate(item.date)})`).join(", ");
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>This is before the invoice date</AlertDialogTitle>
          <AlertDialogDescription>
            The payment is dated {formatDate(paymentDate)}, before{" "}
            {invoices.length === 1 ? "invoice" : "invoices"} {names}. The khaata will keep it as an
            advance for {invoices.length === 1 ? "that invoice" : "those invoices"} until then.
            Record it as an advance on account instead?
            {hint ? ` ${hint}` : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Go back</AlertDialogCancel>
          {onOnAccount && (
            <Button variant="outline" onClick={onOnAccount}>
              Record on account instead
            </Button>
          )}
          <Button onClick={onKeep}>Keep it on the invoice</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
