import { RELATION, SIGN_LORDS, houseFrom } from "./core.js";
import { YONI, gana, nadi, varna, vashya } from "./panchang.js";

/**
 * Ashtakoot Guna Milan (36 points, classical tables, same as the Astro Kaal Chakra website) with the usual Nadi /
 * Bhakoot dosha exceptions noted separately (the score itself stays classical) and Manglik for both.
 */

const VARNA_RANK = { brahmin: 4, kshatriya: 3, vaishya: 2, shudra: 1 };
const VASHYA_IDX = { chatushpada: 0, manava: 1, jalachara: 2, vanachara: 3, keeta: 4 };
// Boy (rows) × girl (columns)
const VASHYA_TABLE = [
  [2, 1, 1, 0.5, 1],
  [1, 2, 0.5, 0, 1],
  [1, 0.5, 2, 1, 1],
  [0.5, 0, 1, 2, 0],
  [1, 1, 1, 0, 2],
];
const YONI_TABLE = [
  [4, 2, 2, 3, 2, 2, 2, 1, 0, 1, 3, 3, 2, 1],
  [2, 4, 3, 3, 2, 2, 2, 2, 3, 1, 2, 3, 2, 0],
  [2, 3, 4, 2, 1, 2, 1, 3, 3, 1, 2, 0, 3, 1],
  [3, 3, 2, 4, 2, 1, 1, 1, 1, 2, 2, 2, 0, 2],
  [2, 2, 1, 2, 4, 2, 1, 2, 2, 1, 0, 2, 1, 1],
  [2, 2, 2, 1, 2, 4, 0, 2, 2, 1, 3, 3, 2, 1],
  [2, 2, 1, 1, 1, 0, 4, 2, 2, 2, 2, 2, 1, 2],
  [1, 2, 3, 1, 2, 2, 2, 4, 3, 0, 3, 2, 2, 1],
  [0, 3, 3, 1, 2, 2, 2, 3, 4, 1, 2, 2, 2, 1],
  [1, 1, 1, 2, 1, 1, 2, 0, 1, 4, 1, 1, 2, 1],
  [3, 2, 2, 2, 0, 3, 2, 3, 2, 1, 4, 2, 2, 1],
  [3, 3, 0, 2, 2, 3, 2, 2, 2, 1, 2, 4, 3, 2],
  [2, 2, 3, 0, 1, 2, 1, 2, 2, 2, 2, 3, 4, 2],
  [1, 0, 1, 2, 1, 1, 2, 1, 1, 1, 1, 2, 2, 4],
];
const MAITRI_SCORE = { ff: 5, fn: 4, nf: 4, nn: 3, fe: 1, ef: 1, ne: 0.5, en: 0.5, ee: 0 };
const GANA_IDX = { deva: 0, manushya: 1, rakshasa: 2 };
const GANA_TABLE = [
  [6, 6, 0],
  [5, 6, 0],
  [1, 0, 6],
];

function grahaMaitri(signA, signB) {
  const a = SIGN_LORDS[signA];
  const b = SIGN_LORDS[signB];
  if (a === b) return 5;
  return MAITRI_SCORE[RELATION[a][b] + RELATION[b][a]];
}
const taraGood = (from, to) => ![3, 5, 7].includes((((to - from + 27) % 27) + 1) % 9);

const person = (k) => {
  const moon = k.planets.find((p) => p.key === "moon");
  return { name: k.input.name, moonLon: moon.lon, moonSign: moon.sign, nakshatra: moon.nakshatra, pada: moon.pada, gana: gana(moon.nakshatra), nadi: nadi(moon.nakshatra), varna: varna(moon.sign), vashya: vashya(moon.lon), yoni: YONI[moon.nakshatra], manglik: k.doshas.find((d) => d.key === "manglik") };
};

/** @param kb boy's kundali (generateKundali), kg girl's */
export function matching(kb, kg) {
  const b = person(kb);
  const g = person(kg);
  const signDist = houseFrom(g.moonSign, b.moonSign);
  const kootas = [
    { key: "varna", max: 1, obtained: VARNA_RANK[b.varna] >= VARNA_RANK[g.varna] ? 1 : 0, boy: ["varna", b.varna], girl: ["varna", g.varna] },
    { key: "vashya", max: 2, obtained: VASHYA_TABLE[VASHYA_IDX[b.vashya]][VASHYA_IDX[g.vashya]], boy: ["vashya", b.vashya], girl: ["vashya", g.vashya] },
    { key: "tara", max: 3, obtained: (taraGood(g.nakshatra, b.nakshatra) ? 1.5 : 0) + (taraGood(b.nakshatra, g.nakshatra) ? 1.5 : 0), boy: ["nakshatra", b.nakshatra], girl: ["nakshatra", g.nakshatra] },
    { key: "yoni", max: 4, obtained: YONI_TABLE[b.yoni][g.yoni], boy: ["yoni", b.yoni], girl: ["yoni", g.yoni] },
    { key: "grahaMaitri", max: 5, obtained: grahaMaitri(b.moonSign, g.moonSign), boy: ["planet", SIGN_LORDS[b.moonSign]], girl: ["planet", SIGN_LORDS[g.moonSign]] },
    { key: "gana", max: 6, obtained: GANA_TABLE[GANA_IDX[b.gana]][GANA_IDX[g.gana]], boy: ["gana", b.gana], girl: ["gana", g.gana] },
    { key: "bhakoot", max: 7, obtained: [2, 12, 5, 9, 6, 8].includes(signDist) ? 0 : 7, boy: ["sign", b.moonSign], girl: ["sign", g.moonSign] },
    { key: "nadi", max: 8, obtained: b.nadi === g.nadi ? 0 : 8, boy: ["nadi", b.nadi], girl: ["nadi", g.nadi] },
  ];
  const total = kootas.reduce((s, k) => s + k.obtained, 0);

  const notes = [];
  if (b.nadi === g.nadi) {
    if (b.moonSign === g.moonSign && b.nakshatra !== g.nakshatra) notes.push("nadiSameSignDiffNak");
    else if (b.nakshatra === g.nakshatra && b.pada !== g.pada) notes.push("nadiSameNakDiffPada");
    else if (SIGN_LORDS[b.moonSign] === SIGN_LORDS[g.moonSign]) notes.push("nadiSameLord");
    else notes.push("nadiDosha");
  }
  if (kootas[6].obtained === 0) {
    const lb = SIGN_LORDS[b.moonSign];
    const lg = SIGN_LORDS[g.moonSign];
    if (lb === lg) notes.push("bhakootSameLord");
    else if (RELATION[lb][lg] === "f" && RELATION[lg][lb] === "f") notes.push("bhakootFriendlyLords");
    else notes.push("bhakootDosha");
  }
  if (kootas[5].obtained === 0) notes.push("ganaDosha");

  const mb = b.manglik.present && b.manglik.status !== "cancelled";
  const mg = g.manglik.present && g.manglik.status !== "cancelled";
  const manglik = { boy: b.manglik.status, girl: g.manglik.status, compatible: mb === mg, note: mb && mg ? "bothManglik" : mb || mg ? "oneManglik" : "noneManglik" };

  const verdict = total >= 28 ? "excellent" : total >= 22 ? "good" : total >= 18 ? "average" : "notRecommended";
  return { boy: b, girl: g, kootas, total, max: 36, verdict, notes, manglik };
}
