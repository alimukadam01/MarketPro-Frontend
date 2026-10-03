import * as React from "react"
import { Button, type ButtonProps } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export interface SubmitButtonProps extends ButtonProps {
  /** True while the request is in flight. */
  pending?: boolean
  /** Label shown while pending. Defaults to "Saving…". */
  pendingLabel?: React.ReactNode
}

/**
 * A button that cannot be pressed twice.
 *
 * Every create and update screen had a bare `<Button type="submit">`, so a
 * double-click posted twice - two invoices, two expenses, and on
 * CreateTransaction two sets of transactions in the khaata. This exists so
 * that guard is one component rather than 27 hand-written copies that drift.
 *
 *   <SubmitButton pending={pending} pendingLabel="Creating…">
 *     Create Invoice
 *   </SubmitButton>
 *
 * `disabled` composes rather than overrides, so the permission guards already
 * on these buttons (`disabled={!permissions?.["create"]}`) keep working.
 *
 * Button's own styles already handle the rest: `gap-2` spaces the spinner from
 * the label, and `[&_svg]:size-4` does not touch the Spinner because it renders
 * a span, not an svg.
 */
const SubmitButton = React.forwardRef<HTMLButtonElement, SubmitButtonProps>(
  ({ pending = false, pendingLabel = "Saving…", disabled, children, ...props }, ref) => (
    <Button ref={ref} disabled={pending || disabled} {...props}>
      {pending && <Spinner size={16} />}
      {pending ? pendingLabel : children}
    </Button>
  )
)
SubmitButton.displayName = "SubmitButton"

export { SubmitButton }
export default SubmitButton
