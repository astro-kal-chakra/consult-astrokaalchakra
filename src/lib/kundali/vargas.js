import { degInSign, elementOf, isOddSign, modalityOf, norm, signOf } from "./core.js";

/**
 * Parashari divisional charts (Shodashvarga). Each function maps a sidereal longitude to the sign (0-11) it
 * occupies in that varga, by the rules of Brihat Parashara Hora Shastra.
 */

const part = (lon, n) => Math.floor(degInSign(lon) / (30 / n));
/** Start from a fixed sign by modality: movable, fixed, dual. */
const byModality = (lon, n, starts) => (starts[modalityOf(signOf(lon))] + part(lon, n)) % 12;

const RULES = {
  1: (lon) => signOf(lon),
  // Hora: odd signs 0-15° Sun (Leo), 15-30° Moon (Cancer); even signs reversed
  2: (lon) => {
    const first = degInSign(lon) < 15;
    return isOddSign(signOf(lon)) === first ? 4 : 3;
  },
  // Drekkana: the sign, the 5th, the 9th
  3: (lon) => (signOf(lon) + part(lon, 3) * 4) % 12,
  // Chaturthamsa: the sign, 4th, 7th, 10th
  4: (lon) => (signOf(lon) + part(lon, 4) * 3) % 12,
  // Saptamsa: odd from the sign, even from the 7th
  7: (lon) => (signOf(lon) + (isOddSign(signOf(lon)) ? 0 : 6) + part(lon, 7)) % 12,
  // Navamsa: continuous from Aries
  9: (lon) => Math.floor((norm(lon) * 9) / 30) % 12,
  // Dasamsa: odd from the sign, even from the 9th
  10: (lon) => (signOf(lon) + (isOddSign(signOf(lon)) ? 0 : 8) + part(lon, 10)) % 12,
  // Dwadasamsa: from the sign
  12: (lon) => (signOf(lon) + part(lon, 12)) % 12,
  // Shodasamsa: movable from Aries, fixed from Leo, dual from Sagittarius
  16: (lon) => byModality(lon, 16, [0, 4, 8]),
  // Vimsamsa: movable from Aries, fixed from Sagittarius, dual from Leo
  20: (lon) => byModality(lon, 20, [0, 8, 4]),
  // Chaturvimsamsa: odd from Leo, even from Cancer
  24: (lon) => ((isOddSign(signOf(lon)) ? 4 : 3) + part(lon, 24)) % 12,
  // Saptavimsamsa (Bhamsa): fire from Aries, earth from Cancer, air from Libra, water from Capricorn
  27: (lon) => ([0, 3, 6, 9][elementOf(signOf(lon))] + part(lon, 27)) % 12,
  // Trimsamsa: odd 5 Mars, 5 Saturn, 8 Jupiter, 7 Mercury, 5 Venus; even reversed
  30: (lon) => {
    const d = degInSign(lon);
    if (isOddSign(signOf(lon))) return d < 5 ? 0 : d < 10 ? 10 : d < 18 ? 8 : d < 25 ? 2 : 6;
    return d < 5 ? 1 : d < 12 ? 5 : d < 20 ? 11 : d < 25 ? 9 : 7;
  },
  // Khavedamsa: odd from Aries, even from Libra
  40: (lon) => ((isOddSign(signOf(lon)) ? 0 : 6) + part(lon, 40)) % 12,
  // Akshavedamsa: movable from Aries, fixed from Leo, dual from Sagittarius
  45: (lon) => byModality(lon, 45, [0, 4, 8]),
  // Shashtyamsa: from the sign
  60: (lon) => (signOf(lon) + part(lon, 60)) % 12,
};

export const VARGAS = [1, 2, 3, 4, 7, 9, 10, 12, 16, 20, 24, 27, 30, 40, 45, 60];

export const vargaSign = (n, lon) => RULES[n](lon);

/** Sign of the ascendant and of every planet in varga D`n`. */
export function vargaChart(n, ascLon, planets) {
  const asc = vargaSign(n, ascLon);
  const signs = {};
  for (const [key, p] of Object.entries(planets)) signs[key] = vargaSign(n, p.lon);
  return { n, asc, signs };
}

/** Vimshopaka-style summary: in how many of the 16 vargas each planet is in its own or exaltation sign. */
export function vargaStrength(planets, ownSign, exaltSign) {
  const out = {};
  for (const [key, p] of Object.entries(planets)) {
    let own = 0;
    let exalt = 0;
    for (const n of VARGAS) {
      const s = vargaSign(n, p.lon);
      if (ownSign(key, s)) own++;
      if (exaltSign(key) === s) exalt++;
    }
    out[key] = { own, exalt };
  }
  return out;
}
