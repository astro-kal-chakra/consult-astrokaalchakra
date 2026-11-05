import { NAK, NAK_LORDS, SIGN_LORDS, elementOf, houseFrom, nakshatraOf, norm, padaOf, signOf } from "./core.js";
import { moonEvents, nextNewMoon, previousNewMoon, siderealLon, sunEvents } from "./ephemeris.js";
import { localParts, zonedToUtc } from "./time.js";

/** Karana (0-10: Bava … Vishti, Shakuni, Chatushpada, Naga, Kimstughna) from the half-tithi 0-59. */
export const karanaIndex = (k) => (k === 0 ? 10 : k >= 57 ? k - 50 : (k - 1) % 7);

const GANA_CODES = "DMRMDMDDRRMMDRDRDRRMMDRRMMD";
const GANA = { D: "deva", M: "manushya", R: "rakshasa" };
const NADI = ["adi", "madhya", "antya", "antya", "madhya", "adi"];
const VARNA = ["kshatriya", "vaishya", "shudra", "brahmin"]; // by the moon sign's element
// Yoni animal of each nakshatra: horse, elephant, sheep, serpent, dog, cat, rat, cow, buffalo, tiger, deer, monkey, mongoose, lion
export const YONI = [0, 1, 2, 3, 3, 4, 5, 2, 5, 6, 6, 7, 8, 9, 8, 9, 10, 10, 4, 11, 12, 11, 13, 0, 13, 7, 1];

export const gana = (nak) => GANA[GANA_CODES[nak]];
export const nadi = (nak) => NADI[nak % 6];
export const varna = (moonSign) => VARNA[elementOf(moonSign)];

/** Vashya group from the moon's sidereal longitude (Sagittarius / Capricorn split at 15°). */
export function vashya(lon) {
  const sign = signOf(lon);
  const firstHalf = norm(lon) % 30 < 15;
  if (sign === 8) return firstHalf ? "manava" : "chatushpada";
  if (sign === 9) return firstHalf ? "chatushpada" : "jalachara";
  return ["chatushpada", "chatushpada", "manava", "jalachara", "vanachara", "manava", "manava", "keeta", null, null, "manava", "jalachara"][sign];
}

/** Paya (by the Moon's house from the ascendant): gold, silver, copper, iron. */
function paya(moonHouse) {
  if ([1, 6, 11].includes(moonHouse)) return "gold";
  if ([2, 5, 9].includes(moonHouse)) return "silver";
  if ([3, 7, 10].includes(moonHouse)) return "copper";
  return "iron";
}

/** Amanta lunar month (0 = Chaitra) of an instant, with the Adhika (leap) flag. */
export function lunarMonth(ms) {
  const prev = previousNewMoon(ms);
  const next = nextNewMoon(ms + 1000);
  if (prev == null || next == null) return null;
  const s1 = signOf(siderealLon("sun", prev));
  const s2 = signOf(siderealLon("sun", next));
  return { index: (s1 + 1) % 12, adhika: s1 === s2 };
}

/**
 * Birth panchang and Avakhada chakra.
 * @param {number} ms birth instant (UTC ms)
 * @param {object} ctx { lat, lng, tz, date, asc (sidereal), planets (from planetPositions) }
 */
export function birthPanchang(ms, { lat, lng, tz, date, asc, planets }) {
  const sun = planets.sun.lon;
  const moon = planets.moon.lon;
  const elong = norm(moon - sun);
  const tithi = Math.floor(elong / 12);
  const yoga = Math.floor(norm(sun + moon) / NAK);
  const karana = karanaIndex(Math.floor(elong / 6));
  const nak = nakshatraOf(moon);
  const moonSign = signOf(moon);

  const midnight = zonedToUtc(date, "00:00", tz);
  const today = sunEvents(midnight, lat, lng);
  const moonToday = moonEvents(midnight, lat, lng);
  // Vedic day runs sunrise to sunrise
  let vaar = localParts(ms, tz).weekday;
  if (today.sunrise && ms < today.sunrise) vaar = (vaar + 6) % 7;
  const dayLen = today.sunrise && today.sunset ? today.sunset - today.sunrise : null;
  const isDay = today.sunrise && today.sunset ? ms >= today.sunrise && ms < today.sunset : null;

  const month = lunarMonth(ms);
  const p = localParts(ms, tz);
  // Vikram Samvat changes at Chaitra Shukla Pratipada; Shaka = Vikram − 135
  const vikram = p.year + (month && p.month <= 4 && month.index >= 10 ? 56 : 57);

  const ascSign = signOf(asc);
  const moonHouse = houseFrom(moonSign, ascSign);
  return {
    tithi,
    paksha: tithi < 15 ? "shukla" : "krishna",
    yoga,
    karana,
    nakshatra: nak,
    nakshatraPada: padaOf(moon),
    vaar,
    sunrise: today.sunrise,
    sunset: today.sunset,
    moonrise: moonToday.moonrise,
    moonset: moonToday.moonset,
    dayLength: dayLen,
    isDayBirth: isDay,
    lunarMonth: month,
    vikramSamvat: vikram,
    shakaSamvat: vikram - 135,
    avakhada: {
      ascendant: ascSign,
      ascendantLord: SIGN_LORDS[ascSign],
      sign: moonSign,
      signLord: SIGN_LORDS[moonSign],
      nakshatra: nak,
      pada: padaOf(moon),
      nakshatraLord: NAK_LORDS[nak % 9],
      varna: varna(moonSign),
      vashya: vashya(moon),
      yoni: YONI[nak],
      gana: gana(nak),
      nadi: nadi(nak),
      tatva: elementOf(moonSign),
      paya: paya(moonHouse),
      naamakshar: nak * 4 + padaOf(moon) - 1,
      sunSign: signOf(sun),
    },
  };
}
