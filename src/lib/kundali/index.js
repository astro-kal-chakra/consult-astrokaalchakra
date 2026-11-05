import { NAK_LORDS, PLANETS, SIGN_LORDS, baladiAvastha, degInSign, dignity, houseFrom, isCombust, nakshatraOf, padaOf, signOf } from "./core.js";
import { angles, houseOfLon, placidus, planetPositions, sripati } from "./ephemeris.js";
import { VARGAS, vargaSign } from "./vargas.js";
import { runningVimshottari, vimshottari, yogini } from "./dasha.js";
import { birthPanchang } from "./panchang.js";
import { ashtakavarga } from "./ashtakavarga.js";
import { doshas, yogas } from "./yogas.js";
import { kp, kpLords } from "./kp.js";
import { sadeSati, transit, varshphal } from "./transit.js";
import { lalKitab } from "./lalkitab.js";
import { numerology } from "./numerology.js";
import { matching } from "./matching.js";
import { isValidTimeZone, localParts, tzOffsetMin, zonedToUtc } from "./time.js";

export { matching };

/**
 * Validates birth details. Returns the cleaned input or throws Error(code) with code one of
 * NAME, DATE, TIME, PLACE, COORDS, TZ.
 *   { name, gender: "male" | "female" | "", date: "YYYY-MM-DD", time: "HH:MM[:SS]",
 *     place: { name, region?, lat, lng, timezone } }
 */
export function cleanInput(raw) {
  const name = String(raw?.name || "").trim().replace(/\s+/g, " ").slice(0, 80);
  if (!name) throw new Error("NAME");
  const date = String(raw?.date || "");
  const m = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const y = m ? Number(m[1]) : 0;
  if (!m || y < 1800 || y > 2200 || Number.isNaN(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) throw new Error("DATE");
  const time = String(raw?.time || "");
  if (!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(time)) throw new Error("TIME");
  const p = raw?.place || {};
  const lat = Number(p.lat);
  const lng = Number(p.lng);
  if (!String(p.name || "").trim()) throw new Error("PLACE");
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 89.9 || Math.abs(lng) > 180) throw new Error("COORDS");
  const timezone = String(p.timezone || "Asia/Kolkata");
  if (!isValidTimeZone(timezone)) throw new Error("TZ");
  const gender = raw?.gender === "male" || raw?.gender === "female" ? raw.gender : "";
  return { name, gender, date, time, place: { name: String(p.name).trim().slice(0, 120), region: String(p.region || "").trim().slice(0, 120), lat, lng, timezone } };
}

/** { asc, bySign: { 0: ["sun", …] } } — what chart drawings need. */
export function chartOf(ascSign, signs, retro = {}) {
  const bySign = {};
  for (const [key, s] of Object.entries(signs)) (bySign[s] ||= []).push({ key, retro: Boolean(retro[key]) && key !== "rahu" && key !== "ketu" });
  return { asc: ascSign, bySign };
}

/**
 * The complete kundali for one person. Pure function of the input (plus `now` for transits, Sade Sati status and
 * the Varshphal year).
 * @param raw birth details (see cleanInput)
 * @param {{ node?: "mean" | "true", now?: number, varshYear?: number }} [opts]
 */
export function generateKundali(raw, { node = "mean", now = Date.now(), varshYear } = {}) {
  const input = cleanInput(raw);
  const { lat, lng, timezone: tz } = input.place;
  const ms = zonedToUtc(input.date, input.time, tz);
  const pos = planetPositions(ms, { node });
  const ang = angles(ms, lat, lng);
  const ascSign = signOf(ang.asc);
  const chalit = sripati(ms, lat, lng);
  const cusps = placidus(ms, lat, lng);

  const planets = PLANETS.map((key) => {
    const { lon, speed, retro } = pos[key];
    const sign = signOf(lon);
    const nak = nakshatraOf(lon);
    return {
      key,
      lon,
      sign,
      deg: degInSign(lon),
      speed,
      retro,
      nakshatra: nak,
      pada: padaOf(lon),
      nakLord: NAK_LORDS[nak % 9],
      signLord: SIGN_LORDS[sign],
      house: houseFrom(sign, ascSign),
      chalitHouse: houseOfLon(lon, chalit.sandhi),
      combust: key !== "sun" && isCombust(key, lon, pos.sun.lon, retro),
      dignity: dignity(key, lon),
      avastha: baladiAvastha(lon),
      kp: kpLords(lon),
    };
  });
  const P = Object.fromEntries(planets.map((p) => [p.key, p]));
  const signs = Object.fromEntries(planets.map((p) => [p.key, p.sign]));
  const retro = Object.fromEntries(planets.map((p) => [p.key, p.retro]));

  const vargas = {};
  for (const n of VARGAS) {
    const s = Object.fromEntries(planets.map((p) => [p.key, vargaSign(n, p.lon)]));
    vargas[n] = chartOf(vargaSign(n, ang.asc), s, retro);
  }
  const chalitSigns = {};
  // Bhava chalit drawn as houses: planet in bhava h is shown in the sign that holds house h of the D1 chart
  for (const p of planets) chalitSigns[p.key] = (ascSign + p.chalitHouse - 1) % 12;

  const vim = vimshottari(P.moon.lon, ms);
  const local = localParts(ms, tz);
  const panchang = birthPanchang(ms, { lat, lng, tz, date: input.date, asc: ang.asc, planets: pos });
  const year = varshYear || new Date(now).getUTCFullYear();

  return {
    version: 1,
    input,
    calc: { birthUtc: ms, offsetMin: tzOffsetMin(ms, tz), ayanamsa: ang.trueAyanamsa, ayanamsaName: "lahiri", node, houseSystem: "wholeSign", generatedAt: now },
    asc: { lon: ang.asc, sign: ascSign, deg: degInSign(ang.asc), nakshatra: nakshatraOf(ang.asc), pada: padaOf(ang.asc), lord: SIGN_LORDS[ascSign], nakLord: NAK_LORDS[nakshatraOf(ang.asc) % 9], kp: kpLords(ang.asc) },
    mc: { lon: ang.mc, sign: signOf(ang.mc), deg: degInSign(ang.mc) },
    planets,
    panchang,
    charts: {
      d1: vargas[1],
      moon: chartOf(P.moon.sign, signs, retro),
      sun: chartOf(P.sun.sign, signs, retro),
      chalit: chartOf(ascSign, chalitSigns, retro),
      vargas,
    },
    chalit: { madhya: chalit.madhya, sandhi: chalit.sandhi },
    dasha: { vimshottari: vim, yogini: yogini(P.moon.lon, ms), current: runningVimshottari(vim, now).map((p) => ({ lord: p.lord, start: p.start, end: p.end })) },
    ashtakavarga: ashtakavarga({ ...signs, asc: ascSign }),
    doshas: doshas(P, ascSign),
    yogas: yogas(P, ascSign),
    kp: cusps ? kp(cusps, Object.fromEntries(planets.map((p) => [p.key, { lon: p.lon }]))) : null,
    sadeSati: sadeSati(ms, P.moon.sign, now),
    transit: transit(now, ascSign, P.moon.sign, node),
    varshphal: varshphal({ natalSunLon: P.sun.lon, natalAscSign: ascSign, birthYear: local.year, birthMonthDay: input.date.slice(5), year: Math.max(year, local.year + 1), lat, lng, tz, node }),
    lalKitab: lalKitab(planets),
    numerology: numerology({ name: input.name, date: input.date, gender: input.gender }, now),
  };
}
