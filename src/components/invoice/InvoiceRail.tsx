import type { ComponentProps } from "react";
import { Check, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  PurchaseInvoiceStatusMap,
  SalesInvoiceStatusMap,
  getPurchaseStatusColor,
  getStatusColor,
} from "../../../services/utils";

const money = (value: number) =>
  Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

// -- The PKR / % control -----------------------------------------------------

/**
 * Discount and tax, exactly as they look today: an outline button sitting in
 * the right end of the input that flips how the figure is read.
 */
export function AmountToggleInput({
  id,
  type,
  onToggle,
  inputProps,
}: {
  id: string;
  type: string;
  onToggle: () => void;
  inputProps: ComponentProps<typeof Input>;
}) {
  return (
    <div className="relative">
      <Input id={id} placeholder="0.0" {...inputProps} />
      <span className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground">
        <Button type="button" variant="outline" onClick={onToggle}>
          {type === "percentage" ? "%" : "PKR"}
        </Button>
      </span>
    </div>
  );
}

// -- The summary card --------------------------------------------------------

export interface SummaryLine {
  label: string;
  value: number;
  sign?: "+" | "−";
}

/**
 * The automatic figures, as a receipt rather than a row of read-only inputs -
 * which looked typeable and were the most confusing thing on the old screen.
 *
 * It fills the rail from just under the title down to the discount and tax
 * fields, with the total on its floor. The rail does not scroll, so on a
 * shorter screen the card tightens - less padding, no explanatory line, a
 * smaller total - to leave the fields and buttons below it room to fit.
 */
// Tailwind only generates classes it can read whole in the source, so the
// short-screen variant is spelled out on each class rather than built from
// a constant.

export function InvoiceSummaryCard({ lines, total }: { lines: SummaryLine[]; total: number }) {
  return (
    <section className={"flex-1 flex flex-col rounded-lg border bg-card p-6 [@media(max-height:820px)]:p-4"}>
      <h2 className="text-lg font-semibold leading-6">Summary</h2>
      <p className={"mt-1 text-sm text-muted-foreground [@media(max-height:820px)]:hidden"}>
        Worked out from the items. Nothing here is typed.
      </p>

      <dl className={"mt-5 space-y-2.5 text-sm [@media(max-height:820px)]:mt-3 [@media(max-height:820px)]:space-y-1.5"}>
        {lines.map((line) => (
          <div key={line.label} className="flex items-baseline justify-between gap-3">
            <dt className="min-w-0 truncate text-foreground">{line.label}</dt>
            <dd className="tabular-nums">
              {line.sign ? `${line.sign} ` : ""}
              {money(line.value)}
            </dd>
          </div>
        ))}
      </dl>

      <div className="flex-1 min-h-4" />

      <div className={"pt-4 border-t flex items-baseline justify-between gap-3 [@media(max-height:820px)]:pt-3"}>
        <span className="font-semibold">Total</span>
        <span className={"text-2xl font-bold tabular-nums [@media(max-height:820px)]:text-xl"}>PKR {money(total)}</span>
      </div>
    </section>
  );
}

// -- The payment button ------------------------------------------------------

/**
 * Opens the payments dialog, and says how much is still owed - "Paid" once the
 * payments cover the total, or the refund due once they come to more than it
 * (an update screen, after an item is removed). `paid` is what the page has in
 * hand: on a create screen what has been added in the dialog, on an update
 * screen the saved figure with the dialog's held changes applied.
 */
export function PaymentButton({
  total,
  paid,
  onClick,
}: {
  total: number;
  paid: number;
  onClick: () => void;
}) {
  const pending = Math.max((total || 0) - (paid || 0), 0);
  const overpaid = Math.max((paid || 0) - (total || 0), 0);
  const isPaid = total > 0 && pending < 0.005;
  const isOverpaid = overpaid >= 0.5;

  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      className={`w-full justify-between ${isPaid ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-700" : ""}`}
    >
      <span className="inline-flex items-center gap-2">
        <Wallet className="h-4 w-4" />
        {isPaid ? "Payments" : "Add Payment"}
      </span>
      {isOverpaid ? (
        // Update records this as a refund (refund_new_overpayment).
        <span className="tabular-nums text-yellow-700">PKR {money(overpaid)} to refund</span>
      ) : isPaid ? (
        <span className="inline-flex items-center gap-1 font-medium">
          <Check className="h-4 w-4" />
          Paid
        </span>
      ) : total > 0 ? (
        <span className="tabular-nums text-yellow-700">PKR {money(pending)} pending</span>
      ) : null}
    </Button>
  );
}

// -- Status pills ------------------------------------------------------------

const PILL = "inline-flex items-center h-7 px-3 rounded-full text-sm font-medium whitespace-nowrap";

/** Sales status is derived on the server, so it is only ever shown. */
export function SalesStatusPill({ status }: { status: string }) {
  if (!status) return null;
  return (
    <span className={`${PILL} ${getStatusColor(status)}`}>
      {SalesInvoiceStatusMap[status] ?? status}
    </span>
  );
}

/**
 * Purchase status is chosen - it decides whether the goods are restocked - so
 * the pill beside the title is itself the picker.
 */
export function PurchaseStatusSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger
        aria-label="Invoice status"
        className={`${PILL} w-auto gap-1 border-0 focus:ring-offset-0 ${getPurchaseStatusColor(value)}`}
      >
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(PurchaseInvoiceStatusMap).map(([key, label]) => (
          <SelectItem value={key} key={key}>
            {label as string}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
