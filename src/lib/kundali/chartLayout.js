/**
 * Geometry of the North and South Indian charts on a unit square, shared by the page (SVG) and the PDF (pdfkit).
 * A chart model is { asc: sign 0-11, bySign: { [sign]: [{ key, retro }] } } (see chartOf in ./index.js).
 */

// North Indian: houses 1-12 as polygons, where to write the planets and the sign number
const P = { tl: [0, 0], tr: [1, 0], br: [1, 1], bl: [0, 1], t: [0.5, 0], r: [1, 0.5], b: [0.5, 1], l: [0, 0.5], c: [0.5, 0.5], a: [0.25, 0.25], d: [0.75, 0.25], e: [0.75, 0.75], f: [0.25, 0.75] };
export const NORTH_HOUSES = [
  { house: 1, poly: [P.t, P.d, P.c, P.a], text: [0.5, 0.21], num: [0.5, 0.43], w: 0.36 },
  { house: 2, poly: [P.tl, P.t, P.a], text: [0.25, 0.075], num: [0.25, 0.2], w: 0.3 },
  { house: 3, poly: [P.tl, P.a, P.l], text: [0.085, 0.25], num: [0.2, 0.25], w: 0.15 },
  { house: 4, poly: [P.l, P.a, P.c, P.f], text: [0.22, 0.5], num: [0.43, 0.5], w: 0.3 },
  { house: 5, poly: [P.l, P.f, P.bl], text: [0.085, 0.75], num: [0.2, 0.75], w: 0.15 },
  { house: 6, poly: [P.bl, P.f, P.b], text: [0.25, 0.925], num: [0.25, 0.8], w: 0.3 },
  { house: 7, poly: [P.b, P.f, P.c, P.e], text: [0.5, 0.79], num: [0.5, 0.57], w: 0.36 },
  { house: 8, poly: [P.b, P.e, P.br], text: [0.75, 0.925], num: [0.75, 0.8], w: 0.3 },
  { house: 9, poly: [P.br, P.e, P.r], text: [0.915, 0.75], num: [0.8, 0.75], w: 0.15 },
  { house: 10, poly: [P.r, P.e, P.c, P.d], text: [0.78, 0.5], num: [0.57, 0.5], w: 0.3 },
  { house: 11, poly: [P.r, P.d, P.tr], text: [0.915, 0.25], num: [0.8, 0.25], w: 0.15 },
  { house: 12, poly: [P.tr, P.d, P.t], text: [0.75, 0.075], num: [0.75, 0.2], w: 0.3 },
];
/** Lines of the North Indian frame: outer square, both diagonals, inner diamond. */
export const NORTH_LINES = [
  [P.tl, P.tr, P.br, P.bl, P.tl],
  [P.tl, P.br],
  [P.tr, P.bl],
  [P.t, P.r, P.b, P.l, P.t],
];

/** South Indian: fixed sign cells on a 4 × 4 grid (column, row), Pisces top-left. */
export const SOUTH_CELLS = [
  [1, 0], [2, 0], [3, 0], [3, 1], [3, 2], [3, 3], [2, 3], [1, 3], [0, 3], [0, 2], [0, 1], [0, 0],
].map(([c, r], sign) => ({ sign, col: c, row: r }));

/** Items (planet keys or "asc") in each house of a North chart / each sign of a South chart. */
export function northContent(chart, { showAsc = true } = {}) {
  return NORTH_HOUSES.map((h) => {
    const sign = (chart.asc + h.house - 1) % 12;
    const items = [...(chart.bySign[sign] || [])];
    if (showAsc && h.house === 1) items.unshift({ key: "asc" });
    return { ...h, sign, items };
  });
}

export function southContent(chart, { showAsc = true } = {}) {
  return SOUTH_CELLS.map((c) => {
    const items = [...(chart.bySign[c.sign] || [])];
    if (showAsc && c.sign === chart.asc) items.unshift({ key: "asc" });
    return { ...c, items, isAsc: c.sign === chart.asc };
  });
}

/** Short label of an item: "Su", "Ma(R)" … `d` = dictionary. */
export const itemLabel = (it, d) => `${d.planetsShort[it.key]}${it.retro ? `(${d.l.retroShort})` : ""}`;
