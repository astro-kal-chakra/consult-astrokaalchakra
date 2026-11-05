import { DAY, PLANETS, houseFrom, signOf } from "./core.js";
import { angles, findLongitude, planetPositions, siderealLon } from "./ephemeris.js";
import { zonedToUtc } from "./time.js";

/** Planets now (or at `at`), with houses counted from the natal ascendant and natal Moon. */
export function transit(at, natalAscSign, natalMoonSign, node) {
  const pos = planetPositions(at, { node });
  return {
    at,
    planets: PLANETS.map((k) => ({ key: k, lon: pos[k].lon, sign: signOf(pos[k].lon), retro: pos[k].retro, house: houseFrom(signOf(pos[k].lon), natalAscSign), fromMoon: houseFrom(signOf(pos[k].lon), natalMoonSign) })),
  };
}

/** Saturn's sidereal sign intervals between two instants (ingresses refined to the hour, retrograde re-entries kept). */
function saturnSigns(from, to) {
  const step = 8 * DAY;
  const out = [];
  let t = from;
  let sign = signOf(siderealLon("saturn", t));
  let start = from;
  while (t < to) {
    const n = Math.min(t + step, to);
    const s = signOf(siderealLon("saturn", n));
    if (s !== sign) {
      let lo = t;
      let hi = n;
      while (hi - lo > 3600000) {
        const mid = (lo + hi) / 2;
        if (signOf(siderealLon("saturn", mid)) === sign) lo = mid;
        else hi = mid;
      }
      out.push({ sign, start, end: hi });
      sign = s;
      start = hi;
    }
    t = n;
  }
  out.push({ sign, start, end: to });
  return out;
}

/**
 * Sade Sati (Saturn in the 12th, 1st, 2nd from the natal Moon sign) and Dhaiya / small Panoti (4th, 8th) from birth
 * to 100 years. Phases: rising (12th), peak (1st), setting (2nd).
 */
export function sadeSati(birthMs, moonSign, now = Date.now()) {
  const intervals = saturnSigns(birthMs, birthMs + 100 * 365.25 * DAY);
  const PHASE = { 12: "rising", 1: "peak", 2: "setting" };
  const sade = [];
  const dhaiya = [];
  for (const iv of intervals) {
    const h = houseFrom(iv.sign, moonSign);
    if (PHASE[h]) {
      const last = sade[sade.length - 1];
      const row = { phase: PHASE[h], sign: iv.sign, start: iv.start, end: iv.end };
      if (last && Math.abs(last.end - iv.start) < 1000) {
        last.phases.push(row);
        last.end = iv.end;
      } else sade.push({ start: iv.start, end: iv.end, phases: [row] });
    } else if (h === 4 || h === 8) dhaiya.push({ house: h, sign: iv.sign, start: iv.start, end: iv.end });
  }
  const current = sade.find((s) => now >= s.start && now < s.end) || null;
  const currentPhase = current ? current.phases.find((p) => now >= p.start && now < p.end) : null;
  const currentDhaiya = dhaiya.find((d) => now >= d.start && now < d.end) || null;
  return { cycles: sade, dhaiya, current: current ? { ...current, phase: currentPhase?.phase || null } : null, currentDhaiya };
}

/**
 * Varshphal (Tajik annual chart): the instant the Sun returns to its natal sidereal longitude in `year`, the chart at
 * that instant for the given place, and the Muntha (natal ascendant sign + completed years).
 */
export function varshphal({ natalSunLon, natalAscSign, birthYear, birthMonthDay, year, lat, lng, tz, node }) {
  const approx = zonedToUtc(`${year}-${birthMonthDay}`, "00:00", tz);
  const at = findLongitude("sun", natalSunLon, approx - 5 * DAY, { stepDays: 1, maxDays: 12 });
  if (at == null) return null;
  const a = angles(at, lat, lng);
  const pos = planetPositions(at, { node });
  const ascSign = signOf(a.asc);
  const age = year - birthYear;
  const muntha = (natalAscSign + age) % 12;
  return {
    year,
    age,
    at,
    asc: a.asc,
    ascSign,
    planets: PLANETS.map((k) => ({ key: k, lon: pos[k].lon, sign: signOf(pos[k].lon), retro: pos[k].retro, house: houseFrom(signOf(pos[k].lon), ascSign) })),
    muntha,
    munthaHouse: houseFrom(muntha, ascSign),
  };
}
