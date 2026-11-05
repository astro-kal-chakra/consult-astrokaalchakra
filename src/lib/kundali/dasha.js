import { DASHA_YEARS, DAY, NAK, NAK_LORDS, YEAR_DAYS, nakshatraOf, norm } from "./core.js";

const YEAR = YEAR_DAYS * DAY;

/** Sub-periods of a period, in Vimshottari proportion, starting from the period's own lord. */
export function vimshottariSub(lord, start, end) {
  const total = end - start;
  const from = NAK_LORDS.indexOf(lord);
  let cursor = start;
  return Array.from({ length: 9 }, (_, j) => {
    const l = NAK_LORDS[(from + j) % 9];
    const s = cursor;
    cursor += (total * DASHA_YEARS[l]) / 120;
    return { lord: l, start: s, end: j === 8 ? end : cursor };
  });
}

/**
 * Vimshottari dasha from the Moon's sidereal longitude: mahadasha → antardasha → pratyantar dasha (ms timestamps).
 * The first mahadasha starts before birth by the part of the nakshatra already traversed; `balance` is what was
 * left of it at birth (years).
 */
export function vimshottari(moonLon, birthMs) {
  const idx = nakshatraOf(moonLon) % 9;
  const traversed = (norm(moonLon) % NAK) / NAK;
  const firstLord = NAK_LORDS[idx];
  let cursor = birthMs - traversed * DASHA_YEARS[firstLord] * YEAR;
  const maha = Array.from({ length: 9 }, (_, i) => {
    const lord = NAK_LORDS[(idx + i) % 9];
    const start = cursor;
    cursor += DASHA_YEARS[lord] * YEAR;
    const antar = vimshottariSub(lord, start, cursor).map((a) => ({ ...a, sub: vimshottariSub(a.lord, a.start, a.end) }));
    return { lord, years: DASHA_YEARS[lord], start, end: cursor, sub: antar };
  });
  return { balance: { lord: firstLord, years: (1 - traversed) * DASHA_YEARS[firstLord] }, maha };
}

/** The running period chain [maha, antar, pratyantar, sookshma] at an instant. */
export function runningVimshottari(v, at) {
  const chain = [];
  let list = v.maha;
  for (let level = 0; level < 4 && list; level++) {
    const cur = list.find((p) => at >= p.start && at < p.end);
    if (!cur) break;
    chain.push(cur);
    list = cur.sub || (level === 2 ? vimshottariSub(cur.lord, cur.start, cur.end) : null);
  }
  return chain;
}

// Yogini: Mangala (Moon 1), Pingala (Sun 2), Dhanya (Jupiter 3), Bhramari (Mars 4), Bhadrika (Mercury 5),
// Ulka (Saturn 6), Siddha (Venus 7), Sankata (Rahu 8): 36 years
export const YOGINIS = [
  { key: "mangala", lord: "moon", years: 1 },
  { key: "pingala", lord: "sun", years: 2 },
  { key: "dhanya", lord: "jupiter", years: 3 },
  { key: "bhramari", lord: "mars", years: 4 },
  { key: "bhadrika", lord: "mercury", years: 5 },
  { key: "ulka", lord: "saturn", years: 6 },
  { key: "siddha", lord: "venus", years: 7 },
  { key: "sankata", lord: "rahu", years: 8 },
];

/** Yogini dasha for two cycles (72 years) from birth, with antardashas. Start yogini = (nakshatra no. + 3) mod 8. */
export function yogini(moonLon, birthMs) {
  const nak = nakshatraOf(moonLon) + 1;
  const first = (nak + 3) % 8 === 0 ? 7 : ((nak + 3) % 8) - 1;
  const traversed = (norm(moonLon) % NAK) / NAK;
  let cursor = birthMs - traversed * YOGINIS[first].years * YEAR;
  const out = [];
  for (let i = 0; i < 16; i++) {
    const y = YOGINIS[(first + i) % 8];
    const start = cursor;
    cursor += y.years * YEAR;
    let sc = start;
    const sub = Array.from({ length: 8 }, (_, j) => {
      const s = YOGINIS[(first + i + j) % 8];
      const st = sc;
      sc += ((y.years * s.years) / 36) * YEAR;
      return { key: s.key, lord: s.lord, start: st, end: j === 7 ? cursor : sc };
    });
    out.push({ key: y.key, lord: y.lord, years: y.years, start, end: cursor, sub });
  }
  return { balance: { key: YOGINIS[first].key, years: (1 - traversed) * YOGINIS[first].years }, maha: out };
}
