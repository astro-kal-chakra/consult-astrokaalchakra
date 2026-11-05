import "server-only";
import path from "node:path";
import PDFDocument from "pdfkit";
import { NORTH_HOUSES, NORTH_LINES, itemLabel, northContent, southContent } from "./chartLayout.js";
import { VARGAS } from "./vargas.js";
import { vimshottariSub } from "./dasha.js";
import { dict, fmtDate, fmtInputDate, fmtTime } from "./i18n.js";
import { coordsText, degShort, degText, houseList, limbName, placeText, planetList, rangeText, signDeg, spanOn, statusText, timeOn, tithiName, tzText } from "./text.js";
import { EVENTS, GOOD_CHOGHADIYA } from "./muhuratRules.js";

/**
 * Kundali / Kundali Milan PDF (A4) in English or Hindi. Fonts: Noto Sans + Noto Sans Devanagari (SIL OFL), shaped by
 * pdfkit's fontkit, so Hindi conjuncts and matras render correctly. Text is split into Devanagari / Latin runs so
 * symbols missing from one font (°, ·) come from the other.
 */

const FONT_DIR = path.join(process.cwd(), "assets", "fonts");
const C = { brand: "#c2410c", brandSoft: "#fff1e6", ink: "#1f1a17", muted: "#6b625c", line: "#e7ded6", head: "#faf5f0", good: "#15803d", bad: "#b91c1c", warn: "#b45309" };
const M = 40;
const W = 595.28;
const H = 841.89;
const CW = W - 2 * M;
const BOTTOM = H - 50;

const isDeva = (cp) => (cp >= 0x0900 && cp <= 0x097f) || (cp >= 0xa8e0 && cp <= 0xa8ff) || (cp >= 0x1cd0 && cp <= 0x1cff) || cp === 0x200c || cp === 0x200d;

/**
 * Splits text into runs [{ deva, text }]. Devanagari → Devanagari font; Latin letters and other non-ASCII (°, ·)
 * → Latin font; digits, spaces and ASCII punctuation follow the document language.
 */
function runs(text, hindi = false) {
  const out = [];
  for (const ch of String(text ?? "")) {
    const cp = ch.codePointAt(0);
    const letter = (cp >= 65 && cp <= 90) || (cp >= 97 && cp <= 122);
    const deva = ch === " " ? (out.length ? out[out.length - 1].deva : hindi) : letter ? false : cp < 0x80 ? hindi : isDeva(cp);
    if (out.length && out[out.length - 1].deva === deva) out[out.length - 1].text += ch;
    else out.push({ deva, text: ch });
  }
  return out;
}

class Writer {
  constructor(lang, meta) {
    this.lang = lang;
    this.d = dict(lang);
    this.doc = new PDFDocument({ size: "A4", margin: M, bufferPages: true, info: meta, autoFirstPage: true, font: path.join(FONT_DIR, "NotoSans-Regular.ttf") });
    this.doc.registerFont("R", path.join(FONT_DIR, "NotoSans-Regular.ttf"));
    this.doc.registerFont("B", path.join(FONT_DIR, "NotoSans-Bold.ttf"));
    this.doc.registerFont("DR", path.join(FONT_DIR, "NotoSansDevanagari-Regular.ttf"));
    this.doc.registerFont("DB", path.join(FONT_DIR, "NotoSansDevanagari-Bold.ttf"));
    this.y = M;
    this.cache = new Map();
  }

  font(deva, bold) {
    return deva ? (bold ? "DB" : "DR") : bold ? "B" : "R";
  }

  /** Widths of the runs of a string at 10 pt (cached; widths scale linearly with the font size). */
  measure(text, bold) {
    const key = `${bold ? 1 : 0}${text}`;
    let m = this.cache.get(key);
    if (!m) {
      m = runs(text, this.lang === "hi").map((r) => ({ ...r, w: this.doc.font(this.font(r.deva, bold)).fontSize(10).widthOfString(r.text) }));
      this.cache.set(key, m);
    }
    return m;
  }

  width(text, size, bold = false) {
    return (this.measure(String(text), bold).reduce((a, r) => a + r.w, 0) * size) / 10;
  }

  /** Single line, no wrapping; shrinks the font to fit `width` when given. */
  line(text, x, y, { size = 9, bold = false, color = C.ink, width, align = "left" } = {}) {
    const str = String(text ?? "");
    const parts = this.measure(str, bold);
    const w10 = parts.reduce((a, r) => a + r.w, 0);
    const s = width && w10 > 0 ? Math.max(5, Math.min(size, (10 * width) / w10)) : size;
    const w = (w10 * s) / 10;
    let cx = align === "center" && width ? x + (width - w) / 2 : align === "right" && width ? x + width - w : x;
    this.doc.fillColor(color);
    // Common alphabetic baseline, so runs in different fonts line up
    const base = y + s * 0.95;
    for (const r of parts) {
      this.doc.font(this.font(r.deva, bold)).fontSize(s).text(r.text, cx, base, { lineBreak: false, baseline: "alphabetic" });
      cx += (r.w * s) / 10;
    }
    return s;
  }

  /** Wrapped paragraph in the language's main font. Returns the height used. */
  para(text, x, y, width, { size = 9, bold = false, color = C.muted } = {}) {
    const deva = this.lang === "hi" || runs(text).some((r) => r.deva);
    const clean = deva ? String(text).replace(/°/g, "") : String(text);
    this.doc.font(this.font(deva, bold)).fontSize(size).fillColor(color);
    const h = this.doc.heightOfString(clean, { width, lineGap: 1.5 });
    this.doc.text(clean, x, y, { width, lineGap: 1.5 });
    return h;
  }

  ensure(h) {
    if (this.y + h > BOTTOM) this.newPage();
  }

  newPage() {
    this.doc.addPage();
    this.y = M;
  }

  title(text) {
    this.ensure(40);
    this.doc.save().rect(M, this.y, 3, 16).fill(C.brand).restore();
    this.line(text, M + 10, this.y + 1, { size: 13, bold: true, color: C.ink });
    this.y += 26;
  }

  sub(text) {
    this.ensure(24);
    this.line(text, M, this.y, { size: 10.5, bold: true, color: C.brand });
    this.y += 17;
  }

  /** Table with a header row. `cols`: widths (fractions of `width` or points). Breaks across pages, repeats header. */
  table(head, rows, { x = M, width = CW, cols, size = 8.5, rowH = 15 } = {}) {
    const n = head.length;
    const fr = cols || Array(n).fill(1 / n);
    const total = fr.reduce((a, b) => a + b, 0);
    const ws = fr.map((f) => (f / total) * width);
    const drawHead = () => {
      this.doc.save().rect(x, this.y, width, rowH).fill(C.head).restore();
      let cx = x;
      head.forEach((h, i) => {
        this.line(h, cx + 4, this.y + 3.5, { size: size - 0.5, bold: true, color: C.muted, width: ws[i] - 8 });
        cx += ws[i];
      });
      this.y += rowH;
    };
    this.ensure(rowH * 2);
    drawHead();
    rows.forEach((row, ri) => {
      if (this.y + rowH > BOTTOM) {
        this.newPage();
        drawHead();
      }
      if (ri % 2 === 1) this.doc.save().rect(x, this.y, width, rowH).fill("#fdfbf9").restore();
      let cx = x;
      row.forEach((cell, i) => {
        const bold = typeof cell === "object" && cell?.bold;
        const text = typeof cell === "object" && cell !== null ? cell.text : cell;
        this.line(String(text ?? "-"), cx + 4, this.y + 3.5, { size, bold, width: ws[i] - 8, color: typeof cell === "object" && cell?.color ? cell.color : C.ink });
        cx += ws[i];
      });
      this.doc.save().moveTo(x, this.y + rowH).lineTo(x + width, this.y + rowH).lineWidth(0.4).strokeColor(C.line).stroke().restore();
      this.y += rowH;
    });
    this.y += 10;
  }

  /** Two-column "label: value" grid. */
  pairs(items, { x = M, width = CW, colsN = 2, size = 9 } = {}) {
    const list = items.filter((i) => i && i[1] !== undefined && i[1] !== null && i[1] !== "");
    const colW = width / colsN;
    const rowsN = Math.ceil(list.length / colsN);
    this.ensure(rowsN * 15 + 6);
    list.forEach(([label, value], i) => {
      const c = i % colsN;
      const r = Math.floor(i / colsN);
      const cx = x + c * colW;
      const cy = this.y + r * 15;
      this.line(label, cx, cy, { size: size - 0.5, color: C.muted, width: colW * 0.45 - 6 });
      this.line(String(value), cx + colW * 0.45, cy, { size, bold: true, width: colW * 0.55 - 8 });
    });
    this.y += rowsN * 15 + 8;
  }

  /** North / South chart at (x, y) with side s. */
  chart(chart, x, y, s, { style = "north", title, fixedHouses = false } = {}) {
    const doc = this.doc;
    const d = this.d;
    doc.save().roundedRect(x, y, s, s, 4).fill("#fffaf5").restore();
    doc.save().lineWidth(0.9).strokeColor(C.brand);
    if (style === "south") {
      const cell = s / 4;
      for (const c of southContent(chart)) {
        doc.rect(x + c.col * cell, y + c.row * cell, cell, cell).stroke();
        if (c.isAsc) doc.moveTo(x + c.col * cell, y + c.row * cell + 10).lineTo(x + c.col * cell + 10, y + c.row * cell).stroke();
      }
      doc.restore();
      for (const c of southContent(chart)) {
        this.line(d.signsShort[c.sign], x + c.col * cell + 2, y + c.row * cell + 2, { size: 6, color: C.muted, width: cell - 4, align: "right" });
        this.items(c.items, x + c.col * cell + cell / 2, y + c.row * cell + cell / 2 + 3, cell - 6, s);
      }
      if (title) this.line(title, x + s / 4 + 6, y + s / 2 - 5, { size: Math.max(7, s / 22), bold: true, color: C.muted, width: s / 2 - 12, align: "center" });
      return;
    }
    for (const pts of NORTH_LINES) {
      doc.moveTo(x + pts[0][0] * s, y + pts[0][1] * s);
      for (const p of pts.slice(1)) doc.lineTo(x + p[0] * s, y + p[1] * s);
      doc.stroke();
    }
    doc.restore();
    for (const h of northContent(chart, { showAsc: !fixedHouses })) {
      this.line(String(fixedHouses ? h.house : h.sign + 1), x + h.num[0] * s - 8, y + h.num[1] * s - 4, { size: Math.max(5.5, s / 32), color: C.muted, width: 16, align: "center" });
      this.items(h.items, x + h.text[0] * s, y + h.text[1] * s, NORTH_HOUSES[h.house - 1].w * s, s);
    }
    if (title) this.line(title, x, y + s + 4, { size: Math.max(7.5, s / 24), bold: true, width: s, align: "center" });
  }

  items(items, cx, cy, w, s) {
    if (!items.length) return;
    const fs = Math.max(5.5, s / (items.length > 4 ? 26 : 22));
    const asc = items[0]?.key === "asc";
    const labels = items.filter((it) => it.key !== "asc").map((it) => itemLabel(it, this.d));
    const perLine = w > 0.25 * s ? 3 : w > 0.2 * s ? 2 : 1;
    const lines = asc ? [{ t: this.d.planetsShort.asc, c: C.brand }] : [];
    for (let i = 0; i < labels.length; i += perLine) lines.push({ t: labels.slice(i, i + perLine).join(" "), c: C.ink });
    const lh = fs * 1.25;
    const top = cy - (lines.length * lh) / 2;
    lines.forEach((ln, i) => this.line(ln.t, cx - w / 2, top + i * lh, { size: fs, bold: true, width: w, align: "center", color: ln.c }));
  }

  /** Charts in a grid, `perRow` per row, with titles. */
  chartGrid(list, { perRow = 2, style, max = 240 }) {
    const gap = 18;
    const s = Math.min(max, (CW - gap * (perRow - 1)) / perRow);
    const x0 = M + (CW - (s * perRow + gap * (perRow - 1))) / 2;
    for (let i = 0; i < list.length; i += perRow) {
      this.ensure(s + 30);
      list.slice(i, i + perRow).forEach((c, j) => this.chart(c.chart, x0 + j * (s + gap), this.y, s, { style, title: c.title, fixedHouses: c.fixedHouses }));
      this.y += s + 30;
    }
  }

  header(title, subtitle, by) {
    const doc = this.doc;
    doc.save().rect(0, 0, W, 86).fill(C.brandSoft).restore();
    doc.save().rect(0, 86, W, 2).fill(C.brand).restore();
    this.line("Astro Kaal Chakra", M, 20, { size: 10, bold: true, color: C.brand });
    this.line(title, M, 36, { size: 20, bold: true });
    this.line(subtitle, M, 64, { size: 9, color: C.muted, width: CW * 0.65 });
    if (by) this.line(by, M + CW * 0.6, 64, { size: 9, color: C.muted, width: CW * 0.4, align: "right" });
    this.y = 104;
  }

  footer() {
    const range = this.doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      this.doc.switchToPage(i);
      this.doc.save().moveTo(M, H - 34).lineTo(W - M, H - 34).lineWidth(0.4).strokeColor(C.line).stroke().restore();
      this.line("astrokaalchakra.com", M, H - 28, { size: 7.5, color: C.muted });
      this.line(`${this.d.l.page} ${i + 1} / ${range.count}`, M, H - 28, { size: 7.5, color: C.muted, width: CW, align: "right" });
    }
  }

  end() {
    return new Promise((resolve, reject) => {
      const chunks = [];
      this.doc.on("data", (c) => chunks.push(c));
      this.doc.on("end", () => resolve(Buffer.concat(chunks)));
      this.doc.on("error", reject);
      this.footer();
      this.doc.end();
    });
  }
}

const rOf = (p) => (p.retro && p.key !== "rahu" && p.key !== "ketu" ? " (R)" : "");
const listChart = (asc, planets) => {
  const c = { asc, bySign: {} };
  for (const p of planets) (c.bySign[p.sign] ||= []).push({ key: p.key, retro: p.retro && p.key !== "rahu" && p.key !== "ketu" });
  return c;
};

function birthBlock(w, k) {
  const { d, lang } = w;
  const l = d.l;
  const p = k.panchang;
  const tz = k.input.place.timezone;
  w.pairs([
    [l.name, k.input.name],
    [l.gender, d.gender[k.input.gender || ""]],
    [l.date, fmtInputDate(k.input.date, lang)],
    [l.time, k.input.time],
    [l.day, d.weekdays[p.vaar]],
    [l.place, placeText(k.input.place)],
    [l.latlng, coordsText(k.input.place)],
    [l.timezone, tzText(k)],
    [l.ayanamsa, `${l.lahiri} ${degText(k.calc.ayanamsa)}`],
    [`${l.sunrise} / ${l.sunset}`, `${fmtTime(p.sunrise, tz)} / ${fmtTime(p.sunset, tz)}`],
  ]);
}

function avakhadaBlock(w, k) {
  const d = w.d;
  const l = d.l;
  const a = k.panchang.avakhada;
  w.pairs([
    [l.ascendant, signDeg(k.asc.sign, k.asc.deg, d)],
    [l.ascLord, d.planets[a.ascendantLord]],
    [l.rashi, d.signs[a.sign]],
    [l.rashiLord, d.planets[a.signLord]],
    [l.nakshatra, `${d.nakshatras[a.nakshatra]} (${l.pada} ${a.pada})`],
    [l.nakLord, d.planets[a.nakshatraLord]],
    [l.sunSign, d.signs[a.sunSign]],
    [l.naamakshar, d.naamakshar[a.naamakshar]],
    [l.varna, d.varna[a.varna]],
    [l.vashya, d.vashya[a.vashya]],
    [l.yoni, d.yoni[a.yoni]],
    [l.gana, d.gana[a.gana]],
    [l.nadi, d.nadi[a.nadi]],
    [l.tatva, d.tatva[a.tatva]],
    [l.paya, d.paya[a.paya]],
  ]);
}

/** Full Janam Kundali PDF. `by`: "Prepared by …" line. */
export async function kundaliPdf(k, { lang = "en", style = "north", by } = {}) {
  const w = new Writer(lang, { Title: `${dict(lang).l.report} - ${k.input.name}`, Author: "Astro Kaal Chakra" });
  const { d } = w;
  const l = d.l;
  const tz = k.input.place.timezone;
  const now = k.calc.generatedAt;

  w.header(`${l.report}: ${k.input.name}`, `${fmtInputDate(k.input.date, lang)} · ${k.input.time} · ${placeText(k.input.place)}`, by ? `${l.preparedBy}: ${by}` : `${l.generatedOn}: ${fmtDate(now, lang)}`);

  w.title(l.birthDetails);
  birthBlock(w, k);
  w.title(l.avakhada);
  avakhadaBlock(w, k);
  w.title(l.panchang);
  const p = k.panchang;
  w.pairs([
    [l.tithi, tithiName(p.tithi, d)],
    [l.nakshatra, d.nakshatras[p.nakshatra]],
    [l.yoga, d.yogas[p.yoga]],
    [l.karana, d.karanas[p.karana]],
    [l.lunarMonth, p.lunarMonth ? `${p.lunarMonth.adhika ? `${l.adhika} ` : ""}${d.months[p.lunarMonth.index]}` : "-"],
    [l.vikram, p.vikramSamvat],
    [l.shaka, p.shakaSamvat],
    [`${l.moonrise} / ${l.moonset}`, `${fmtTime(p.moonrise, tz, false)} / ${fmtTime(p.moonset, tz, false)}`],
  ]);

  // Charts
  w.newPage();
  w.title(`${l.lagnaChart} · ${l.navamsaChart}`);
  w.chartGrid(
    [
      { chart: k.charts.d1, title: l.lagnaChart },
      { chart: k.charts.vargas[9], title: l.navamsaChart },
    ],
    { style },
  );
  w.title(d.ui.sections.planets);
  w.table(
    [l.planet, l.sign, l.degree, l.nakshatra, l.nakLord, l.house, l.dignity, l.status],
    [
      [d.planets.asc, d.signs[k.asc.sign], degText(k.asc.deg), `${d.nakshatras[k.asc.nakshatra]} ${k.asc.pada}`, d.planets[k.asc.nakLord], 1, "-", "-"],
      ...k.planets.map((x) => [
        d.planets[x.key],
        d.signs[x.sign],
        degText(x.deg),
        `${d.nakshatras[x.nakshatra]} ${x.pada}`,
        d.planets[x.nakLord],
        x.house,
        d.dignity[x.dignity],
        [x.retro && x.key !== "rahu" && x.key !== "ketu" ? l.retro : "", x.combust ? l.combust : ""].filter(Boolean).join(", ") || "-",
      ]),
    ],
    { cols: [1.1, 1.1, 1.1, 1.6, 1, 0.6, 1.2, 1.2] },
  );

  w.newPage();
  w.title(`${l.moonChart} · ${l.sunChart} · ${l.chalitChart}`);
  w.chartGrid(
    [
      { chart: k.charts.moon, title: l.moonChart },
      { chart: k.charts.sun, title: l.sunChart },
      { chart: k.charts.chalit, title: l.chalitChart },
      { chart: listChart(k.asc.sign, k.transit.planets), title: `${l.transitChart} (${fmtDate(k.transit.at, lang, tz)})` },
    ],
    { style, max: 200 },
  );
  w.title(l.chalitTable);
  w.table(
    [l.house, l.bhavaSandhi, l.bhavaMadhya, l.planet],
    k.chalit.madhya.map((m, i) => [i + 1, signDeg(Math.floor(k.chalit.sandhi[i] / 30), k.chalit.sandhi[i] % 30, d), signDeg(Math.floor(m / 30), m % 30, d), planetList(k.planets.filter((x) => x.chalitHouse === i + 1).map((x) => x.key), d)]),
    { cols: [0.5, 1.3, 1.3, 2] },
  );

  // Divisional charts, 3 per row
  w.newPage();
  w.title(d.ui.sections.vargas);
  w.chartGrid(
    VARGAS.map((n) => ({ chart: k.charts.vargas[n], title: `D${n} ${d.vargas[n][0]}` })),
    { perRow: 3, style },
  );
  w.title(d.ui.sections.vargas);
  const signIn = (chart, key) => Number(Object.entries(chart.bySign).find(([, items]) => items.some((i) => i.key === key))?.[0] ?? 0);
  w.table(
    [l.planet, ...VARGAS.map((n) => `D${n}`)],
    [[d.planets.asc, ...VARGAS.map((n) => d.signsShort[k.charts.vargas[n].asc])], ...k.planets.map((x) => [d.planets[x.key], ...VARGAS.map((n) => d.signsShort[signIn(k.charts.vargas[n], x.key)])])],
    { cols: [1.6, ...VARGAS.map(() => 1)], size: 7 },
  );

  // Dasha
  w.newPage();
  const v = k.dasha.vimshottari;
  w.title(l.vimshottari);
  w.line(`${l.balance}: ${d.planets[v.balance.lord]} ${v.balance.years.toFixed(2)} ${l.years}`, M, w.y, { size: 9, color: C.muted });
  w.y += 16;
  const boxW = (CW - 2 * 10) / 3;
  const boxH = 12 * 9 + 26;
  for (let i = 0; i < v.maha.length; i += 3) {
    w.ensure(boxH + 10);
    v.maha.slice(i, i + 3).forEach((m, j) => {
      const x = M + j * (boxW + 10);
      const y = w.y;
      const running = now >= m.start && now < m.end;
      w.doc.save().roundedRect(x, y, boxW, boxH, 4).lineWidth(running ? 1.2 : 0.6).strokeColor(running ? C.brand : C.line).stroke().restore();
      w.doc.save().rect(x + 0.5, y + 0.5, boxW - 1, 18).fill(C.head).restore();
      w.line(`${d.planets[m.lord]} · ${rangeText(m.start, m.end, lang, tz)}`, x + 6, y + 4.5, { size: 8, bold: true, width: boxW - 12 });
      m.sub.forEach((a, n) => {
        const cur = now >= a.start && now < a.end;
        w.line(d.planets[a.lord], x + 6, y + 24 + n * 12, { size: 7.5, bold: cur, color: cur ? C.brand : C.ink, width: boxW * 0.4 });
        w.line(fmtDate(a.end, lang, tz), x + boxW * 0.4, y + 24 + n * 12, { size: 7.5, bold: cur, color: cur ? C.brand : C.muted, width: boxW * 0.6 - 6, align: "right" });
      });
    });
    w.y += boxH + 10;
  }
  const curA = k.dasha.current[1];
  if (curA) {
    w.title(`${l.pratyantar}: ${d.planets[k.dasha.current[0].lord]} / ${d.planets[curA.lord]}`);
    w.table(
      [l.planet, l.start, l.end],
      vimshottariSub(curA.lord, curA.start, curA.end).map((x) => [d.planets[x.lord], fmtDate(x.start, lang, tz), fmtDate(x.end, lang, tz)]),
    );
  }
  const y = k.dasha.yogini;
  w.title(l.yoginiDasha);
  w.line(`${l.balance}: ${d.yogini[y.balance.key]} ${y.balance.years.toFixed(2)} ${l.years}`, M, w.y, { size: 9, color: C.muted });
  w.y += 16;
  w.table(
    [l.mahadasha, l.planet, l.start, l.end],
    y.maha.map((m) => [d.yogini[m.key], d.planets[m.lord], fmtDate(m.start, lang, tz), fmtDate(m.end, lang, tz)]),
  );

  // Ashtakavarga
  w.newPage();
  w.title(`${l.bav} / ${l.sav}`);
  const { bav, sav } = k.ashtakavarga;
  w.table(
    [l.sign, ...Object.keys(bav).map((x) => d.planetsShort[x]), l.sav],
    [...d.signs.map((s, i) => [s, ...Object.keys(bav).map((x) => bav[x][i]), { text: sav[i], bold: true }]), [{ text: l.total, bold: true }, ...Object.keys(bav).map((x) => ({ text: bav[x].reduce((a, b) => a + b, 0), bold: true })), { text: sav.reduce((a, b) => a + b, 0), bold: true }]],
    { cols: [1.6, 1, 1, 1, 1, 1, 1, 1, 1] },
  );
  const savChart = { asc: k.asc.sign, bySign: Object.fromEntries(sav.map((n, s) => [s, [{ key: `n${s}` }]])) };
  const saved = d.planetsShort;
  w.d = { ...d, planetsShort: { ...saved, ...Object.fromEntries(sav.map((n, s) => [`n${s}`, String(n)])) } };
  w.ensure(260);
  w.chart(savChart, M + (CW - 230) / 2, w.y, 230, { style, title: l.sav });
  w.d = d;
  w.y += 260;

  // Doshas and yogas
  w.newPage();
  w.title(l.doshas);
  for (const x of k.doshas) {
    w.ensure(50);
    w.line(d.doshas[x.key][0], M, w.y, { size: 10, bold: true });
    const st = statusText(x.status, d);
    const color = x.status === "none" ? C.good : x.status === "cancelled" ? C.warn : x.status === "low" || x.status === "partial" ? C.warn : C.bad;
    w.line(st, M, w.y, { size: 9, bold: true, color, width: CW, align: "right" });
    w.y += 14;
    let extra = d.doshas[x.key][1];
    if (x.key === "manglik" && x.present) extra += ` ${l.fromLagna}: ${x.fromLagna ? l.yes : l.no}, ${l.fromMoon}: ${x.fromMoon ? l.yes : l.no}, ${l.house}: ${x.marsHouse}.${x.cancellations.length ? ` ${l.reasons}: ${x.cancellations.map((r) => d.doshaReasons[r]).join("; ")}.` : ""}`;
    if (x.key === "kaalSarp" && (x.present || x.partial)) extra += ` ${d.kaalSarpTypes[x.type - 1]}, ${d.kaalSarpKind[x.direction]}.`;
    if (x.key === "pitra" && x.present) extra += ` ${x.rules.map((r) => d.doshaReasons[r]).join("; ")}.`;
    w.y += w.para(extra, M, w.y, CW) + 8;
  }
  w.title(l.yogasTitle);
  if (!k.yogas.length) w.y += w.para(l.noYogas, M, w.y, CW) + 8;
  for (const yg of k.yogas) {
    w.ensure(40);
    const who = yg.planets ? ` · ${planetList(yg.planets, d)}` : yg.planet ? ` · ${d.planets[yg.planet]}` : "";
    w.line(`${d.yogaText[yg.key][0]}${who}`, M, w.y, { size: 10, bold: true, width: CW });
    w.y += 14;
    w.y += w.para(d.yogaText[yg.key][1], M, w.y, CW) + 8;
  }

  // KP
  w.newPage();
  w.title(l.kpCusps);
  if (k.kp) {
    w.table([l.cusp, l.degree, l.signLord, l.starLord, l.subLord, l.subSubLord], k.kp.cusps.map((c) => [c.house, signDeg(Math.floor(c.lon / 30), c.lon % 30, d), d.planets[c.sign], d.planets[c.star], d.planets[c.sub], d.planets[c.subSub]]), { cols: [0.6, 1.6, 1, 1, 1, 1] });
    w.title(l.kpPlanets);
    w.table([l.planet, l.degree, l.house, l.signLord, l.starLord, l.subLord, l.subSubLord], k.kp.planets.map((x) => [d.planets[x.key], signDeg(Math.floor(x.lon / 30), x.lon % 30, d), x.house, d.planets[x.sign], d.planets[x.star], d.planets[x.sub], d.planets[x.subSub]]), { cols: [1, 1.6, 0.6, 1, 1, 1, 1] });
    w.title(l.kpSignificators);
    w.line(l.kpLevels, M, w.y, { size: 7.5, color: C.muted, width: CW });
    w.y += 14;
    w.table([l.planet, "A", "B", "C", "D"], k.kp.planets.map((x) => [d.planets[x.key], houseList(x.significators.a, d), houseList(x.significators.b, d), houseList(x.significators.c, d), houseList(x.significators.d, d)]));
  } else w.y += w.para(l.kpUnavailable, M, w.y, CW) + 8;

  // Transit and Sade Sati
  w.newPage();
  w.title(`${l.transitChart} (${fmtDate(k.transit.at, lang, tz)})`);
  w.table([l.planet, l.degree, l.fromLagna, l.fromMoon], k.transit.planets.map((x) => [d.planets[x.key] + rOf(x).replace("R", l.retroShort), signDeg(x.sign, x.lon % 30, d), x.house, x.fromMoon]));
  const s = k.sadeSati;
  w.title(`${l.sadeSati} · ${s.current ? `${l.sadeNow} (${l.phase[s.current.phase] || ""})` : l.sadeNotNow}`);
  w.table(
    [l.phase.rising, l.phase.peak, l.phase.setting],
    s.cycles.map((c) => ["rising", "peak", "setting"].map((ph) => c.phases.filter((x) => x.phase === ph).map((x) => rangeText(x.start, x.end, lang, tz)).join(", ") || "-")),
    { size: 7.5 },
  );
  w.title(`${l.dhaiya}${s.currentDhaiya ? ` · ${l.dhaiyaNow}` : ""}`);
  w.table([l.house, l.sign, l.start, l.end], s.dhaiya.map((x) => [x.house, d.signs[x.sign], fmtDate(x.start, lang, tz), fmtDate(x.end, lang, tz)]));

  // Varshphal
  const vp = k.varshphal;
  if (vp) {
    w.newPage();
    w.title(`${l.varshphal} ${vp.year}`);
    w.pairs([
      [l.varshAge, vp.age],
      [l.varshPravesh, `${fmtDate(vp.at, lang, tz)} ${fmtTime(vp.at, tz)}`],
      [l.ascendant, signDeg(vp.ascSign, vp.asc % 30, d)],
      [l.muntha, `${d.signs[vp.muntha]} (${l.house} ${vp.munthaHouse})`],
    ]);
    w.ensure(250);
    w.chart(listChart(vp.ascSign, vp.planets), M + (CW - 230) / 2, w.y, 230, { style, title: `${l.varshphal} ${vp.year}` });
    w.y += 256;
    w.table([l.planet, l.sign, l.degree, l.house], vp.planets.map((x) => [d.planets[x.key] + rOf(x).replace("R", l.retroShort), d.signs[x.sign], degShort(x.lon % 30), x.house]));
  }

  // Lal Kitab
  w.newPage();
  const lk = k.lalKitab;
  w.title(l.lkChart);
  const lkChart = { asc: 0, bySign: {} };
  for (const x of k.planets) (lkChart.bySign[x.house - 1] ||= []).push({ key: x.key });
  w.ensure(250);
  w.chart(lkChart, M, w.y, 220, { style: "north", fixedHouses: true });
  const tx = M + 240;
  const ty = w.y;
  w.table([l.planet, l.house, l.status, l.lkSleeping], lk.planets.map((x) => [d.planets[x.key], x.house, l.lkStatus[x.status], x.sleeping ? l.yes : l.no]), { x: tx, width: CW - 240, size: 8 });
  w.y = Math.max(w.y, ty + 236);
  w.line(`${l.lkSleepingHouses}: ${houseList(lk.houses.filter((h) => h.sleeping).map((h) => h.house), d)}`, M, w.y, { size: 9, width: CW });
  w.y += 18;
  w.y += w.para(l.lkNote, M, w.y, CW, { size: 8 }) + 8;
  w.title(l.lkDebts);
  const debts = lk.debts.filter((x) => x.present);
  if (!debts.length) w.y += w.para(l.lkNoDebts, M, w.y, CW) + 8;
  for (const x of debts) {
    w.ensure(44);
    w.line(`${d.lkDebts[x.key][0]} · ${planetList(x.planets, d)} (${l.house} ${x.houses.join(", ")})`, M, w.y, { size: 9.5, bold: true, width: CW });
    w.y += 14;
    w.y += w.para(d.lkDebts[x.key][1], M, w.y, CW) + 8;
  }
  w.title(l.lkRemedies);
  for (const key of lk.remedyPlanets) {
    w.ensure(40);
    w.line(d.planets[key], M, w.y, { size: 9.5, bold: true });
    w.y += 14;
    w.y += w.para(d.lkRemedies[key], M, w.y, CW) + 8;
  }

  // Numerology
  w.newPage();
  const n = k.numerology;
  w.title(d.ui.sections.numerology);
  w.pairs([
    [l.mulank, n.mulank],
    [l.bhagyank, n.bhagyank],
    [`${l.nameNumber} (${l.chaldean})`, n.nameNumber ? `${n.nameNumber.chaldean} (${n.nameNumber.chaldeanTotal})` : "-"],
    [`${l.nameNumber} (${l.pythagorean})`, n.nameNumber ? `${n.nameNumber.pythagorean} (${n.nameNumber.pythagoreanTotal})` : "-"],
    [l.soulUrge, n.soulUrge ?? "-"],
    [l.personality, n.personality ?? "-"],
    [`${l.personalYear} ${n.personalYear.year}`, n.personalYear.number],
    [l.kua, n.kua ?? "-"],
    [l.harmonyLabel, l.harmony[n.friendly.mulankBhagyank]],
  ]);
  w.sub(l.loShu);
  w.ensure(150);
  const cell = 44;
  const gx = M;
  const gy = w.y;
  n.loShu.grid.forEach((row, r) =>
    row.forEach((c, ci) => {
      w.doc.save().rect(gx + ci * cell, gy + r * cell, cell, cell).lineWidth(0.6).strokeColor(C.brand).stroke().restore();
      w.line(c.count ? String(c.n).repeat(c.count) : String(c.n), gx + ci * cell, gy + r * cell + cell / 2 - 7, { size: 12, bold: Boolean(c.count), color: c.count ? C.ink : "#cfc6bf", width: cell, align: "center" });
    }),
  );
  const ix = M + cell * 3 + 24;
  let iy = gy;
  for (const [label, value] of [
    [l.missing, n.loShu.missing.join(", ") || l.none],
    [l.repeated, n.loShu.repeated.join(", ") || l.none],
    [l.planes, n.loShu.planes.map((x) => l.planesNames[x]).join(", ") || l.none],
  ]) {
    w.line(label, ix, iy, { size: 8.5, color: C.muted });
    w.line(value, ix, iy + 12, { size: 9.5, bold: true, width: CW - (ix - M) });
    iy += 34;
  }
  w.y = gy + cell * 3 + 18;
  for (const [label, num] of [
    [l.mulank, n.mulank],
    [l.bhagyank, n.bhagyank],
  ]) {
    const info = d.numbers[num];
    w.sub(`${label}: ${num}`);
    w.pairs([
      [l.rulingPlanet, d.planets[info.planet]],
      [l.luckyDays, info.days],
      [l.luckyColours, info.colours],
      [l.gem, info.gem],
    ]);
    w.y += w.para(`${l.nature}: ${info.nature}`, M, w.y, CW) + 10;
  }

  w.ensure(40);
  w.y += 6;
  w.para(l.disclaimer, M, w.y, CW, { size: 7.5 });
  return w.end();
}

/** Kundali Milan PDF. */
export async function matchPdf({ boy, girl, match }, { lang = "en", style = "north", by } = {}) {
  const w = new Writer(lang, { Title: `${dict(lang).l.matchReport} - ${boy.input.name} & ${girl.input.name}`, Author: "Astro Kaal Chakra" });
  const { d } = w;
  const l = d.l;
  const m = match;
  w.header(l.matchReport, `${boy.input.name} & ${girl.input.name}`, by ? `${l.preparedBy}: ${by}` : `${l.generatedOn}: ${fmtDate(boy.calc.generatedAt, lang)}`);

  // Score
  w.ensure(70);
  w.doc.save().roundedRect(M, w.y, CW, 58, 6).fill(C.brandSoft).restore();
  w.line(`${m.total} / ${m.max}`, M + 16, w.y + 12, { size: 24, bold: true, color: C.brand });
  w.line(l.gunaTotal, M + 150, w.y + 12, { size: 9, color: C.muted });
  w.line(d.verdict[m.verdict], M + 150, w.y + 28, { size: 13, bold: true, color: m.total >= 18 ? C.good : C.bad, width: CW - 170 });
  w.y += 72;

  const val = ([type, v]) => ({ varna: d.varna[v], vashya: d.vashya[v], nakshatra: d.nakshatras[v], yoni: d.yoni[v], planet: d.planets[v], gana: d.gana[v], sign: d.signs[v], nadi: d.nadi[v] })[type];
  w.title(l.gunaTotal);
  w.table(
    [l.koota, l.boy, l.girl, l.maxPoints, l.obtained],
    [...m.kootas.map((x) => [d.koota[x.key][0], val(x.boy), val(x.girl), x.max, { text: x.obtained, bold: true }]), [{ text: l.total, bold: true }, "", "", 36, { text: m.total, bold: true }]],
    { cols: [1.3, 1.4, 1.4, 0.7, 0.7] },
  );
  for (const x of m.kootas) {
    w.ensure(14);
    w.line(`${d.koota[x.key][0]}: ${d.koota[x.key][1]}`, M, w.y, { size: 8, color: C.muted, width: CW });
    w.y += 12;
  }
  w.y += 6;
  w.title(l.manglikMatch);
  w.pairs([
    [`${l.boy}: ${boy.input.name}`, statusText(m.manglik.boy, d)],
    [`${l.girl}: ${girl.input.name}`, statusText(m.manglik.girl, d)],
  ]);
  w.y += w.para(d.manglikNote[m.manglik.note], M, w.y, CW) + 8;
  if (m.notes.length) {
    w.title(l.notesTitle);
    for (const note of m.notes) w.y += w.para(`• ${d.matchNotes[note]}`, M, w.y, CW) + 4;
    w.y += 6;
  }

  for (const [who, k] of [
    [l.boy, boy],
    [l.girl, girl],
  ]) {
    w.newPage();
    w.title(`${who}: ${k.input.name}`);
    birthBlock(w, k);
    w.sub(l.avakhada);
    avakhadaBlock(w, k);
    w.chartGrid(
      [
        { chart: k.charts.d1, title: l.lagnaChart },
        { chart: k.charts.moon, title: l.moonChart },
      ],
      { style },
    );
  }
  w.ensure(40);
  w.para(l.disclaimer, M, w.y, CW, { size: 7.5 });
  return w.end();
}

// ------------------------------------------------------------------ muhurat and panchang

const byLine = (l, by, now, lang) => (by ? `${l.preparedBy}: ${by}` : `${l.generatedOn}: ${fmtDate(now, lang)}`);
const personText = (p, d) => [p.rashi != null ? d.signs[p.rashi] : null, p.nakshatra != null ? d.nakshatras[p.nakshatra] : null].filter(Boolean).join(", ");

/** Shubh Muhurat list PDF. `r`: cleanMuhurat() query + findMuhurat() result. */
export async function muhuratPdf(r, { lang = "en", by } = {}) {
  const w = new Writer(lang, { Title: `${dict(lang).mu.finder} - ${dict(lang).mu.events[r.event]}`, Author: "Astro Kaal Chakra" });
  const { d } = w;
  const { l, mu } = d;
  const tz = r.place.timezone;
  w.header(`${mu.finder}: ${mu.events[r.event]}`, `${fmtInputDate(r.from, lang)} - ${fmtInputDate(r.to, lang)} · ${placeText(r.place)}`, byLine(l, by, Date.now(), lang));

  w.pairs([
    [mu.event, mu.events[r.event]],
    [`${mu.from} / ${mu.to}`, `${fmtInputDate(r.from, lang)} - ${fmtInputDate(r.to, lang)}`],
    [mu.place, placeText(r.place)],
    [l.latlng, coordsText(r.place)],
    ...r.persons.map((p, i) => [i ? mu.person2 : mu.person1, personText(p, d)]),
  ]);
  w.y += w.para(mu.checked, M, w.y, CW, { size: 8 }) + 8;

  if (r.blocked.length) {
    w.title(mu.blocked);
    w.table(
      [mu.blocked, `${mu.from} - ${mu.to}`],
      r.blocked.map((b) => [mu.bars[b.reason], b.to !== b.from ? `${fmtInputDate(b.from, lang)} - ${fmtInputDate(b.to, lang)}` : fmtInputDate(b.from, lang)]),
      { cols: [1.6, 1] },
    );
  }

  w.title(`${mu.finder} (${mu.found.replace("{n}", r.days.length)})`);
  if (!r.days.length) w.y += w.para(mu.none, M, w.y, CW) + 8;
  else {
    const lagna = Boolean(EVENTS[r.event].lagna);
    const head = [mu.date, `${mu.start} - ${mu.end}`, l.nakshatra, l.tithi, ...(lagna ? [mu.lagna] : []), mu.special];
    const rows = r.days.flatMap((x) =>
      x.windows.map((win, i) => [
        i ? "" : { text: `${fmtInputDate(x.date, lang)}, ${d.weekdays[x.weekday]}`, bold: true },
        { text: spanOn(win, x.date, tz, lang), bold: true, color: C.brand },
        win.nakshatra.map((n) => d.nakshatras[n]).join(", "),
        win.tithi.map((t) => limbName("tithi", t, d)).join(", "),
        ...(lagna ? [win.lagna.map((s) => d.signs[s]).join(", ")] : []),
        i ? "" : x.special.map((s) => mu.specials[s]).join(", "),
      ]),
    );
    w.table(head, rows, { cols: lagna ? [1.3, 1.5, 1, 1.15, 1.05, 1.3] : [1.35, 1.55, 1.15, 1.35, 1.5], size: 8 });
  }
  w.ensure(40);
  w.para(mu.disclaimer, M, w.y, CW, { size: 7.5 });
  return w.end();
}

/** Day panchang PDF. `p`: dayPanchang() result with `place`. */
export async function panchangPdf(p, { lang = "en", by } = {}) {
  const w = new Writer(lang, { Title: `${dict(lang).mu.day} - ${p.date}`, Author: "Astro Kaal Chakra" });
  const { d } = w;
  const { l, mu } = d;
  const tz = p.place.timezone;
  const at = (ms) => timeOn(ms, p.date, tz, lang);
  const span = (iv) => spanOn(iv, p.date, tz, lang);
  w.header(`${mu.day}: ${fmtInputDate(p.date, lang)}`, `${d.weekdays[p.weekday]} · ${placeText(p.place)}`, byLine(l, by, Date.now(), lang));

  w.title(mu.panchang);
  const limbs = [
    ["tithi", l.tithi],
    ["nakshatra", l.nakshatra],
    ["yoga", l.yoga],
    ["karana", l.karana],
    ["moonSign", mu.moonSign],
  ];
  w.table(
    [mu.panchang, "", mu.end],
    limbs.flatMap(([key, label]) => p[key].map((x, i) => [i ? "" : { text: label, bold: true }, limbName(key, x.value, d), x.end ? at(x.end) : "-"])),
    { cols: [1, 1.4, 1.4] },
  );
  w.pairs([
    [l.day, d.weekdays[p.weekday]],
    [l.sunSign, d.signs[p.sunSign]],
    [l.lunarMonth, p.lunarMonth ? `${p.lunarMonth.adhika ? `${l.adhika} ` : ""}${d.months[p.lunarMonth.index]}` : "-"],
    [`${l.vikram} / ${l.shaka}`, `${p.vikramSamvat} / ${p.shakaSamvat}`],
    [`${l.sunrise} / ${l.sunset}`, `${at(p.sunrise)} / ${at(p.sunset)}`],
    [`${l.moonrise} / ${l.moonset}`, `${at(p.moonrise)} / ${at(p.moonset)}`],
    [mu.dishaShool, mu.directions[p.dishaShool]],
    [l.latlng, coordsText(p.place)],
  ]);

  const good = [[mu.brahma, span(p.brahma)], [p.abhijit.wednesday ? `${mu.abhijit} (${mu.abhijitWed})` : mu.abhijit, span(p.abhijit)], ...p.special.map((s) => [mu.specials[s.key], span(s)])];
  w.title(mu.goodTimes);
  w.table([mu.goodTimes, `${mu.start} - ${mu.end}`], good.map(([a, b]) => [{ text: a, color: C.good }, b]), { cols: [1.4, 1.6] });

  const bad = [[mu.rahuKaal, span(p.rahuKaal)], [mu.yamaganda, span(p.yamaganda)], [mu.gulika, span(p.gulika)], ...p.bhadra.map((b) => [mu.bhadra, span(b)]), ...p.panchaka.map((b) => [mu.panchaka, span(b)]), ...p.bars.map((b) => [mu.seasonal, mu.bars[b]])];
  w.title(mu.badTimes);
  w.table([mu.badTimes, `${mu.start} - ${mu.end}`], bad.map(([a, b]) => [{ text: a, color: C.bad }, b]), { cols: [1.4, 1.6] });

  w.title(mu.choghadiya);
  const mark = (c) => ({ text: mu.chog[c.key], bold: true, color: GOOD_CHOGHADIYA.includes(c.key) ? C.good : C.bad });
  w.table(
    [mu.dayChog, `${mu.start} - ${mu.end}`, mu.nightChog, `${mu.start} - ${mu.end}`],
    p.choghadiya.day.map((c, i) => [mark(c), span(c), mark(p.choghadiya.night[i]), span(p.choghadiya.night[i])]),
    { cols: [0.8, 1.4, 0.8, 1.4] },
  );

  w.title(mu.lagnaTable);
  w.table([mu.lagna, mu.start, mu.end], p.lagnas.map((x) => [d.signs[x.sign], at(x.start), at(x.end)]), { cols: [1, 1.2, 1.2] });
  w.ensure(40);
  w.para(mu.disclaimer, M, w.y, CW, { size: 7.5 });
  return w.end();
}
