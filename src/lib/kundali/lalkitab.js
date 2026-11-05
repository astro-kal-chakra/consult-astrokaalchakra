import { PLANETS } from "./core.js";

/**
 * Lal Kitab view of the birth chart: the ascendant is always house 1 = Aries, so planets keep their D1 houses and
 * the houses carry fixed sign numbers. Rules below are the commonly applied Lal Kitab ones; texts live in i18n.
 */

/** Pakka ghar (permanent house) of each planet. */
export const PAKKA_GHAR = { sun: [1], moon: [4], mars: [3, 8], mercury: [7], jupiter: [2], venus: [7], saturn: [8], rahu: [12], ketu: [6] };
/** Exalted / debilitated houses (seven planets; Rahu / Ketu vary between texts and are left out). */
const UCHCH = { sun: 1, moon: 2, mars: 10, mercury: 6, jupiter: 4, venus: 12, saturn: 7 };
const NEECH = { sun: 7, moon: 8, mars: 4, mercury: 12, jupiter: 10, venus: 6, saturn: 1 };
/** Lal Kitab aspects: house → houses it looks at. */
const LK_ASPECT = { 1: [7], 2: [6], 3: [9, 11], 4: [10], 5: [9], 6: [12], 8: [2] };

/**
 * The nine debts (rin): planets → houses that indicate it.
 */
const RIN = [
  { key: "pitra", planets: ["venus", "mercury", "rahu"], houses: [2, 5, 9, 12] },
  { key: "swayam", planets: ["venus", "saturn", "rahu", "ketu"], houses: [5] },
  { key: "matri", planets: ["ketu"], houses: [4] },
  { key: "stri", planets: ["sun", "rahu", "ketu"], houses: [2, 7] },
  { key: "bandhu", planets: ["mercury", "ketu"], houses: [1, 8] },
  { key: "behan", planets: ["moon"], houses: [3, 6] },
  { key: "nirdayi", planets: ["sun", "moon", "mars"], houses: [10, 11] },
  { key: "ajanma", planets: ["sun", "venus", "mars"], houses: [12] },
  { key: "daivik", planets: ["moon", "mars"], houses: [6] },
];

/** @param planets [{ key, house }] D1 planets */
export function lalKitab(planets) {
  const houseOf = Object.fromEntries(planets.map((p) => [p.key, p.house]));
  const occupied = new Set(Object.values(houseOf));
  const aspected = new Set();
  for (const h of occupied) for (const t of LK_ASPECT[h] || []) aspected.add(t);

  const rows = PLANETS.map((key) => {
    const h = houseOf[key];
    let status = "normal";
    if (UCHCH[key] === h) status = "exalted";
    else if (NEECH[key] === h) status = "debilitated";
    else if (PAKKA_GHAR[key].includes(h)) status = "pakkaGhar";
    const targets = LK_ASPECT[h];
    const sleeping = Boolean(targets) && targets.every((t) => !occupied.has(t));
    return { key, house: h, status, sleeping };
  });
  const houses = Array.from({ length: 12 }, (_, i) => ({ house: i + 1, planets: PLANETS.filter((k) => houseOf[k] === i + 1), sleeping: !occupied.has(i + 1) && !aspected.has(i + 1) }));
  const debts = RIN.map((r) => {
    const by = r.planets.filter((k) => r.houses.includes(houseOf[k]));
    return { key: r.key, present: by.length > 0, planets: by, houses: [...new Set(by.map((k) => houseOf[k]))] };
  });
  // Remedies: for debilitated planets, sleeping planets in dusthana-like spots, and planets causing a debt
  const needs = new Set(rows.filter((r) => r.status === "debilitated").map((r) => r.key));
  for (const d of debts) d.planets.forEach((k) => needs.add(k));
  return { planets: rows, houses, debts, remedyPlanets: PLANETS.filter((k) => needs.has(k)) };
}
