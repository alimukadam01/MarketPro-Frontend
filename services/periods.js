/**
 * Period switches: the options, how a period travels to the API, and the line
 * under a figure that names it.
 *
 * What a period covers is decided by the backend (root/periods.py) - the shop
 * week starts on Saturday, quarters follow the calendar, every period ends
 * today. The page never works dates out itself; it sends the period's key and
 * labels the figure from the date range the response hands back, so the label
 * can never disagree with the figure.
 *
 * A period here is an object: { key } for the named ones, and
 * { key: "custom", from: "YYYY-MM-DD", to: "YYYY-MM-DD" } for a custom range.
 */

// Short labels: the line under each figure already says "This week · ...".
export const PAGE_PERIODS = [
  { key: "all", label: "All time" },
  { key: "today", label: "Today" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "quarter", label: "Quarter" },
  { key: "year", label: "Year" },
];

// Cards and charts on the dashboard, and the Book of Business: every one of
// them is about a stretch of time, so none offers "All time".
export const CARD_PERIODS = PAGE_PERIODS.filter((p) => p.key !== "all");

export const ALL_TIME = { key: "all" };
export const TODAY = { key: "today" };

/** The query parameters a period sends. */
export const periodParams = (period) => {
  if (!period || period.key === "all") return {};
  if (period.key === "custom") {
    return { period: "custom", date_from: period.from, date_to: period.to };
  }
  return { period: period.key };
};

/**
 * A list query ("?search=ali", "?status=C&customer__name=…", "" or null) with
 * the period added, so the table and its summary are asked for the same rows.
 */
export const withPeriod = (query, period) => {
  const params = new URLSearchParams((query || "").replace(/^\?/, ""));
  Object.entries(periodParams(period)).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const text = params.toString();
  return text ? `?${text}` : "";
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Read as a calendar date, never through Date's own parser: "2026-10-20"
// parsed as a Date is midnight UTC, which is the 19th in some timezones.
const parts = (iso) => {
  const [year, month, day] = iso.split("-").map(Number);
  const weekday = DAYS[new Date(year, month - 1, day).getDay()];
  return { year, month, day, weekday };
};

const short = (iso) => {
  const d = parts(iso);
  return `${d.day} ${MONTHS[d.month - 1]}`;
};

const range = (from, to) => {
  const a = parts(from);
  const b = parts(to);
  if (a.year !== b.year) return `${short(from)} ${a.year} – ${short(to)} ${b.year}`;
  return `${short(from)} – ${short(to)} ${b.year}`;
};

const NAMES = {
  week: "This week",
  month: "This month",
  quarter: "This quarter",
  year: "This year",
  custom: "Custom",
};

/**
 * The line under a figure: "This month · 1 Oct – 20 Oct 2026".
 *
 * `period` is what the API returned ({ key, date_from, date_to }); `filtered`
 * adds "Filtered" when the table it summarises is searched or filtered, since
 * the figure then covers fewer rows than the period alone would.
 */
export const periodHint = (period, filtered = false) => {
  // Not known yet (still loading): a blank line, so the card keeps its
  // height and does not grow when the period arrives.
  if (!period) return " ";
  let text;
  if (period.key === "all" || !period.date_from) {
    text = "All time";
  } else if (period.key === "today") {
    const d = parts(period.date_from);
    text = `Today · ${d.weekday} ${short(period.date_from)} ${d.year}`;
  } else if (period.key === "week") {
    const a = parts(period.date_from);
    const b = parts(period.date_to);
    text = `This week · ${a.weekday} ${short(period.date_from)} – ${b.weekday} ${short(period.date_to)}`;
  } else {
    text = `${NAMES[period.key] || "Period"} · ${range(period.date_from, period.date_to)}`;
  }
  return filtered ? `${text} · Filtered` : text;
};

/** The shorter form a custom range takes on its own: "1 Oct – 15 Oct". */
export const customRangeLabel = (period) =>
  period?.from && period?.to ? `${short(period.from)} – ${short(period.to)}` : "Custom";

/** Today and the 1st of this month, as YYYY-MM-DD, for a fresh custom range. */
export const defaultCustomRange = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const first = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
  return { key: "custom", from: first, to: today };
};

/**
 * A card's last chosen period, kept per card in this browser so the dashboard
 * opens the way it was left. Storage can be missing or blocked (a private
 * window), and then the card simply opens on its default.
 */
export const loadPeriod = (storageKey, fallback) => {
  try {
    const saved = JSON.parse(localStorage.getItem(`mp-period:${storageKey}`));
    if (saved && typeof saved.key === "string") return saved;
  } catch (error) {
    console.log(error);
  }
  return fallback;
};

export const savePeriod = (storageKey, period) => {
  try {
    localStorage.setItem(`mp-period:${storageKey}`, JSON.stringify(period));
  } catch (error) {
    console.log(error);
  }
};
