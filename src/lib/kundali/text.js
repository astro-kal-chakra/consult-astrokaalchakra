import { dms, toDms, pad2 } from "./core.js";
import { fmtDate, fmtTime } from "./i18n.js";
import { localDate, offsetLabel } from "./time.js";

/** Small text builders shared by the page and the PDF. `d` = dictionary from i18n.dict(lang). */

export const degText = (x) => dms(x);
export const degShort = (x) => {
  const { d, m } = toDms(x);
  return `${d}°${pad2(m)}'`;
};
export const signDeg = (sign, degInSign, d) => `${d.signs[sign]} ${degShort(degInSign)}`;

/** Tithi 0-29 → "Shukla Panchami" / "Purnima". */
export function tithiName(i, d) {
  const paksha = i < 15 ? "shukla" : "krishna";
  const n = i % 15;
  const name = n === 14 ? d.tithis[paksha === "shukla" ? 14 : 15] : d.tithis[n];
  return `${d.paksha[paksha]} ${name}`;
}

export const planetList = (keys, d) => (keys?.length ? keys.map((k) => d.planets[k]).join(", ") : d.l.none);
export const houseList = (hs, d) => (hs?.length ? hs.join(", ") : d.l.none);

export const placeText = (p) => [p.name, p.region].filter(Boolean).join(", ");
export const coordsText = (p) => `${Math.abs(p.lat).toFixed(4)}°${p.lat >= 0 ? "N" : "S"}, ${Math.abs(p.lng).toFixed(4)}°${p.lng >= 0 ? "E" : "W"}`;
export const tzText = (k) => `${k.input.place.timezone} (UTC${offsetLabel(k.calc.offsetMin)})`;

/** "12 Mar 2024 - 5 Jun 2031" */
export const rangeText = (a, b, lang, tz) => `${fmtDate(a, lang, tz)} - ${fmtDate(b, lang, tz)}`;

const dayMonth = (ms, lang, tz) => new Intl.DateTimeFormat(lang === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "short", timeZone: tz }).format(new Date(ms));

/** "14:05", or "02:10 (5 Nov)" when the instant falls on another local date than `date`. */
export function timeOn(ms, date, tz, lang) {
  if (ms == null) return "-";
  const t = fmtTime(ms, tz, false);
  return localDate(ms, tz) === date ? t : `${t} (${dayMonth(ms, lang, tz)})`;
}
/** "14:05 - 16:30"; "01:04 - 05:40 (4 Dec)" when both ends fall on the same later date. */
export function spanOn(iv, date, tz, lang) {
  const a = localDate(iv.start, tz);
  if (a !== date && a === localDate(iv.end, tz)) return `${fmtTime(iv.start, tz, false)} - ${fmtTime(iv.end, tz, false)} (${dayMonth(iv.start, lang, tz)})`;
  return `${timeOn(iv.start, date, tz, lang)} - ${timeOn(iv.end, date, tz, lang)}`;
}

/** Name of a panchang limb value (muhurat / day panchang keys). */
export function limbName(key, v, d) {
  if (key === "tithi") return tithiName(v, d);
  if (key === "nakshatra") return d.nakshatras[v];
  if (key === "yoga") return d.yogas[v];
  if (key === "karana") return d.karanas[v];
  return d.signs[v]; // moonSign, lagna
}

/** Name of a dosha status. */
export function statusText(status, d) {
  return { none: d.l.absent, present: d.l.present, cancelled: d.l.cancelled, partial: d.l.partial, high: d.l.high, low: d.l.low }[status] || status;
}
