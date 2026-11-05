/**
 * Shared constants and small helpers of the kundali engine. Everything is language neutral: signs 0-11,
 * nakshatras 0-26, planet keys. Labels come from ./i18n.js.
 */

export const DAY = 86400000;
export const YEAR_DAYS = 365.25;
export const NAK = 360 / 27;

export const norm = (x) => ((x % 360) + 360) % 360;
export const norm180 = (x) => ((((x + 180) % 360) + 360) % 360) - 180;
export const rad = (d) => (d * Math.PI) / 180;
export const deg = (r) => (r * 180) / Math.PI;
export const round = (x, n = 4) => Number(x.toFixed(n));

export const PLANETS = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu"];
/** The seven visible planets (Ashtakavarga, many yogas). */
export const SEVEN = PLANETS.slice(0, 7);

export const SIGN_LORDS = ["mars", "venus", "mercury", "moon", "sun", "mercury", "venus", "mars", "jupiter", "saturn", "saturn", "jupiter"];
export const NAK_LORDS = ["ketu", "venus", "sun", "moon", "mars", "rahu", "jupiter", "saturn", "mercury"];
export const DASHA_YEARS = { ketu: 7, venus: 20, sun: 6, moon: 10, mars: 7, rahu: 18, jupiter: 16, saturn: 19, mercury: 17 };

export const signOf = (lon) => Math.floor(norm(lon) / 30);
export const degInSign = (lon) => norm(lon) % 30;
export const nakshatraOf = (lon) => Math.floor(norm(lon) / NAK) % 27;
export const padaOf = (lon) => Math.floor((norm(lon) % NAK) / (NAK / 4)) + 1;
/** House (1-12) of a sign counted from another sign (whole-sign houses). */
export const houseFrom = (sign, fromSign) => ((sign - fromSign + 12) % 12) + 1;

/** 0 = fire, 1 = earth, 2 = air, 3 = water */
export const elementOf = (sign) => sign % 4;
/** 0 = movable (chara), 1 = fixed (sthira), 2 = dual (dwiswabhava) */
export const modalityOf = (sign) => sign % 3;
export const isOddSign = (sign) => sign % 2 === 0; // Aries (0) is the 1st, an odd sign

export const EXALTATION = { sun: 0, moon: 1, mars: 9, mercury: 5, jupiter: 3, venus: 11, saturn: 6, rahu: 1, ketu: 7 };
export const DEBILITATION = { sun: 6, moon: 7, mars: 3, mercury: 11, jupiter: 9, venus: 5, saturn: 0, rahu: 7, ketu: 1 };
/** Moolatrikona sign and degree range. */
export const MOOLATRIKONA = { sun: [4, 0, 20], moon: [1, 3, 30], mars: [0, 0, 12], mercury: [5, 15, 20], jupiter: [8, 0, 10], venus: [6, 0, 15], saturn: [10, 0, 20] };

/** Natural friendship (Naisargika Maitri): f friend, n neutral, e enemy. */
export const RELATION = {
  sun: { moon: "f", mars: "f", jupiter: "f", mercury: "n", venus: "e", saturn: "e" },
  moon: { sun: "f", mercury: "f", mars: "n", jupiter: "n", venus: "n", saturn: "n" },
  mars: { sun: "f", moon: "f", jupiter: "f", venus: "n", saturn: "n", mercury: "e" },
  mercury: { sun: "f", venus: "f", mars: "n", jupiter: "n", saturn: "n", moon: "e" },
  jupiter: { sun: "f", moon: "f", mars: "f", saturn: "n", mercury: "e", venus: "e" },
  venus: { mercury: "f", saturn: "f", mars: "n", jupiter: "n", sun: "e", moon: "e" },
  saturn: { mercury: "f", venus: "f", jupiter: "n", sun: "e", moon: "e", mars: "e" },
};

/**
 * Dignity of a planet in a sign: exalted, debilitated, moolatrikona, own, friend, neutral, enemy.
 * Rahu and Ketu only get exalted / debilitated / neutral.
 */
export function dignity(key, lon) {
  const sign = signOf(lon);
  if (EXALTATION[key] === sign) return "exalted";
  if (DEBILITATION[key] === sign) return "debilitated";
  if (key === "rahu" || key === "ketu") return "neutral";
  const mt = MOOLATRIKONA[key];
  const d = degInSign(lon);
  if (mt && mt[0] === sign && d >= mt[1] && d < mt[2]) return "moolatrikona";
  const lord = SIGN_LORDS[sign];
  if (lord === key) return "own";
  const rel = RELATION[key][lord];
  return rel === "f" ? "friend" : rel === "e" ? "enemy" : "neutral";
}

/** Combustion orbs from the Sun (degrees); the second value applies when the planet is retrograde. */
const COMBUST = { moon: [12, 12], mars: [17, 17], mercury: [14, 12], jupiter: [11, 11], venus: [10, 8], saturn: [15, 15] };
export function isCombust(key, lon, sunLon, retro) {
  const orb = COMBUST[key];
  if (!orb) return false;
  return Math.abs(norm180(lon - sunLon)) <= orb[retro ? 1 : 0];
}

/** Baladi avastha: 0 bala, 1 kumara, 2 yuva, 3 vriddha, 4 mrita (reversed in even signs). */
export function baladiAvastha(lon) {
  const i = Math.min(4, Math.floor(degInSign(lon) / 6));
  return isOddSign(signOf(lon)) ? i : 4 - i;
}

/** Vedic aspects: every planet the 7th; Mars 4, 8; Jupiter 5, 9; Saturn 3, 10; Rahu / Ketu 5, 9 (common practice). */
export const ASPECTS = { sun: [7], moon: [7], mercury: [7], venus: [7], mars: [4, 7, 8], jupiter: [5, 7, 9], saturn: [3, 7, 10], rahu: [5, 7, 9], ketu: [5, 7, 9] };

export const pad2 = (n) => String(n).padStart(2, "0");
/** 12.5 → { d: 12, m: 30, s: 0 } */
export function toDms(x) {
  let total = Math.round(Math.abs(x) * 3600);
  const d = Math.floor(total / 3600);
  total -= d * 3600;
  return { d, m: Math.floor(total / 60), s: total % 60 };
}
export const dms = (x) => {
  const { d, m, s } = toDms(x);
  return `${d}°${pad2(m)}'${pad2(s)}"`;
};
export const isoDate = (ms) => new Date(ms).toISOString().slice(0, 10);
