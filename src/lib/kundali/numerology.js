/**
 * Numerology from the date of birth and name: Mulank (root), Bhagyank (destiny), name numbers (Chaldean, used in
 * Indian numerology, and Pythagorean), soul urge / personality, personal year, Kua and the Lo Shu grid.
 */

const reduce = (n) => {
  let x = Math.abs(Number(n) || 0);
  while (x > 9) x = String(x).split("").reduce((s, d) => s + Number(d), 0);
  return x;
};
const digitSum = (s) => String(s).replace(/\D/g, "").split("").reduce((a, d) => a + Number(d), 0);

const CHALDEAN = { a: 1, i: 1, j: 1, q: 1, y: 1, b: 2, k: 2, r: 2, c: 3, g: 3, l: 3, s: 3, d: 4, m: 4, t: 4, e: 5, h: 5, n: 5, x: 5, u: 6, v: 6, w: 6, o: 7, z: 7, f: 8, p: 8 };
const PYTHAGOREAN = Object.fromEntries("abcdefghijklmnopqrstuvwxyz".split("").map((c, i) => [c, (i % 9) + 1]));
const VOWELS = new Set(["a", "e", "i", "o", "u"]);

const nameSum = (name, table, filter = () => true) =>
  String(name || "")
    .toLowerCase()
    .split("")
    .filter((c) => table[c] && filter(c))
    .reduce((s, c) => s + table[c], 0);

/** Kua number (Chinese solar year starts about 4 February). */
function kua(year, month, day, gender) {
  const y = month < 2 || (month === 2 && day < 4) ? year - 1 : year;
  const s = reduce(digitSum(y));
  if (gender === "female") {
    let k = reduce(y >= 2000 ? s + 6 : s + 4);
    if (k === 5) k = 8;
    return k;
  }
  let k = y >= 2000 ? 9 - s : reduce(11 - s);
  if (k === 0) k = 9;
  if (k === 5) k = 2;
  return k;
}

/**
 * @param {{ name: string, date: string (YYYY-MM-DD), gender?: string }} input
 * @param {number} [now] for the personal year
 */
export function numerology({ name, date, gender }, now = Date.now()) {
  const [y, m, d] = date.split("-").map(Number);
  const mulank = reduce(d);
  const bhagyank = reduce(digitSum(date));
  const chaldeanTotal = nameSum(name, CHALDEAN);
  const pythTotal = nameSum(name, PYTHAGOREAN);
  const thisYear = new Date(now).getUTCFullYear();
  const personalYear = reduce(d + m + digitSum(thisYear));

  // Lo Shu: every non-zero digit of the date + mulank + bhagyank (+ kua when gender is known)
  const k = gender === "male" || gender === "female" ? kua(y, m, d, gender) : null;
  const digits = [...date.replace(/\D/g, "")].map(Number).filter((n) => n > 0);
  digits.push(mulank, bhagyank);
  if (k) digits.push(k);
  const counts = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [i + 1, 0]));
  digits.forEach((n) => counts[n]++);
  const LAYOUT = [
    [4, 9, 2],
    [3, 5, 7],
    [8, 1, 6],
  ];
  const PLANES = { mental: [4, 9, 2], emotional: [3, 5, 7], practical: [8, 1, 6], thought: [4, 3, 8], will: [9, 5, 1], action: [2, 7, 6], golden: [4, 5, 6], silver: [2, 5, 8] };
  const planes = Object.entries(PLANES)
    .filter(([, nums]) => nums.every((n) => counts[n] > 0))
    .map(([key]) => key);

  return {
    mulank,
    bhagyank,
    // Name numbers need the name in English letters (a name written only in Devanagari gives none)
    nameNumber: pythTotal ? { chaldean: reduce(chaldeanTotal), chaldeanTotal, pythagorean: reduce(pythTotal), pythagoreanTotal: pythTotal } : null,
    soulUrge: pythTotal ? reduce(nameSum(name, PYTHAGOREAN, (c) => VOWELS.has(c))) : null,
    personality: pythTotal ? reduce(nameSum(name, PYTHAGOREAN, (c) => !VOWELS.has(c))) : null,
    personalYear: { year: thisYear, number: personalYear },
    kua: k,
    loShu: { grid: LAYOUT.map((row) => row.map((n) => ({ n, count: counts[n] }))), missing: Object.keys(counts).map(Number).filter((n) => !counts[n]), repeated: Object.keys(counts).map(Number).filter((n) => counts[n] > 1), planes },
    friendly: { mulankBhagyank: harmony(mulank, bhagyank) },
  };
}

/** Rough harmony of two numbers by their ruling planets' natural friendship. */
const NUM_PLANET = { 1: "sun", 2: "moon", 3: "jupiter", 4: "rahu", 5: "mercury", 6: "venus", 7: "ketu", 8: "saturn", 9: "mars" };
const FRIENDS = { sun: ["moon", "mars", "jupiter"], moon: ["sun", "mercury"], mars: ["sun", "moon", "jupiter"], mercury: ["sun", "venus"], jupiter: ["sun", "moon", "mars"], venus: ["mercury", "saturn"], saturn: ["mercury", "venus"], rahu: ["venus", "saturn", "mercury"], ketu: ["mars", "jupiter"] };
function harmony(a, b) {
  if (a === b) return "same";
  const pa = NUM_PLANET[a];
  const pb = NUM_PLANET[b];
  return FRIENDS[pa].includes(pb) || FRIENDS[pb].includes(pa) ? "friendly" : "neutral";
}

export { NUM_PLANET };
