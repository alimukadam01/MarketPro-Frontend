import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AmountToggleInput } from "@/components/invoice/InvoiceRail";
import { askedFields } from "../../../services/utils";

/**
 * The add-line row's extra inputs (plans/product-extra-fields.md).
 *
 * ExtraFieldInputs: one input per extra field the picked product asks for on
 * this side - Urban Paints' "Colour code". They sit after Product and before
 * Quantity, and disappear when a product without fields is picked.
 *
 * LineDiscountInput: the line's discount, with the % / PKR toggle the
 * invoice's own discount uses. Optional; an amount is off the whole line.
 */

export type Side = "sale" | "purchase";
export type LineDiscountDraft = { type: "percentage" | "amount"; value: string };

// A line's discount starts at 0 - never blank (the server stores 0% for none).
export const EMPTY_LINE_DISCOUNT: LineDiscountDraft = { type: "percentage", value: "0" };

/** The first required field left blank, for the "Enter the colour code." toast. */
export const missingRequiredField = (variant, side: Side, answers: Record<string, string>) =>
  askedFields(variant, side).find(
    (field) => field.required && !String(answers?.[String(field.id)] ?? "").trim());

/** The answers as the server takes them: numbers as numbers, blanks dropped. */
export const answersForSave = (variant, side: Side, answers: Record<string, string>) => {
  const out: Record<string, string | number> = {};
  askedFields(variant, side).forEach((field) => {
    const raw = String(answers?.[String(field.id)] ?? "").trim();
    if (!raw) return;
    out[String(field.id)] = field.field_type === "number" && Number.isFinite(Number(raw)) ? Number(raw) : raw;
  });
  return out;
};

/** {type, value} from the draft the input holds; blank or 0 is 0%, as the
 *  server stores it. */
export const discountForSave = (draft: LineDiscountDraft) => {
  const value = Number(draft?.value);
  return draft?.value !== "" && Number.isFinite(value) && value > 0
    ? { type: draft.type, value: Math.round(value * 100) / 100 }
    : { type: "percentage", value: 0 };
};

export function ExtraFieldInputs({
  variant, side, answers, onChange, onEnter,
}: {
  variant: unknown;
  side: Side;
  answers: Record<string, string>;
  onChange: (answers: Record<string, string>) => void;
  /** Enter in the last input adds the line, as Enter does elsewhere. */
  onEnter?: () => void;
}) {
  const fields = askedFields(variant, side);
  if (fields.length === 0) return null;

  return (
    <>
      {fields.map((field, index) => (
        <div key={field.id} className="min-w-0 space-y-1">
          <Label htmlFor={`line-field-${field.id}`}>
            {field.label}
            {field.required ? <span className="text-destructive"> *</span> : null}
          </Label>
          <Input
            id={`line-field-${field.id}`}
            type={field.field_type === "number" ? "number" : "text"}
            value={answers?.[String(field.id)] ?? ""}
            onChange={(e) => onChange({ ...answers, [String(field.id)]: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter" && index === fields.length - 1 && onEnter) {
                e.preventDefault();
                onEnter();
              }
            }}
          />
        </div>
      ))}
    </>
  );
}

export function LineDiscountInput({
  value, onChange, idPrefix = "line",
}: {
  value: LineDiscountDraft;
  onChange: (value: LineDiscountDraft) => void;
  idPrefix?: string;
}) {
  return (
    <div className="min-w-0 space-y-1">
      <Label htmlFor={`${idPrefix}-discount`}>Discount</Label>
      <AmountToggleInput
        id={`${idPrefix}-discount`}
        type={value.type}
        onToggle={() => onChange({ ...value, type: value.type === "percentage" ? "amount" : "percentage" })}
        toggleInTabOrder={false}
        inputProps={{
          type: "number",
          min: 0,
          value: value.value,
          onChange: (e) => onChange({ ...value, value: e.target.value }),
        }}
      />
    </div>
  );
}
