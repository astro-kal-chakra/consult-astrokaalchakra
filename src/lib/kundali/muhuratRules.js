/**
 * Muhurat rules (plain data, safe for the browser bundle). Nakshatra 0-26, weekday 0 = Sunday, sign 0-11,
 * tithi numbers 1-15 within a paksha (15 = Purnima), lunar month 0 = Chaitra.
 */

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const GOOD_TITHI = [2, 3, 5, 7, 10, 11, 13];
const WIDE_TITHI = [2, 3, 5, 6, 7, 10, 11, 12, 13];
const SHUBH_NAK = [0, 3, 4, 6, 7, 11, 12, 13, 14, 16, 20, 21, 22, 23, 25, 26]; // dhruva, mridu, kshipra, chara
const FIXED_DUAL = [1, 2, 4, 5, 7, 8, 10, 11];
const SEASON = ["kharmas", "chaturmas", "holashtak", "adhika", "asta"];

/**
 * nak: nakshatras; tithi: tithi numbers 1-15 of a paksha (15 = Purnima); krishnaMax: last Krishna tithi number
 * allowed; days: weekdays; lagna: rising signs allowed (null = any); dayOnly: sunrise to sunset only;
 * season: seasonal bars; months: lunar months allowed (0 = Chaitra).
 */
export const EVENTS = {
  vivah: { nak: [3, 4, 9, 11, 12, 14, 16, 18, 20, 25, 26], tithi: [...GOOD_TITHI, 15], krishnaMax: 13, days: ALL_DAYS, lagna: [1, 2, 3, 5, 6, 8, 11], season: SEASON },
  sagai: { nak: [3, 4, 9, 11, 12, 14, 16, 18, 20, 21, 22, 25, 26], tithi: [...GOOD_TITHI, 15], krishnaMax: 13, days: [0, 1, 3, 4, 5], lagna: null, dayOnly: true, season: SEASON },
  grihaPravesh: { nak: [3, 4, 11, 13, 16, 20, 22, 23, 25, 26], tithi: [...GOOD_TITHI, 15], krishnaMax: 10, days: [1, 3, 4, 5, 6], lagna: FIXED_DUAL, season: SEASON, months: [1, 2, 7, 8, 10, 11] },
  bhoomiPujan: { nak: [3, 4, 7, 11, 12, 13, 14, 16, 20, 21, 22, 23, 25, 26], tithi: WIDE_TITHI, krishnaMax: 10, days: [1, 3, 4, 5, 6], lagna: FIXED_DUAL, dayOnly: true, season: SEASON },
  property: { nak: [4, 6, 8, 9, 15, 18, 26], tithi: WIDE_TITHI, krishnaMax: 13, days: [1, 3, 4, 5], lagna: null, dayOnly: true, season: ["kharmas", "adhika"] },
  vehicle: { nak: [0, 3, 4, 6, 7, 11, 12, 13, 14, 16, 20, 21, 22, 23, 25, 26], tithi: WIDE_TITHI, krishnaMax: 13, days: [0, 1, 3, 4, 5], lagna: null, dayOnly: true, season: ["kharmas", "adhika"] },
  business: { nak: [0, 3, 4, 7, 11, 12, 13, 16, 20, 21, 22, 25, 26], tithi: WIDE_TITHI, krishnaMax: 10, days: [1, 3, 4, 5], lagna: FIXED_DUAL, dayOnly: true, season: ["kharmas", "adhika"] },
  mundan: { nak: [0, 4, 6, 7, 12, 13, 14, 17, 21, 22, 23, 26], tithi: GOOD_TITHI, krishnaMax: 10, days: [1, 3, 4, 5], lagna: null, dayOnly: true, season: SEASON },
  namkaran: { nak: SHUBH_NAK, tithi: [1, ...GOOD_TITHI], krishnaMax: 13, days: [0, 1, 3, 4, 5], lagna: null, dayOnly: true, season: [] },
  annaprashan: { nak: SHUBH_NAK, tithi: [2, 3, 5, 7, 10, 13], krishnaMax: 13, days: [1, 3, 4, 5], lagna: null, dayOnly: true, season: [] },
  upanayana: { nak: [0, 3, 4, 6, 7, 11, 12, 13, 14, 20, 21, 22, 23, 25, 26], tithi: [2, 3, 5, 10, 11, 12], krishnaMax: 5, days: [0, 1, 3, 4, 5], lagna: null, dayOnly: true, season: SEASON, sunSigns: [9, 10, 0, 1, 2] },
  vidyarambh: { nak: [0, 4, 6, 7, 10, 12, 13, 14, 18, 19, 21, 22, 23, 24, 26], tithi: [2, 3, 5, 6, 10, 11, 12], krishnaMax: 10, days: [0, 3, 4, 5], lagna: null, dayOnly: true, season: [] },
  travel: { nak: [0, 4, 6, 7, 12, 16, 21, 22, 26], tithi: GOOD_TITHI, krishnaMax: 13, days: ALL_DAYS, lagna: null, dayOnly: false, season: [] },
  shubh: { nak: SHUBH_NAK, tithi: [...WIDE_TITHI, 15], krishnaMax: 13, days: [1, 3, 4, 5], lagna: null, dayOnly: true, season: [] },
};
export const EVENT_KEYS = Object.keys(EVENTS);

/** Choghadiya cycle; the day starts at the weekday's slot and steps +1, the night starts 5 later and steps +5. */
export const CHOGHADIYA = ["udveg", "char", "labh", "amrit", "kaal", "shubh", "rog"];
export const CHOG_START = [0, 3, 6, 2, 5, 1, 4];
export const GOOD_CHOGHADIYA = ["amrit", "shubh", "labh", "char"];
