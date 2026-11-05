/** Money is stored in paise (integers), like the main backend. */
export function rupees(paise, { decimals = false } = {}) {
  const v = (Number(paise) || 0) / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : v % 1 ? 2 : 0,
  }).format(v);
}

export const perMin = (paise) => `${rupees(paise)}/min`;

const TZ = "Asia/Kolkata";
export const formatDate = (d) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: TZ }).format(new Date(d));
export const formatTime = (d) => new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: TZ }).format(new Date(d));
export const formatDateTime = (d) => `${formatDate(d)}, ${formatTime(d)}`;

/** "10:00 am – 10:30 am" for a session starting at `start` that lasts `minutes`. */
export const formatRange = (start, minutes) => `${formatTime(start)} – ${formatTime(new Date(new Date(start).getTime() + minutes * 60000))}`;

export function timeAgo(d) {
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  const fut = s < 0;
  const a = Math.abs(s);
  const [n, unit] = a < 60 ? [a, "sec"] : a < 3600 ? [Math.round(a / 60), "min"] : a < 86400 ? [Math.round(a / 3600), "hr"] : [Math.round(a / 86400), "day"];
  const label = `${n} ${unit}${n === 1 || unit === "sec" || unit === "min" ? "" : "s"}`;
  return fut ? `in ${label}` : `${label} ago`;
}

export const minutes = (sec) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
};

export const daysBetween = (a, b) => Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
