import { useSyncExternalStore } from "react";

/**
 * A phone: a finger for input, and a screen whose shorter side is under
 * 600px, held either way. Tablets, and computers in a narrow window, are not
 * phones, and keep the full app.
 *
 * A convenience, not security: the API answers a phone as it answers anyone,
 * and a phone asking for the desktop site is treated as a computer.
 */
export const PHONE_QUERY =
  "(pointer: coarse) and (orientation: portrait) and (max-width: 599px), " +
  "(pointer: coarse) and (orientation: landscape) and (max-height: 599px)";

const subscribe = (onChange: () => void) => {
  const query = window.matchMedia(PHONE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

const isPhoneNow = () => window.matchMedia(PHONE_QUERY).matches;

/** True on a phone. Follows the screen, so turning the phone keeps it right. */
export function useIsPhone() {
  return useSyncExternalStore(subscribe, isPhoneNow, () => false);
}
