import { useIsPhone } from "@/hooks/use-phone";

interface PhoneOrProps {
  /** The page as a phone shows it. */
  phone: JSX.Element;
  /** The page everywhere else. */
  children: JSX.Element;
}

/**
 * Picks a page's phone screen or its usual one. The phone screens are their
 * own components, not the computer's pages squeezed: a phone has no sidebar,
 * and its pages are laid out for a thumb.
 */
export function PhoneOr({ phone, children }: PhoneOrProps) {
  return useIsPhone() ? phone : children;
}
