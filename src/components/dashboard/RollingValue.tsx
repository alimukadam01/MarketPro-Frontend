import { useLayoutEffect, useState } from "react";

const DURATION_MS = 900;

// "PKR 48,600" -> { prefix: "PKR ", number: 48600, decimals: 0, suffix: "" }.
// The first number in the text rolls; whatever is around it stays put.
const parse = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return null;
  const match = String(value).match(/^(.*?)(-?\d[\d,]*(?:\.\d+)?)(.*)$/s);
  if (!match) return null;
  const [, prefix, digits, suffix] = match;
  const number = Number(digits.replace(/,/g, ""));
  if (!Number.isFinite(number)) return null;
  const decimals = digits.includes(".") ? digits.split(".")[1].length : 0;
  return { prefix, number, decimals, suffix };
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * A card's figure, rolling up from 0 each time a new one arrives.
 *
 * The last frame is the value exactly as given, so the figure that settles is
 * the formatted one the page passed in, never a re-formatting of it. Until
 * there is a value the card reads 0, and the spinner beside its title says
 * the real one is on its way. With reduced motion asked for, it simply
 * appears.
 */
export function RollingValue({ value }: { value: string | number | null | undefined }) {
  const parsed = parse(value);
  const key = value === null || value === undefined ? "" : String(value);
  // Starts at 0 and is reset before paint (a layout effect), so neither the
  // first render nor a new value flashes the final figure for a frame.
  const [progress, setProgress] = useState(() =>
    parsed && parsed.number !== 0 && !prefersReducedMotion() ? 0 : 1);

  useLayoutEffect(() => {
    if (!parsed || parsed.number === 0 || prefersReducedMotion()) {
      setProgress(1);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / DURATION_MS, 1);
      setProgress(1 - Math.pow(1 - t, 3)); // ease-out cubic
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    setProgress(0);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // Keyed on the text: a refetch that brings back the same figure does not
    // roll it again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!parsed) return <>{key || "0"}</>;
  if (progress >= 1) return <>{key}</>;

  const current = parsed.number * progress;
  const text = current.toLocaleString(undefined, {
    minimumFractionDigits: parsed.decimals,
    maximumFractionDigits: parsed.decimals,
  });
  return (
    <>
      <span className="sr-only">{key}</span>
      <span aria-hidden="true">{parsed.prefix}{text}{parsed.suffix}</span>
    </>
  );
}
