import { DASHA_YEARS, NAK, NAK_LORDS, SIGN_LORDS, nakshatraOf, norm, signOf } from "./core.js";
import { houseOfLon } from "./ephemeris.js";

/** Krishnamurti Paddhati: sign lord, star lord, sub lord and sub-sub lord of a longitude. */
export function kpLords(lon) {
  const l = norm(lon);
  const nak = nakshatraOf(l);
  const star = NAK_LORDS[nak % 9];
  const split = (lord, offset, span) => {
    const from = NAK_LORDS.indexOf(lord);
    let acc = 0;
    for (let j = 0; j < 9; j++) {
      const sub = NAK_LORDS[(from + j) % 9];
      const w = (span * DASHA_YEARS[sub]) / 120;
      if (offset < acc + w || j === 8) return { lord: sub, offset: offset - acc, span: w };
      acc += w;
    }
    return null;
  };
  const sub = split(star, l - nak * NAK, NAK);
  const subSub = split(sub.lord, sub.offset, sub.span);
  return { sign: SIGN_LORDS[signOf(l)], star, sub: sub.lord, subSub: subSub.lord };
}

/**
 * KP cusps and significators. `cusps`: 12 sidereal Placidus cusps; `planets`: { key: { lon } }.
 * Planet significators: A = houses occupied by its star lord, B = house it occupies,
 * C = houses owned by its star lord, D = houses it owns.
 */
export function kp(cusps, planets) {
  const occupies = {};
  const owns = {};
  for (const [k, p] of Object.entries(planets)) {
    occupies[k] = houseOfLon(p.lon, cusps);
    owns[k] = [];
  }
  cusps.forEach((c, i) => {
    const lord = SIGN_LORDS[signOf(c)];
    owns[lord].push(i + 1);
  });
  const planetRows = Object.entries(planets).map(([k, p]) => {
    const lords = kpLords(p.lon);
    return { key: k, lon: p.lon, house: occupies[k], ...lords, significators: { a: [occupies[lords.star]], b: [occupies[k]], c: owns[lords.star], d: owns[k] } };
  });
  const cuspRows = cusps.map((c, i) => ({ house: i + 1, lon: c, ...kpLords(c) }));
  // House-wise: which planets signify each house at any level
  const houses = Array.from({ length: 12 }, (_, i) => {
    const h = i + 1;
    const lv = { a: [], b: [], c: [], d: [] };
    for (const r of planetRows) for (const level of ["a", "b", "c", "d"]) if (r.significators[level].includes(h)) lv[level].push(r.key);
    return { house: h, ...lv };
  });
  return { cusps: cuspRows, planets: planetRows, houses };
}
