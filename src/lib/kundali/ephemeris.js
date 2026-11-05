import * as A from "astronomy-engine";
import { DAY, PLANETS, deg, norm, norm180, rad } from "./core.js";

/**
 * Sidereal (Lahiri) positions from astronomy-engine (VSOP87 / ELP based, about 1 arc-minute or better).
 *
 * Sidereal longitude = apparent tropical longitude of the true equinox − nutation in longitude − mean ayanamsa,
 * the same convention as Swiss Ephemeris based Indian software. Lahiri: 23°15'00.658" (true) on 21 March 1956
 * (Indian Astronomical Ephemeris), i.e. 23.245522556° mean, carried by the IAU 2006 general precession.
 */

const BODY = { sun: A.Body.Sun, moon: A.Body.Moon, mars: A.Body.Mars, mercury: A.Body.Mercury, jupiter: A.Body.Jupiter, venus: A.Body.Venus, saturn: A.Body.Saturn };

const precession = (T) => (5028.796195 * T + 1.1054348 * T * T + 0.00007964 * T ** 3) / 3600;
const LAHIRI_T0 = (2435553.5 - 2451545.0) / 36525;
const LAHIRI_AY0 = 23.245522556;

export const time = (ms) => A.MakeTime(new Date(ms));

/** Mean Lahiri ayanamsa (degrees) at an AstroTime. */
export const meanAyanamsa = (t) => LAHIRI_AY0 + precession(t.tt / 36525) - precession(LAHIRI_T0);

/** Everything to turn true-equinox tropical longitudes into sidereal ones at an instant. */
function frame(t) {
  const tilt = A.e_tilt(t);
  const ay = meanAyanamsa(t);
  return { tilt, ay, shift: ay + tilt.dpsi / 3600 }; // true ayanamsa
}

/** Apparent tropical (true ecliptic of date) longitude of a body. */
function tropicalLon(key, t) {
  return A.Ecliptic(A.GeoVector(BODY[key], t, true)).elon;
}

/** Mean lunar node, mean equinox of date (Meeus 47.7). */
function meanNode(t) {
  const T = t.tt / 36525;
  return norm(125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + T ** 3 / 467441 - T ** 4 / 60616000);
}

/** True (osculating) lunar node from the Moon's state vector, true ecliptic of date. */
function trueNodeTropical(t) {
  const s = A.GeoMoonState(t);
  const rot = A.Rotation_EQJ_ECT(t);
  const r = A.RotateVector(rot, new A.Vector(s.x, s.y, s.z, t));
  const v = A.RotateVector(rot, new A.Vector(s.vx, s.vy, s.vz, t));
  const hx = r.y * v.z - r.z * v.y;
  const hy = r.z * v.x - r.x * v.z;
  return norm(deg(Math.atan2(hx, -hy)));
}

/** Sidereal longitude of a planet key at an instant (ms). `node`: "mean" | "true". */
export function siderealLon(key, ms, node = "mean") {
  const t = time(ms);
  const f = frame(t);
  if (key === "rahu" || key === "ketu") {
    const rahu = node === "true" ? norm(trueNodeTropical(t) - f.shift) : norm(meanNode(t) - f.ay);
    return key === "rahu" ? rahu : norm(rahu + 180);
  }
  return norm(tropicalLon(key, t) - f.shift);
}

/** Sidereal positions + daily speed of the nine planets. */
export function planetPositions(ms, { node = "mean" } = {}) {
  const out = {};
  for (const key of PLANETS) {
    const lon = siderealLon(key, ms, node);
    const speed = norm180(siderealLon(key, ms + DAY / 2, node) - siderealLon(key, ms - DAY / 2, node));
    out[key] = { lon, speed, retro: key === "rahu" || key === "ketu" ? true : speed < 0 };
  }
  return out;
}

const ascOf = (ramc, eps, lat) => norm(deg(Math.atan2(Math.cos(rad(ramc)), -(Math.sin(rad(ramc)) * Math.cos(rad(eps)) + Math.tan(rad(lat)) * Math.sin(rad(eps))))));

/** Sidereal Sun, Moon and ascendant of an instant and place in one go (panchang and muhurat scans). */
export function snapshot(ms, lat, lng) {
  const t = time(ms);
  const f = frame(t);
  const ramc = norm(A.SiderealTime(t) * 15 + lng);
  return { sun: norm(tropicalLon("sun", t) - f.shift), moon: norm(tropicalLon("moon", t) - f.shift), asc: norm(ascOf(ramc, f.tilt.tobl, lat) - f.shift) };
}

/** Angles and the frame of an instant and place: RAMC, true obliquity, tropical ascendant / MC. */
export function angles(ms, lat, lng) {
  const t = time(ms);
  const f = frame(t);
  const ramc = norm(A.SiderealTime(t) * 15 + lng);
  const eps = f.tilt.tobl;
  const asc = ascOf(ramc, eps, lat);
  const mc = norm(deg(Math.atan2(Math.sin(rad(ramc)), Math.cos(rad(ramc)) * Math.cos(rad(eps)))));
  return { ramc, eps, shift: f.shift, ayanamsa: f.ay, trueAyanamsa: f.shift, ascTropical: asc, mcTropical: mc, asc: norm(asc - f.shift), mc: norm(mc - f.shift) };
}

/** Ecliptic longitude of the point on the ecliptic with a given right ascension. */
const lonFromRa = (ra, eps) => norm(deg(Math.atan2(Math.sin(rad(ra)), Math.cos(rad(ra)) * Math.cos(rad(eps)))));
const decOfLon = (lon, eps) => deg(Math.asin(Math.sin(rad(eps)) * Math.sin(rad(lon))));

/**
 * Placidus house cusps (sidereal, 1-12), used by KP. Returns null above the polar circles where Placidus is undefined.
 */
export function placidus(ms, lat, lng) {
  const a = angles(ms, lat, lng);
  const { ramc, eps } = a;
  if (Math.abs(lat) >= 66) return null;
  const tanLat = Math.tan(rad(lat));
  const semiDiurnal = (dec) => {
    const x = -tanLat * Math.tan(rad(dec));
    return deg(Math.acos(Math.max(-1, Math.min(1, x))));
  };
  // RA of cusp as a function of its own declination; iterate to a fixed point
  const solve = (raOf) => {
    let lon = lonFromRa(raOf(90), eps);
    for (let i = 0; i < 60; i++) {
      const next = lonFromRa(raOf(semiDiurnal(decOfLon(lon, eps))), eps);
      if (Math.abs(norm180(next - lon)) < 1e-9) return next;
      lon = next;
    }
    return lon;
  };
  const c11 = solve((sd) => ramc + sd / 3);
  const c12 = solve((sd) => ramc + (2 * sd) / 3);
  const c2 = solve((sd) => ramc + 180 - (2 * (180 - sd)) / 3);
  const c3 = solve((sd) => ramc + 180 - (180 - sd) / 3);
  const trop = [a.ascTropical, c2, c3, norm(a.mcTropical + 180), norm(c11 + 180), norm(c12 + 180), norm(a.ascTropical + 180), norm(c2 + 180), norm(c3 + 180), a.mcTropical, c11, c12];
  return trop.map((c) => norm(c - a.shift));
}

/**
 * Sripati Bhava Chalit: bhava madhya (house middles) by trisecting the arcs between the angles (Porphyry),
 * sandhi (house starts) half way between middles. Sidereal.
 */
export function sripati(ms, lat, lng) {
  const a = angles(ms, lat, lng);
  const asc = a.asc;
  const ic = norm(a.mc + 180);
  const mc = a.mc;
  const mid = new Array(12);
  const q1 = norm(ic - asc); // houses 1 → 4
  const q2 = norm(norm(asc + 180) - ic); // 4 → 7
  mid[0] = asc;
  mid[1] = norm(asc + q1 / 3);
  mid[2] = norm(asc + (2 * q1) / 3);
  mid[3] = ic;
  mid[4] = norm(ic + q2 / 3);
  mid[5] = norm(ic + (2 * q2) / 3);
  for (let i = 0; i < 6; i++) mid[i + 6] = norm(mid[i] + 180);
  mid[9] = mc;
  const sandhi = mid.map((m, i) => norm(m - norm(m - mid[(i + 11) % 12]) / 2));
  return { madhya: mid, sandhi };
}

/** House (1-12) whose arc [start_i, start_{i+1}) contains the longitude. */
export function houseOfLon(lon, starts) {
  for (let i = 0; i < 12; i++) {
    const s = starts[i];
    const e = starts[(i + 1) % 12];
    if (norm(lon - s) < norm(e - s)) return i + 1;
  }
  return 1;
}

/** Sunrise / sunset (ms) around a local day; `from` = local midnight in UTC ms. Null when the sun never rises / sets. */
export function sunEvents(from, lat, lng) {
  const obs = new A.Observer(lat, lng, 0);
  const rise = A.SearchRiseSet(A.Body.Sun, obs, +1, new Date(from), 1.2);
  const set = rise ? A.SearchRiseSet(A.Body.Sun, obs, -1, rise.date, 1) : null;
  return { sunrise: rise ? rise.date.getTime() : null, sunset: set ? set.date.getTime() : null };
}

export function moonEvents(from, lat, lng) {
  const obs = new A.Observer(lat, lng, 0);
  const rise = A.SearchRiseSet(A.Body.Moon, obs, +1, new Date(from), 1);
  const set = A.SearchRiseSet(A.Body.Moon, obs, -1, new Date(from), 1);
  return { moonrise: rise ? rise.date.getTime() : null, moonset: set ? set.date.getTime() : null };
}

/** Previous new moon (ms) before an instant. */
export function previousNewMoon(ms) {
  const r = A.SearchMoonPhase(0, new Date(ms - 32 * DAY), 32);
  if (!r) return null;
  let t = r.date.getTime();
  // SearchMoonPhase finds the first one after the start; step forward to the last one before `ms`
  for (let i = 0; i < 2; i++) {
    const n = A.SearchMoonPhase(0, new Date(t + DAY), 32);
    if (n && n.date.getTime() <= ms) t = n.date.getTime();
  }
  return t;
}

export const nextNewMoon = (ms) => {
  const r = A.SearchMoonPhase(0, new Date(ms), 32);
  return r ? r.date.getTime() : null;
};

/** Instant (ms) after `from` when the planet's sidereal longitude reaches `target` (bisection on a scan). */
export function findLongitude(key, target, from, { stepDays = 1, maxDays = 400, node = "mean" } = {}) {
  const f = (t) => norm180(siderealLon(key, t, node) - target);
  let t = from;
  let prev = f(t);
  for (let i = 0; i < maxDays / stepDays; i++) {
    const n = t + stepDays * DAY;
    const cur = f(n);
    if (prev < 0 && cur >= 0 && cur - prev < 180) {
      let lo = t;
      let hi = n;
      for (let k = 0; k < 40; k++) {
        const mid = (lo + hi) / 2;
        if (f(mid) < 0) lo = mid;
        else hi = mid;
      }
      return Math.round((lo + hi) / 2);
    }
    t = n;
    prev = cur;
  }
  return null;
}
