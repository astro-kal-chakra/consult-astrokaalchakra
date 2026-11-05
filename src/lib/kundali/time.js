/** Time zones (IANA, DST and historical offsets aware through Intl) and local wall time ↔ UTC. */

/** UTC offset (minutes) of an IANA zone, or a fixed offset like "+05:30" / "UTC+5.5", at an instant. */
export function tzOffsetMin(ms, timeZone = "Asia/Kolkata") {
  const fixed = String(timeZone).match(/^(?:UTC|GMT)?\s*([+-])(\d{1,2})(?:([:.])(\d{1,2}))?$/i);
  if (fixed) {
    const [, s, h, sep, m = "0"] = fixed;
    const mins = sep === "." ? Number(`0.${m}`) * 60 : Number(m);
    return (s === "-" ? -1 : 1) * (Number(h) * 60 + mins);
  }
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" })
      .formatToParts(new Date(ms))
      .map((p) => [p.type, Number(p.value)])
  );
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60000);
}

export function isValidTimeZone(tz) {
  try {
    tzOffsetMin(Date.now(), tz);
    return true;
  } catch {
    return false;
  }
}

/** Local wall time ("YYYY-MM-DD", "HH:MM" or "HH:MM:SS") in a zone → UTC ms. */
export function zonedToUtc(date, time = "00:00", timeZone = "Asia/Kolkata") {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm, ss] = String(time || "00:00").split(":").map(Number);
  const wall = Date.UTC(y, m - 1, d, hh || 0, mm || 0, ss || 0);
  let utc = wall - tzOffsetMin(wall, timeZone) * 60000;
  utc = wall - tzOffsetMin(utc, timeZone) * 60000;
  return utc;
}

/** Wall-clock parts of an instant in a zone. */
export function localParts(ms, timeZone = "Asia/Kolkata") {
  const off = tzOffsetMin(ms, timeZone);
  const d = new Date(ms + off * 60000);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: d.getUTCHours(), minute: d.getUTCMinutes(), second: d.getUTCSeconds(), weekday: d.getUTCDay(), offsetMin: off };
}

/** "YYYY-MM-DD" of an instant in a zone. */
export const localDate = (ms, tz) => {
  const p = localParts(ms, tz);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
};

/** "HH:MM" (24 h) of an instant in a zone. */
export const localTime = (ms, tz, seconds = false) => {
  const p = localParts(ms, tz);
  const hm = `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
  return seconds ? `${hm}:${String(p.second).padStart(2, "0")}` : hm;
};

/** "+05:30" */
export function offsetLabel(min) {
  const s = min < 0 ? "-" : "+";
  const a = Math.abs(min);
  return `${s}${String(Math.floor(a / 60)).padStart(2, "0")}:${String(a % 60).padStart(2, "0")}`;
}
