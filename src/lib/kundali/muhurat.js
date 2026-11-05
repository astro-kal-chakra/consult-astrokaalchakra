import { DAY, NAK, houseFrom, isCombust, nakshatraOf, norm, norm180, signOf } from "./core.js";
import { moonEvents, siderealLon, snapshot, sunEvents } from "./ephemeris.js";
import { karanaIndex, lunarMonth } from "./panchang.js";
import { isValidTimeZone, localParts, zonedToUtc } from "./time.js";
import { CHOGHADIYA, CHOG_START, EVENTS, EVENT_KEYS } from "./muhuratRules.js";

export { EVENTS, EVENT_KEYS };

/**
 * Panchang of any day and Shubh Muhurat search, following the common rules of Muhurta Chintamani as used by
 * Indian panchangs: nakshatra, tithi, vaar and lagna of the event; no Bhadra (Vishti), Vyatipata or Vaidhriti; no
 * Rahu Kaal; seasonal bars (Kharmas, Chaturmas, Holashtak, Adhika maas, Guru / Shukra asta); and, when the
 * person's rashi and nakshatra are given, Tara bala and Chandra bala.
 *
 * Tithi 0-29 (0 = Shukla Pratipada, 14 = Purnima, 29 = Amavasya); nakshatra 0-26; yoga 0-26; karana 0-10;
 * weekday 0 = Sunday. All instants are UTC ms; dates are "YYYY-MM-DD" in the place's time zone.
 */

const MIN = 60000;

/** Vyatipata and Vaidhriti spoil any muhurat. */
const BAD_YOGA = [16, 26];
const VISHTI = 6;

const RAHU = [8, 2, 7, 5, 6, 4, 3];
const YAMA = [5, 4, 3, 2, 1, 7, 6];
const GULIKA = [7, 6, 5, 4, 3, 2, 1];
/** Disha shool (direction to avoid travelling) by weekday. */
const DISHA_SHOOL = ["west", "east", "north", "north", "south", "west", "east"];

const SARVARTHA = [[0, 7, 11, 12, 18, 20, 25], [3, 4, 7, 16, 21], [0, 2, 8, 25], [2, 3, 4, 12, 16], [0, 6, 7, 16, 26], [0, 6, 16, 21, 26], [3, 14, 21]];
const AMRIT = [12, 4, 0, 16, 7, 26, 3];
const RAVI_YOGA = [4, 6, 9, 10, 13, 20];

/** Special yogas active in a segment (on a weekday). */
function specialYogas(s, wd) {
  const out = [];
  const tn = (s.tithi % 15) + 1;
  if (SARVARTHA[wd].includes(s.nak)) out.push("sarvarthaSiddhi");
  if (AMRIT[wd] === s.nak) out.push("amritSiddhi");
  if (s.nak === 7 && wd === 4) out.push("guruPushya");
  if (s.nak === 7 && wd === 0) out.push("raviPushya");
  if (RAVI_YOGA.includes(((s.nak - s.sunNak + 27) % 27) + 1)) out.push("raviYoga");
  if ([0, 2, 6].includes(wd) && [2, 7, 12].includes(tn)) {
    if ([4, 13, 22].includes(s.nak)) out.push("dwipushkar");
    if ([2, 6, 11, 15, 20, 24].includes(s.nak)) out.push("tripushkar");
  }
  return out;
}

/** Tara (1-9) of a nakshatra counted from the birth nakshatra; 3 Vipat, 5 Pratyari and 7 Vadha are bad. */
export const taraOf = (nak, janma) => (((nak - janma + 27) % 27) % 9) + 1;
const taraOk = (nak, janma) => ![3, 5, 7].includes(taraOf(nak, janma));
/** Chandra bala: the Moon in the 4th, 8th or 12th from the birth rashi is bad. */
const chandraOk = (moonSign, rashi) => ![4, 8, 12].includes(houseFrom(moonSign, rashi));

// ------------------------------------------------------------------ scanning

/** Panchang state of an instant (`lagna` only with a place). */
function stateAt(ms, lat, lng) {
  const { sun, moon, asc } = snapshot(ms, lat, lng);
  const elong = norm(moon - sun);
  return { tithi: Math.floor(elong / 12), karana: karanaIndex(Math.floor(elong / 6)), nak: nakshatraOf(moon), yoga: Math.floor(norm(sun + moon) / NAK) % 27, moonSign: signOf(moon), sunNak: nakshatraOf(sun), lagna: signOf(asc) };
}
const KEYS = ["tithi", "karana", "nak", "yoga", "moonSign", "sunNak", "lagna"];
const sameBy = (keys) => (a, b) => keys.every((k) => a[k] === b[k]);
const same = sameBy(KEYS);

/**
 * Splits [start, end) into segments of constant panchang state (to about 15 seconds). The ascendant changes
 * at least every ~50 minutes in inhabited latitudes, so 10-minute samples catch every change.
 */
export function scan(start, end, lat, lng, { step = 10 * MIN, eq = same } = {}) {
  const segs = [];
  let t = start;
  let s = stateAt(t, lat, lng);
  let from = start;
  while (t < end) {
    const n = Math.min(t + step, end);
    const ns = stateAt(n, lat, lng);
    let a = s;
    while (!eq(a, ns)) {
      let lo = t;
      let hi = n;
      while (hi - lo > 15000) {
        const mid = (lo + hi) / 2;
        if (eq(a, stateAt(mid, lat, lng))) lo = mid;
        else hi = mid;
      }
      hi = Math.round(hi);
      segs.push({ start: from, end: hi, s: a });
      from = hi;
      t = hi;
      a = stateAt(hi, lat, lng);
    }
    t = n;
    s = ns;
  }
  segs.push({ start: from, end, s });
  return segs.filter((g) => g.end > g.start);
}

/** End (ms) of the value of one panchang key that holds at `from` (searched up to 2 days ahead). */
function endOf(key, from, lat, lng) {
  const v = stateAt(from, lat, lng)[key];
  const step = key === "lagna" ? 10 * MIN : 60 * MIN;
  let t = from;
  for (let i = 0; i < 48 * (60 / (step / MIN)); i++) {
    const n = t + step;
    if (stateAt(n, lat, lng)[key] !== v) {
      let lo = t;
      let hi = n;
      while (hi - lo > 15000) {
        const mid = (lo + hi) / 2;
        if (stateAt(mid, lat, lng)[key] === v) lo = mid;
        else hi = mid;
      }
      return Math.round(hi);
    }
    t = n;
  }
  return null;
}

/** Runs of one key across segments: [{ value, start, end }]. */
function runsOf(segs, key) {
  const out = [];
  for (const g of segs) {
    const last = out[out.length - 1];
    if (last && last.value === g.s[key]) last.end = g.end;
    else out.push({ value: g.s[key], start: g.start, end: g.end });
  }
  return out;
}

const groupBy = (list, keyOf) => {
  const out = {};
  for (const x of list) (out[keyOf(x)] ||= []).push(x);
  return out;
};

/** Merges touching intervals. */
function merge(list) {
  const out = [];
  for (const x of [...list].sort((a, b) => a.start - b.start)) {
    const last = out[out.length - 1];
    if (last && x.start <= last.end + 1000) last.end = Math.max(last.end, x.end);
    else out.push({ ...x });
  }
  return out;
}

/** Interval minus another. */
function cut(iv, hole) {
  if (!hole || hole.end <= iv.start || hole.start >= iv.end) return [iv];
  const out = [];
  if (hole.start > iv.start) out.push({ ...iv, end: hole.start });
  if (hole.end < iv.end) out.push({ ...iv, start: hole.end });
  return out;
}

// ------------------------------------------------------------------ the day

export const addDays = (date, n) => new Date(Date.parse(`${date}T12:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const weekdayOf = (date) => new Date(`${date}T12:00:00Z`).getUTCDay();

/** Sunrise, sunset and next sunrise of a date at a place (06:00 / 18:00 local when the sun does not rise or set). */
function dayFrame(date, { lat, lng, timezone }) {
  const midnight = zonedToUtc(date, "00:00", timezone);
  const next = zonedToUtc(addDays(date, 1), "00:00", timezone);
  const a = sunEvents(midnight, lat, lng);
  const b = sunEvents(next, lat, lng);
  const sunrise = a.sunrise ?? zonedToUtc(date, "06:00", timezone);
  const sunset = a.sunset && a.sunset > sunrise ? a.sunset : sunrise + DAY / 2;
  const nextSunrise = b.sunrise && b.sunrise > sunset ? b.sunrise : sunrise + DAY;
  return { midnight, sunrise, sunset, nextSunrise, weekday: weekdayOf(date) };
}

const part = (f, n, i) => {
  const len = (f.sunset - f.sunrise) / n;
  return { start: Math.round(f.sunrise + (i - 1) * len), end: Math.round(f.sunrise + i * len) };
};
const rahuKaal = (f) => part(f, 8, RAHU[f.weekday]);

/** Guru / Shukra asta (combust) at an instant. */
function asta(ms) {
  const sun = siderealLon("sun", ms);
  const res = [];
  for (const key of ["jupiter", "venus"]) {
    const lon = siderealLon(key, ms);
    const retro = norm180(siderealLon(key, ms + DAY / 2) - siderealLon(key, ms - DAY / 2)) < 0;
    if (isCombust(key, lon, sun, retro)) res.push(key === "jupiter" ? "guruAsta" : "shukraAsta");
  }
  return res;
}

/** Seasonal bars of a day (from the panchang at sunrise). */
function seasonBars(ms, tithi, month, sunSign) {
  const bars = [];
  if (sunSign === 8 || sunSign === 11) bars.push("kharmas");
  if (month) {
    const i = month.index;
    if ((i === 3 && tithi >= 10) || i === 4 || i === 5 || i === 6 || (i === 7 && tithi < 10)) bars.push("chaturmas");
    if (i === 11 && tithi >= 7 && tithi <= 14) bars.push("holashtak");
    if (month.adhika) bars.push("adhika");
  }
  return bars;
}

/** Vikram samvat of an instant (changes at Chaitra Shukla Pratipada). */
const vikramOf = (ms, tz, month) => {
  const p = localParts(ms, tz);
  return p.year + (month && p.month <= 4 && month.index >= 10 ? 56 : 57);
};

/**
 * Full panchang of one date at a place: the five limbs with their end times, sun / moon rise and set, Rahu Kaal,
 * Yamaganda, Gulika, Abhijit, Brahma muhurat, Choghadiya, lagna table, Bhadra, Panchaka and special yogas.
 */
export function dayPanchang(date, place) {
  const { lat, lng, timezone: tz } = place;
  const f = dayFrame(date, place);
  const segs = scan(f.sunrise, f.nextSunrise, lat, lng);
  const limbs = (key) =>
    runsOf(segs, key).map((r, i, all) => ({ value: r.value, start: r.start, end: i === all.length - 1 ? endOf(key, r.end - 1000, lat, lng) : r.end }));
  // The first run of each limb began before sunrise: its true start is not needed for the day view
  const moon = moonEvents(f.midnight, lat, lng);
  const month = lunarMonth(f.sunrise);
  const dayLen = f.sunset - f.sunrise;
  const nightLen = f.nextSunrise - f.sunset;
  const chog = (from, len, startIdx, stepBy) =>
    Array.from({ length: 8 }, (_, i) => ({ key: CHOGHADIYA[(startIdx + i * stepBy) % 7], start: Math.round(from + (i * len) / 8), end: Math.round(from + ((i + 1) * len) / 8) }));
  const mid = (f.sunrise + f.sunset) / 2;
  const muhurta = dayLen / 15;
  const nightMuhurta = (DAY - dayLen) / 15;

  const special = [];
  for (const g of segs) for (const key of specialYogas(g.s, f.weekday)) special.push({ key, start: g.start, end: g.end });
  const specials = Object.entries(groupBy(special, (x) => x.key)).flatMap(([key, list]) => merge(list).map((x) => ({ key, start: x.start, end: x.end })));

  return {
    date,
    weekday: f.weekday,
    sunrise: f.sunrise,
    sunset: f.sunset,
    nextSunrise: f.nextSunrise,
    moonrise: moon.moonrise,
    moonset: moon.moonset,
    dayLength: dayLen,
    nightLength: nightLen,
    tithi: limbs("tithi"),
    nakshatra: limbs("nak"),
    yoga: limbs("yoga"),
    karana: limbs("karana"),
    moonSign: limbs("moonSign"),
    sunSign: signOf(siderealLon("sun", f.sunrise)),
    lunarMonth: month,
    vikramSamvat: vikramOf(f.sunrise, tz, month),
    shakaSamvat: vikramOf(f.sunrise, tz, month) - 135,
    rahuKaal: rahuKaal(f),
    yamaganda: part(f, 8, YAMA[f.weekday]),
    gulika: part(f, 8, GULIKA[f.weekday]),
    abhijit: { start: Math.round(mid - muhurta / 2), end: Math.round(mid + muhurta / 2), wednesday: f.weekday === 3 },
    brahma: { start: Math.round(f.sunrise - 2 * nightMuhurta), end: Math.round(f.sunrise - nightMuhurta) },
    choghadiya: { day: chog(f.sunrise, dayLen, CHOG_START[f.weekday], 1), night: chog(f.sunset, nightLen, CHOG_START[f.weekday] + 5, 5) },
    lagnas: runsOf(segs, "lagna").map((r) => ({ sign: r.value, start: r.start, end: r.end })),
    bhadra: merge(segs.filter((g) => g.s.karana === VISHTI).map((g) => ({ start: g.start, end: g.end }))),
    panchaka: merge(segs.filter((g) => g.s.moonSign >= 10).map((g) => ({ start: g.start, end: g.end }))),
    dishaShool: DISHA_SHOOL[f.weekday],
    special: specials,
    bars: [...seasonBars(f.sunrise, segs[0].s.tithi, month, signOf(siderealLon("sun", f.sunrise))), ...asta(f.sunrise)],
  };
}

// ------------------------------------------------------------------ input

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (s) => typeof s === "string" && DATE_RE.test(s) && s >= "1900-01-01" && s <= "2100-12-31" && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s);
const num = (v) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
const intIn = (v, max) => (Number.isInteger(v) && v >= 0 && v <= max ? v : null);
const fail = (code) => {
  throw new Error(code);
};

/** Place of a muhurat / panchang (polar regions excluded: no regular sunrise). Throws "PLACE". */
export function cleanPlace(p) {
  if (!p || typeof p !== "object") fail("PLACE");
  const lat = num(p.lat);
  const lng = num(p.lng);
  const timezone = String(p.timezone || "");
  if (lat == null || lng == null || Math.abs(lat) > 66 || Math.abs(lng) > 180 || !timezone || timezone.length > 64 || !isValidTimeZone(timezone)) fail("PLACE");
  return { name: String(p.name || "").slice(0, 120), region: String(p.region || "").slice(0, 120), lat, lng, timezone };
}

/** Muhurat query from the browser → clean query. Throws "EVENT", "PLACE", "DATE" or "RANGE". */
export function cleanMuhurat(q) {
  const event = String(q?.event || "");
  if (!EVENT_KEYS.includes(event)) fail("EVENT");
  const place = cleanPlace(q?.place);
  const { from, to } = q;
  if (!validDate(from) || !validDate(to)) fail("DATE");
  if (to < from || addDays(from, 366) < to) fail("RANGE");
  const persons = (Array.isArray(q.persons) ? q.persons : [])
    .slice(0, 2)
    .map((p) => ({ rashi: intIn(p?.rashi, 11), nakshatra: intIn(p?.nakshatra, 26) }))
    .filter((p) => p.rashi != null || p.nakshatra != null);
  return { event, from, to, place, persons };
}

/** Day panchang query → { date, place }. Throws "DATE" or "PLACE". */
export function cleanPanchang(date, place) {
  if (!validDate(date)) fail("DATE");
  return { date, place: cleanPlace(place) };
}

// ------------------------------------------------------------------ muhurat search

const tithiOk = (tithi, ev) => {
  if (tithi === 29) return false; // Amavasya
  const n = (tithi % 15) + 1;
  if (!ev.tithi.includes(n)) return false;
  return tithi < 15 || n <= ev.krishnaMax;
};

/**
 * Shubh muhurat windows for an event between two dates (inclusive) at a place.
 * @param {{ event: string, from: string, to: string, place: object, persons?: { rashi: number, nakshatra: number }[] }} q
 * @returns {{ days: object[], blocked: { reason, from, to }[] }}
 */
export function findMuhurat({ event, from, to, place, persons = [] }) {
  const ev = EVENTS[event];
  const { lat, lng } = place;
  const days = [];
  const bars = [];
  const segOk = (s) =>
    ev.nak.includes(s.nak) &&
    tithiOk(s.tithi, ev) &&
    !BAD_YOGA.includes(s.yoga) &&
    s.karana !== VISHTI &&
    (!ev.lagna || ev.lagna.includes(s.lagna)) &&
    persons.every((p) => (p.nakshatra == null || taraOk(s.nak, p.nakshatra)) && (p.rashi == null || chandraOk(s.moonSign, p.rashi)));

  for (let date = from; date <= to; date = addDays(date, 1)) {
    const f = dayFrame(date, place);
    const end = ev.dayOnly ? f.sunset : f.nextSunrise;

    // Seasonal bars and months
    const rise = stateAt(f.sunrise, lat, lng);
    const sunSign = signOf(siderealLon("sun", f.sunrise));
    const month = ev.season.length || ev.months ? lunarMonth(f.sunrise) : null;
    const reasons = [...seasonBars(f.sunrise, rise.tithi, month, sunSign).filter((b) => ev.season.includes(b)), ...(ev.season.includes("asta") ? asta(f.sunrise) : [])];
    if (ev.months && month && !ev.months.includes(month.index)) reasons.push("month");
    if (ev.sunSigns && !ev.sunSigns.includes(sunSign)) reasons.push("ayana");
    if (reasons.length) {
      for (const r of reasons) bars.push({ reason: r, date });
      continue;
    }
    if (!ev.days.includes(f.weekday)) continue;

    // Quick test: a nakshatra or tithi lasts at least ~19 hours, so three samples see every one of the day
    const samples = [rise, stateAt((f.sunrise + end) / 2, lat, lng), stateAt(end - 1000, lat, lng)];
    if (!samples.some((s) => ev.nak.includes(s.nak)) || !samples.some((s) => tithiOk(s.tithi, ev))) continue;

    const segs = scan(f.sunrise, end, lat, lng);
    const good = segs.filter((g) => segOk(g.s));
    if (!good.length) continue;
    const rahu = rahuKaal(f);
    const windows = merge(good.map((g) => ({ start: g.start, end: g.end })))
      .flatMap((w) => cut(w, rahu))
      .filter((w) => w.end - w.start >= 10 * MIN)
      .map((w) => {
        const inside = segs.filter((g) => g.end > w.start && g.start < w.end);
        const uniq = (key) => [...new Set(inside.map((g) => g.s[key]))];
        return { start: w.start, end: w.end, nakshatra: uniq("nak"), tithi: uniq("tithi"), yoga: uniq("yoga"), lagna: uniq("lagna") };
      });
    if (!windows.length) continue;
    const special = [...new Set(segs.flatMap((g) => specialYogas(g.s, f.weekday)))];
    days.push({ date, weekday: f.weekday, sunrise: f.sunrise, windows, special });
  }

  // Bars as date ranges
  const blocked = [];
  for (const [reason, list] of Object.entries(groupBy(bars, (b) => b.reason))) {
    let cur = null;
    for (const { date } of list) {
      if (cur && addDays(cur.to, 1) === date) cur.to = date;
      else {
        cur = { reason, from: date, to: date };
        blocked.push(cur);
      }
    }
  }
  blocked.sort((a, b) => (a.from < b.from ? -1 : 1));
  return { days, blocked };
}
