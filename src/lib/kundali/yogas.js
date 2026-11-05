import { ASPECTS, DEBILITATION, EXALTATION, SIGN_LORDS, houseFrom, norm } from "./core.js";

/**
 * Yogas and doshas from the D1 chart (whole-sign houses). Each entry names the rule that fired, so the astrologer
 * can see why. Input: `ascSign` and `p` = { key: { lon, sign, house } }.
 */

const KENDRA = [1, 4, 7, 10];
const TRIKONA = [1, 5, 9];
const DUSTHANA = [6, 8, 12];
const BENEFICS = ["mercury", "jupiter", "venus"];
const MAHAPURUSHA = { mars: "ruchaka", mercury: "bhadra", jupiter: "hamsa", venus: "malavya", saturn: "sasa" };

const together = (p, a, b) => p[a].sign === p[b].sign;
const ownSign = (key, sign) => SIGN_LORDS[sign] === key;
/** Lord (planet key) of house h from the ascendant. */
const lordOf = (ascSign, h) => SIGN_LORDS[(ascSign + h - 1) % 12];
/** Does planet a aspect the sign of b (Vedic special aspects)? */
const aspects = (p, a, b) => ASPECTS[a].includes(houseFrom(p[b].sign, p[a].sign));

export function manglik(p, ascSign) {
  const HOUSES = [1, 2, 4, 7, 8, 12];
  const fromLagna = HOUSES.includes(p.mars.house);
  const fromMoon = HOUSES.includes(houseFrom(p.mars.sign, p.moon.sign));
  const fromVenus = HOUSES.includes(houseFrom(p.mars.sign, p.venus.sign));
  const reasons = [];
  const s = p.mars.sign;
  if (s === 0 || s === 7) reasons.push("marsOwnSign");
  if (s === 9) reasons.push("marsExalted");
  if (together(p, "mars", "jupiter") || aspects(p, "jupiter", "mars")) reasons.push("jupiterWithMars");
  if (together(p, "mars", "moon")) reasons.push("moonWithMars");
  const h = p.mars.house;
  const SIGN_EXCEPTIONS = { 2: [2, 5], 4: [0, 7], 7: [3, 9], 8: [8, 11], 12: [1, 6] };
  if (SIGN_EXCEPTIONS[h]?.includes(s)) reasons.push("houseSignException");
  if (s === 4 || s === 10) reasons.push("marsInLeoAquarius");
  const present = fromLagna || fromMoon;
  return {
    key: "manglik",
    present,
    fromLagna,
    fromMoon,
    fromVenus,
    marsHouse: h,
    cancellations: present ? reasons : [],
    status: !present ? "none" : reasons.length ? "cancelled" : fromLagna && fromMoon ? "high" : "low",
    ascSign,
  };
}

export function kaalSarp(p) {
  const rahu = p.rahu.lon;
  const seven = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"];
  const side = seven.map((k) => norm(p[k].lon - rahu) < 180);
  const a = side.filter(Boolean).length;
  const b = 7 - a;
  const full = a === 7 || b === 7;
  const partial = !full && (a === 6 || b === 6);
  return {
    key: "kaalSarp",
    present: full,
    partial,
    // Planets on the Ketu → Rahu side: "Kaal Amrit" in some traditions
    direction: b === 7 || (partial && b === 6) ? "amrit" : "sarp",
    type: p.rahu.house, // 1 Anant … 12 Sheshnag
    status: full ? "present" : partial ? "partial" : "none",
  };
}

export function doshas(p, ascSign) {
  const nodes = (k) => together(p, k, "rahu") || together(p, k, "ketu");
  const ninthLord = lordOf(ascSign, 9);
  const pitraRules = [];
  if (nodes("sun")) pitraRules.push("sunWithNode");
  if (p.rahu.house === 9) pitraRules.push("rahuIn9");
  if (ninthLord !== "rahu" && nodes(ninthLord)) pitraRules.push("ninthLordWithNode");
  if (together(p, "sun", "saturn")) pitraRules.push("sunWithSaturn");

  const fromMoon = (k) => houseFrom(p[k].sign, p.moon.sign);
  const kemaPlanets = ["mars", "mercury", "jupiter", "venus", "saturn"];
  const kema = !kemaPlanets.some((k) => [2, 12].includes(fromMoon(k)) || p[k].sign === p.moon.sign);
  const kemaCancel = kema && kemaPlanets.some((k) => KENDRA.includes(p[k].house) || KENDRA.includes(fromMoon(k)));

  return [
    manglik(p, ascSign),
    kaalSarp(p),
    { key: "pitra", present: pitraRules.length > 0, rules: pitraRules, status: pitraRules.length ? "present" : "none" },
    { key: "grahan", present: nodes("sun") || nodes("moon"), sun: nodes("sun"), moon: nodes("moon"), status: nodes("sun") || nodes("moon") ? "present" : "none" },
    { key: "guruChandal", present: nodes("jupiter"), status: nodes("jupiter") ? "present" : "none" },
    { key: "angarak", present: nodes("mars"), status: nodes("mars") ? "present" : "none" },
    { key: "shrapit", present: together(p, "saturn", "rahu"), status: together(p, "saturn", "rahu") ? "present" : "none" },
    { key: "kemadruma", present: kema, cancelled: kemaCancel, status: !kema ? "none" : kemaCancel ? "cancelled" : "present" },
  ];
}

export function yogas(p, ascSign) {
  const out = [];
  const add = (key, info = {}) => out.push({ key, ...info });
  const fromMoon = (k) => houseFrom(p[k].sign, p.moon.sign);
  const fromSun = (k) => houseFrom(p[k].sign, p.sun.sign);

  if (KENDRA.includes(fromMoon("jupiter"))) add("gajakesari", { house: fromMoon("jupiter") });
  if (together(p, "sun", "mercury")) add("budhaditya", { house: p.sun.house });
  if (together(p, "moon", "mars")) add("chandraMangal", { house: p.moon.house });

  for (const [k, name] of Object.entries(MAHAPURUSHA)) {
    if (KENDRA.includes(p[k].house) && (ownSign(k, p[k].sign) || EXALTATION[k] === p[k].sign)) add(name, { planet: k, house: p[k].house });
  }

  const moonSide = ["mars", "mercury", "jupiter", "venus", "saturn"];
  const m2 = moonSide.filter((k) => fromMoon(k) === 2);
  const m12 = moonSide.filter((k) => fromMoon(k) === 12);
  if (m2.length && m12.length) add("durudhura", { planets: [...m2, ...m12] });
  else if (m2.length) add("sunapha", { planets: m2 });
  else if (m12.length) add("anapha", { planets: m12 });

  const sunSide = ["mars", "mercury", "jupiter", "venus", "saturn"];
  const s2 = sunSide.filter((k) => fromSun(k) === 2);
  const s12 = sunSide.filter((k) => fromSun(k) === 12);
  if (s2.length && s12.length) add("ubhayachari", { planets: [...s2, ...s12] });
  else if (s2.length) add("vesi", { planets: s2 });
  else if (s12.length) add("vasi", { planets: s12 });

  if (BENEFICS.every((k) => [6, 7, 8].includes(fromMoon(k)))) add("adhi");
  const amala = BENEFICS.filter((k) => p[k].house === 10 || fromMoon(k) === 10);
  if (amala.length) add("amala", { planets: amala });

  // Raja yoga: a kendra lord with a trikona lord (same sign or mutual 7th aspect), different planets
  const seen = new Set();
  for (const k of KENDRA) {
    for (const t of TRIKONA) {
      const a = lordOf(ascSign, k);
      const b = lordOf(ascSign, t);
      if (a === b) continue;
      const id = [a, b].sort().join("-");
      if (seen.has(id)) continue;
      if (together(p, a, b) || houseFrom(p[b].sign, p[a].sign) === 7) {
        seen.add(id);
        add("raja", { planets: [a, b], houses: [k, t] });
      }
    }
  }
  // Dhana yoga: lord of 2 or 11 with lord of 1, 5 or 9
  const dseen = new Set();
  for (const k of [2, 11]) {
    for (const t of [1, 5, 9]) {
      const a = lordOf(ascSign, k);
      const b = lordOf(ascSign, t);
      const id = [a, b].sort().join("-");
      if (a !== b && !dseen.has(id) && together(p, a, b)) {
        dseen.add(id);
        add("dhana", { planets: [a, b], houses: [k, t] });
      }
    }
  }
  // Viparita raja: lord of 6 / 8 / 12 in 6 / 8 / 12 (Harsha, Sarala, Vimala)
  const VIPARITA = { 6: "harsha", 8: "sarala", 12: "vimala" };
  for (const h of DUSTHANA) {
    const l = lordOf(ascSign, h);
    if (DUSTHANA.includes(p[l].house)) add(VIPARITA[h], { planet: l, house: p[l].house });
  }
  // Neecha bhanga: debilitated planet whose debilitation-sign lord or exaltation-sign lord is in a kendra from lagna or Moon
  for (const k of ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"]) {
    if (DEBILITATION[k] !== p[k].sign) continue;
    const helpers = [SIGN_LORDS[DEBILITATION[k]], SIGN_LORDS[EXALTATION[k]]];
    if (helpers.some((h) => KENDRA.includes(p[h].house) || KENDRA.includes(fromMoon(h)))) add("neechaBhanga", { planet: k });
  }
  // Parivartana: two planets in each other's signs
  const pseen = new Set();
  for (const a of ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"]) {
    const b = SIGN_LORDS[p[a].sign];
    if (b !== a && SIGN_LORDS[p[b].sign] === a) {
      const id = [a, b].sort().join("-");
      if (!pseen.has(id)) {
        pseen.add(id);
        add("parivartana", { planets: [a, b] });
      }
    }
  }
  return out;
}
