"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge, Card, CardHeader, InfoList, Select } from "@/components/ui";
import { cn } from "@/lib/cn";
import { KundaliChart } from "./KundaliChart";
import { VARGAS } from "@/lib/kundali/vargas";
import { vimshottariSub } from "@/lib/kundali/dasha";
import { fmtDate, fmtTime, fmtInputDate } from "@/lib/kundali/i18n";
import { coordsText, degShort, degText, houseList, placeText, planetList, rangeText, signDeg, statusText, tithiName, tzText } from "@/lib/kundali/text";

/** One table. `head`: header cells, `rows`: arrays of cells. */
export function T({ head, rows, className, dense = false }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full min-w-max text-left text-sm">
        <thead>
          <tr className="border-b border-line bg-surface-muted/60 text-xs text-muted">
            {head.map((h, i) => (
              <th key={i} className={cn("px-3 font-medium whitespace-nowrap", dense ? "py-1.5" : "py-2")}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className={cn("px-3 whitespace-nowrap tabular-nums", dense ? "py-1.5" : "py-2")}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const Box = ({ title, description, action, children, className, flush }) => (
  <Card className={className}>
    {title && <CardHeader title={title} description={description} action={action} />}
    <div className={flush ? "" : "p-5"}>{children}</div>
  </Card>
);

const ChartGrid = ({ children }) => <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">{children}</div>;

// ------------------------------------------------------------------ overview

export function Overview({ k, d, lang }) {
  const l = d.l;
  const tz = k.input.place.timezone;
  const p = k.panchang;
  const a = p.avakhada;
  const cur = k.dasha.current;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Box title={l.birthDetails}>
        <InfoList
          items={[
            { label: l.name, value: k.input.name },
            { label: l.gender, value: d.gender[k.input.gender || ""] },
            { label: l.date, value: fmtInputDate(k.input.date, lang) },
            { label: l.time, value: k.input.time },
            { label: l.day, value: d.weekdays[p.vaar] },
            { label: l.place, value: placeText(k.input.place) },
            { label: l.latlng, value: coordsText(k.input.place) },
            { label: l.timezone, value: tzText(k) },
            { label: l.ayanamsa, value: `${l.lahiri} ${degText(k.calc.ayanamsa)}` },
            { label: `${l.sunrise} / ${l.sunset}`, value: `${fmtTime(p.sunrise, tz)} / ${fmtTime(p.sunset, tz)}` },
          ]}
        />
      </Box>
      <Box title={l.avakhada}>
        <InfoList
          items={[
            { label: l.ascendant, value: signDeg(k.asc.sign, k.asc.deg, d) },
            { label: l.ascLord, value: d.planets[a.ascendantLord] },
            { label: l.rashi, value: d.signs[a.sign] },
            { label: l.rashiLord, value: d.planets[a.signLord] },
            { label: l.nakshatra, value: `${d.nakshatras[a.nakshatra]} (${l.pada} ${a.pada})` },
            { label: l.nakLord, value: d.planets[a.nakshatraLord] },
            { label: l.sunSign, value: d.signs[a.sunSign] },
            { label: l.naamakshar, value: d.naamakshar[a.naamakshar] },
            { label: l.varna, value: d.varna[a.varna] },
            { label: l.vashya, value: d.vashya[a.vashya] },
            { label: l.yoni, value: d.yoni[a.yoni] },
            { label: l.gana, value: d.gana[a.gana] },
            { label: l.nadi, value: d.nadi[a.nadi] },
            { label: l.tatva, value: d.tatva[a.tatva] },
            { label: l.paya, value: d.paya[a.paya] },
          ]}
        />
      </Box>
      <Box title={l.panchang}>
        <InfoList
          items={[
            { label: l.tithi, value: tithiName(p.tithi, d) },
            { label: l.nakshatra, value: d.nakshatras[p.nakshatra] },
            { label: l.yoga, value: d.yogas[p.yoga] },
            { label: l.karana, value: d.karanas[p.karana] },
            { label: l.day, value: d.weekdays[p.vaar] },
            { label: l.lunarMonth, value: p.lunarMonth ? `${p.lunarMonth.adhika ? `${l.adhika} ` : ""}${d.months[p.lunarMonth.index]}` : "-" },
            { label: l.vikram, value: p.vikramSamvat },
            { label: l.shaka, value: p.shakaSamvat },
            { label: `${l.moonrise} / ${l.moonset}`, value: `${fmtTime(p.moonrise, tz, false)} / ${fmtTime(p.moonset, tz, false)}` },
          ]}
        />
      </Box>
      <Box title={l.current} description={l.vimshottari}>
        <ul className="space-y-2 text-sm">
          {cur.map((c, i) => (
            <li key={i} className="flex flex-wrap items-center justify-between gap-2">
              <span>
                <span className="text-muted">{[l.mahadasha, l.antardasha, l.pratyantar, l.sookshma][i]}: </span>
                <span className="font-medium">{d.planets[c.lord]}</span>
              </span>
              <span className="text-xs text-muted tabular-nums">{rangeText(c.start, c.end, lang, tz)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <KundaliChart chart={k.charts.d1} d={d} title={l.lagnaChart} />
          <KundaliChart chart={k.charts.vargas[9]} d={d} title={l.navamsaChart} />
        </div>
      </Box>
    </div>
  );
}

// ------------------------------------------------------------------ charts

export function Charts({ k, d, style }) {
  const l = d.l;
  const transit = { asc: k.asc.sign, bySign: {} };
  for (const p of k.transit.planets) (transit.bySign[p.sign] ||= []).push({ key: p.key, retro: p.retro && p.key !== "rahu" && p.key !== "ketu" });
  return (
    <div className="space-y-6">
      <Box>
        <ChartGrid>
          <KundaliChart chart={k.charts.d1} d={d} style={style} title={l.lagnaChart} />
          <KundaliChart chart={k.charts.vargas[9]} d={d} style={style} title={l.navamsaChart} />
          <KundaliChart chart={k.charts.moon} d={d} style={style} title={l.moonChart} />
          <KundaliChart chart={k.charts.sun} d={d} style={style} title={l.sunChart} />
          <KundaliChart chart={k.charts.chalit} d={d} style={style} title={l.chalitChart} />
          <KundaliChart chart={transit} d={d} style={style} title={l.transitChart} />
        </ChartGrid>
      </Box>
      <Box title={l.chalitTable} flush>
        <T
          head={[l.house, l.bhavaSandhi, l.bhavaMadhya, l.planet]}
          rows={k.chalit.madhya.map((m, i) => [
            i + 1,
            signDeg(Math.floor(k.chalit.sandhi[i] / 30), k.chalit.sandhi[i] % 30, d),
            signDeg(Math.floor(m / 30), m % 30, d),
            planetList(
              k.planets.filter((p) => p.chalitHouse === i + 1).map((p) => p.key),
              d,
            ),
          ])}
        />
      </Box>
    </div>
  );
}

// ------------------------------------------------------------------ planets

export function Planets({ k, d }) {
  const l = d.l;
  const rows = [
    [d.planets.asc, d.signs[k.asc.sign], degText(k.asc.deg), `${d.nakshatras[k.asc.nakshatra]} ${k.asc.pada}`, d.planets[k.asc.nakLord], 1, "-", "-", "-"],
    ...k.planets.map((p) => [
      d.planets[p.key],
      d.signs[p.sign],
      degText(p.deg),
      `${d.nakshatras[p.nakshatra]} ${p.pada}`,
      d.planets[p.nakLord],
      p.house,
      d.dignity[p.dignity],
      [p.retro && p.key !== "rahu" && p.key !== "ketu" ? l.retro : "", p.combust ? l.combust : ""].filter(Boolean).join(", ") || "-",
      d.avastha[p.avastha],
    ]),
  ];
  return (
    <Box flush>
      <T head={[l.planet, l.sign, l.degree, `${l.nakshatra} / ${l.pada}`, l.nakLord, l.house, l.dignity, l.status, l.avastha]} rows={rows} />
    </Box>
  );
}

// ------------------------------------------------------------------ divisional charts

export function Vargas({ k, d, style }) {
  const l = d.l;
  return (
    <div className="space-y-6">
      <Box>
        <ChartGrid>
          {VARGAS.map((n) => (
            <div key={n}>
              <KundaliChart chart={k.charts.vargas[n]} d={d} style={style} title={`D${n} ${d.vargas[n][0]}`} />
              <p className="mt-1 text-center text-xs text-muted">{d.vargas[n][1]}</p>
            </div>
          ))}
        </ChartGrid>
      </Box>
      <Box flush>
        <T
          dense
          head={[l.planet, ...VARGAS.map((n) => `D${n}`)]}
          rows={[
            [d.planets.asc, ...VARGAS.map((n) => d.signsShort[k.charts.vargas[n].asc])],
            ...k.planets.map((p) => [d.planets[p.key], ...VARGAS.map((n) => d.signsShort[signIn(k.charts.vargas[n], p.key)])]),
          ]}
        />
      </Box>
    </div>
  );
}
function signIn(chart, key) {
  for (const [s, items] of Object.entries(chart.bySign)) if (items.some((i) => i.key === key)) return Number(s);
  return 0;
}

// ------------------------------------------------------------------ dasha

function DashaRows({ list, level, d, lang, tz, now, nameOf, deep = true }) {
  const [open, setOpen] = useState(() => list.findIndex((p) => now >= p.start && now < p.end));
  return list.map((p, i) => {
    const running = now >= p.start && now < p.end;
    const children = level < 3 ? p.sub || (deep && level === 2 ? vimshottariSub(p.lord, p.start, p.end) : null) : null;
    return (
      <Fragment key={i}>
        <tr className={cn(running && "bg-brand-50/60 dark:bg-brand-900/20")}>
          <td className="px-3 py-2 whitespace-nowrap" style={{ paddingLeft: `${0.75 + level * 1.25}rem` }}>
            {children ? (
              <button type="button" onClick={() => setOpen(open === i ? -1 : i)} className="inline-flex items-center gap-1 font-medium hover:text-accent" aria-expanded={open === i}>
                {open === i ? <ChevronDown className="size-4" aria-hidden /> : <ChevronRight className="size-4" aria-hidden />}
                {nameOf(p)}
              </button>
            ) : (
              <span className="pl-5">{nameOf(p)}</span>
            )}
          </td>
          <td className="px-3 py-2 whitespace-nowrap tabular-nums">{fmtDate(p.start, lang, tz)}</td>
          <td className="px-3 py-2 whitespace-nowrap tabular-nums">{fmtDate(p.end, lang, tz)}</td>
        </tr>
        {open === i && children && <DashaRows list={children} level={level + 1} d={d} lang={lang} tz={tz} now={now} nameOf={nameOf} deep={deep} />}
      </Fragment>
    );
  });
}

export function Dasha({ k, d, lang }) {
  const l = d.l;
  const tz = k.input.place.timezone;
  const now = k.calc.generatedAt;
  const v = k.dasha.vimshottari;
  const y = k.dasha.yogini;
  const head = (
    <thead>
      <tr className="border-b border-line bg-surface-muted/60 text-xs text-muted">
        <th className="px-3 py-2 font-medium">{l.planet}</th>
        <th className="px-3 py-2 font-medium">{l.start}</th>
        <th className="px-3 py-2 font-medium">{l.end}</th>
      </tr>
    </thead>
  );
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Box title={l.vimshottari} description={`${l.balance}: ${d.planets[v.balance.lord]} ${v.balance.years.toFixed(2)} ${l.years}`} flush>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            {head}
            <tbody className="divide-y divide-line">
              <DashaRows list={v.maha} level={0} d={d} lang={lang} tz={tz} now={now} nameOf={(p) => d.planets[p.lord]} />
            </tbody>
          </table>
        </div>
      </Box>
      <Box title={l.yoginiDasha} description={`${l.balance}: ${d.yogini[y.balance.key]} ${y.balance.years.toFixed(2)} ${l.years}`} flush>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            {head}
            <tbody className="divide-y divide-line">
              <DashaRows list={y.maha} level={1} d={d} lang={lang} tz={tz} now={now} deep={false} nameOf={(p) => `${d.yogini[p.key]} (${d.planets[p.lord]})`} />
            </tbody>
          </table>
        </div>
      </Box>
    </div>
  );
}

// ------------------------------------------------------------------ ashtakavarga

export function Ashtakavarga({ k, d, style }) {
  const l = d.l;
  const { bav, sav } = k.ashtakavarga;
  const savChart = { asc: k.asc.sign, bySign: {} };
  return (
    <div className="space-y-6">
      <Box title={`${l.bav} / ${l.sav}`} flush>
        <T
          dense
          head={[l.sign, ...Object.keys(bav).map((p) => d.planetsShort[p]), l.sav]}
          rows={d.signs.map((s, i) => [s, ...Object.keys(bav).map((p) => bav[p][i]), <strong key="t">{sav[i]}</strong>])}
        />
        <p className="border-t border-line px-3 py-2 text-xs text-muted">
          {l.total}: {Object.keys(bav).map((p) => `${d.planetsShort[p]} ${bav[p].reduce((a, b) => a + b, 0)}`).join(" · ")} · {l.sav} {sav.reduce((a, b) => a + b, 0)}
        </p>
      </Box>
      <Box title={l.sav}>
        <div className="mx-auto max-w-sm">
          <SavChart chart={savChart} sav={sav} d={d} style={style} />
        </div>
      </Box>
    </div>
  );
}
function SavChart({ chart, sav, d, style }) {
  // Show the bindus as the "planets" of each sign
  const c = { asc: chart.asc, bySign: Object.fromEntries(sav.map((n, s) => [s, [{ key: `n${s}`, n }]])) };
  const dd = { ...d, planetsShort: { ...d.planetsShort, ...Object.fromEntries(sav.map((n, s) => [`n${s}`, String(n)])) } };
  return <KundaliChart chart={c} d={dd} style={style} title={d.l.sav} />;
}

// ------------------------------------------------------------------ doshas and yogas

const TONE = { none: "success", present: "danger", high: "danger", low: "warning", cancelled: "info", partial: "warning" };

export function DoshaYoga({ k, d }) {
  const l = d.l;
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Box title={l.doshas} flush>
        <ul className="divide-y divide-line">
          {k.doshas.map((x) => (
            <li key={x.key} className="px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{d.doshas[x.key][0]}</p>
                <Badge tone={TONE[x.status] || "neutral"}>{statusText(x.status, d)}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted">{d.doshas[x.key][1]}</p>
              <DoshaDetail x={x} d={d} />
            </li>
          ))}
        </ul>
      </Box>
      <Box title={l.yogasTitle} flush>
        {k.yogas.length ? (
          <ul className="divide-y divide-line">
            {k.yogas.map((y, i) => (
              <li key={i} className="px-5 py-4">
                <p className="font-medium">
                  {d.yogaText[y.key][0]}
                  {y.planets ? <span className="font-normal text-muted"> · {planetList(y.planets, d)}</span> : y.planet ? <span className="font-normal text-muted"> · {d.planets[y.planet]}</span> : null}
                </p>
                <p className="mt-1 text-sm text-muted">{d.yogaText[y.key][1]}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-5 text-sm text-muted">{l.noYogas}</p>
        )}
      </Box>
    </div>
  );
}

export function DoshaDetail({ x, d }) {
  const l = d.l;
  if (x.key === "manglik" && x.present) {
    return (
      <div className="mt-2 space-y-1 text-sm">
        <p>
          {l.fromLagna}: {x.fromLagna ? l.yes : l.no} · {l.fromMoon}: {x.fromMoon ? l.yes : l.no} · {l.house}: {x.marsHouse}
        </p>
        {x.cancellations.length > 0 && (
          <p className="text-muted">
            {l.reasons}: {x.cancellations.map((r) => d.doshaReasons[r]).join("; ")}
          </p>
        )}
      </div>
    );
  }
  if (x.key === "kaalSarp" && (x.present || x.partial)) return <p className="mt-2 text-sm">{`${d.kaalSarpTypes[x.type - 1]} · ${d.kaalSarpKind[x.direction]}`}</p>;
  if (x.key === "pitra" && x.present) return <p className="mt-2 text-sm text-muted">{x.rules.map((r) => d.doshaReasons[r]).join("; ")}</p>;
  return null;
}

// ------------------------------------------------------------------ KP

export function Kp({ k, d }) {
  const l = d.l;
  if (!k.kp) return <Box>{l.kpUnavailable}</Box>;
  return (
    <div className="space-y-6">
      <Box title={l.kpCusps} flush>
        <T head={[l.cusp, l.degree, l.signLord, l.starLord, l.subLord, l.subSubLord]} rows={k.kp.cusps.map((c) => [c.house, signDeg(Math.floor(c.lon / 30), c.lon % 30, d), d.planets[c.sign], d.planets[c.star], d.planets[c.sub], d.planets[c.subSub]])} />
      </Box>
      <Box title={l.kpPlanets} flush>
        <T head={[l.planet, l.degree, l.house, l.signLord, l.starLord, l.subLord, l.subSubLord]} rows={k.kp.planets.map((p) => [d.planets[p.key], signDeg(Math.floor(p.lon / 30), p.lon % 30, d), p.house, d.planets[p.sign], d.planets[p.star], d.planets[p.sub], d.planets[p.subSub]])} />
      </Box>
      <Box title={l.kpSignificators} description={l.kpLevels} flush>
        <T head={[l.planet, "A", "B", "C", "D"]} rows={k.kp.planets.map((p) => [d.planets[p.key], houseList(p.significators.a, d), houseList(p.significators.b, d), houseList(p.significators.c, d), houseList(p.significators.d, d)])} />
      </Box>
      <Box title={l.kpHouseSig} flush>
        <T head={[l.house, "A", "B", "C", "D"]} rows={k.kp.houses.map((h) => [h.house, planetList(h.a, d), planetList(h.b, d), planetList(h.c, d), planetList(h.d, d)])} />
      </Box>
    </div>
  );
}

// ------------------------------------------------------------------ transit and sade sati

export function Transit({ k, d, lang, style }) {
  const l = d.l;
  const tz = k.input.place.timezone;
  const s = k.sadeSati;
  const chart = { asc: k.asc.sign, bySign: {} };
  for (const p of k.transit.planets) (chart.bySign[p.sign] ||= []).push({ key: p.key, retro: p.retro && p.key !== "rahu" && p.key !== "ketu" });
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Box title={l.transitChart} description={fmtDate(k.transit.at, lang, tz)}>
          <div className="mx-auto max-w-sm">
            <KundaliChart chart={chart} d={d} style={style} />
          </div>
        </Box>
        <Box title={l.transitChart} flush>
          <T head={[l.planet, l.degree, l.fromLagna, l.fromMoon]} rows={k.transit.planets.map((p) => [d.planets[p.key] + (p.retro && p.key !== "rahu" && p.key !== "ketu" ? ` (${l.retroShort})` : ""), signDeg(p.sign, p.lon % 30, d), p.house, p.fromMoon])} />
        </Box>
      </div>
      <Box title={l.sadeSati} action={<Badge tone={s.current ? "warning" : "success"}>{s.current ? `${l.sadeNow}: ${l.phase[s.current.phase] || ""}` : l.sadeNotNow}</Badge>} flush>
        <T head={[l.start, l.end, l.status]} rows={s.cycles.map((c) => [fmtDate(c.start, lang, tz), fmtDate(c.end, lang, tz), c.phases.map((p) => `${l.phase[p.phase]}: ${rangeText(p.start, p.end, lang, tz)}`).join(" · ")])} />
      </Box>
      <Box title={l.dhaiya} action={s.currentDhaiya ? <Badge tone="warning">{l.dhaiyaNow}</Badge> : null} flush>
        <T head={[l.house, l.sign, l.start, l.end]} rows={s.dhaiya.map((x) => [x.house, d.signs[x.sign], fmtDate(x.start, lang, tz), fmtDate(x.end, lang, tz)])} />
      </Box>
    </div>
  );
}

// ------------------------------------------------------------------ varshphal

export function Varshphal({ k, d, lang, style, onYear, busy }) {
  const l = d.l;
  const v = k.varshphal;
  const tz = k.input.place.timezone;
  const birthYear = Number(k.input.date.slice(0, 4));
  const thisYear = new Date(k.calc.generatedAt).getUTCFullYear();
  const years = [];
  for (let y = Math.max(birthYear + 1, thisYear - 10); y <= thisYear + 10; y++) years.push(y);
  if (!v) return null;
  const chart = { asc: v.ascSign, bySign: {} };
  for (const p of v.planets) (chart.bySign[p.sign] ||= []).push({ key: p.key, retro: p.retro && p.key !== "rahu" && p.key !== "ketu" });
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Box
        title={l.varshphal}
        action={
          <Select aria-label={l.varshYear} value={v.year} onChange={(e) => onYear(Number(e.target.value))} disabled={busy} className="h-9 w-28">
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        }
      >
        <InfoList
          items={[
            { label: l.varshYear, value: v.year },
            { label: l.varshAge, value: v.age },
            { label: l.varshPravesh, value: `${fmtDate(v.at, lang, tz)} ${fmtTime(v.at, tz)}` },
            { label: l.ascendant, value: signDeg(v.ascSign, v.asc % 30, d) },
            { label: l.muntha, value: d.signs[v.muntha] },
            { label: l.munthaHouse, value: v.munthaHouse },
          ]}
        />
        <div className="mx-auto mt-6 max-w-sm">
          <KundaliChart chart={chart} d={d} style={style} title={`${l.varshphal} ${v.year}`} />
        </div>
      </Box>
      <Box flush>
        <T head={[l.planet, l.sign, l.degree, l.house]} rows={v.planets.map((p) => [d.planets[p.key] + (p.retro && p.key !== "rahu" && p.key !== "ketu" ? ` (${l.retroShort})` : ""), d.signs[p.sign], degShort(p.lon % 30), p.house])} />
      </Box>
    </div>
  );
}

// ------------------------------------------------------------------ lal kitab

export function LalKitab({ k, d }) {
  const l = d.l;
  const lk = k.lalKitab;
  const chart = { asc: 0, bySign: {} };
  for (const p of k.planets) (chart.bySign[p.house - 1] ||= []).push({ key: p.key });
  return (
    <div className="space-y-6">
      <p className="rounded-xl bg-surface-muted px-4 py-3 text-sm text-muted">{l.lkNote}</p>
      <div className="grid gap-6 lg:grid-cols-2">
        <Box title={l.lkChart}>
          <div className="mx-auto max-w-sm">
            <KundaliChart chart={chart} d={d} fixedHouses />
          </div>
        </Box>
        <Box title={l.lkPlanets} flush>
          <T head={[l.planet, l.house, l.status, l.lkSleeping]} rows={lk.planets.map((p) => [d.planets[p.key], p.house, l.lkStatus[p.status], p.sleeping ? l.yes : l.no])} />
          <p className="border-t border-line px-3 py-2 text-sm">
            <span className="text-muted">{l.lkSleepingHouses}: </span>
            {houseList(
              lk.houses.filter((h) => h.sleeping).map((h) => h.house),
              d,
            )}
          </p>
        </Box>
      </div>
      <Box title={l.lkDebts} flush>
        {lk.debts.some((x) => x.present) ? (
          <ul className="divide-y divide-line">
            {lk.debts
              .filter((x) => x.present)
              .map((x) => (
                <li key={x.key} className="px-5 py-4">
                  <p className="font-medium">
                    {d.lkDebts[x.key][0]}{" "}
                    <span className="font-normal text-muted">
                      · {planetList(x.planets, d)} ({l.house} {x.houses.join(", ")})
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-muted">{d.lkDebts[x.key][1]}</p>
                </li>
              ))}
          </ul>
        ) : (
          <p className="p-5 text-sm text-muted">{l.lkNoDebts}</p>
        )}
      </Box>
      <Box title={l.lkRemedies} flush>
        <ul className="divide-y divide-line">
          {(lk.remedyPlanets.length ? lk.remedyPlanets : []).map((key) => (
            <li key={key} className="px-5 py-4">
              <p className="font-medium">{d.planets[key]}</p>
              <p className="mt-1 text-sm text-muted">{d.lkRemedies[key]}</p>
            </li>
          ))}
          {!lk.remedyPlanets.length && <li className="p-5 text-sm text-muted">{l.none}</li>}
        </ul>
      </Box>
    </div>
  );
}

// ------------------------------------------------------------------ numerology

export function Numerology({ k, d }) {
  const l = d.l;
  const n = k.numerology;
  const tiles = [
    [l.mulank, n.mulank],
    [l.bhagyank, n.bhagyank],
    [`${l.nameNumber} (${l.chaldean})`, n.nameNumber ? `${n.nameNumber.chaldean} (${n.nameNumber.chaldeanTotal})` : "-"],
    [`${l.nameNumber} (${l.pythagorean})`, n.nameNumber ? `${n.nameNumber.pythagorean} (${n.nameNumber.pythagoreanTotal})` : "-"],
    [l.soulUrge, n.soulUrge ?? "-"],
    [l.personality, n.personality ?? "-"],
    [`${l.personalYear} ${n.personalYear.year}`, n.personalYear.number],
    [l.kua, n.kua ?? "-"],
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-xs text-muted">{label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Box title={l.loShu}>
          <div className="mx-auto grid max-w-60 grid-cols-3 overflow-hidden rounded-xl border border-line">
            {n.loShu.grid.flat().map((c) => (
              <div key={c.n} className={cn("flex aspect-square items-center justify-center border border-line text-lg font-semibold tabular-nums", c.count ? "" : "text-muted/40")}>
                {c.count ? String(c.n).repeat(c.count) : c.n}
              </div>
            ))}
          </div>
          <InfoList
            className="mt-5"
            items={[
              { label: l.missing, value: n.loShu.missing.join(", ") || l.none },
              { label: l.repeated, value: n.loShu.repeated.join(", ") || l.none },
              { label: l.planes, value: n.loShu.planes.map((p) => l.planesNames[p]).join(", ") || l.none },
              { label: l.harmonyLabel, value: l.harmony[n.friendly.mulankBhagyank] },
            ]}
          />
        </Box>
        <div className="space-y-6">
          {[
            [l.mulank, n.mulank],
            [l.bhagyank, n.bhagyank],
          ].map(([label, num]) => {
            const info = d.numbers[num];
            return (
              <Box key={label} title={`${label}: ${num}`}>
                <InfoList
                  items={[
                    { label: l.rulingPlanet, value: d.planets[info.planet] },
                    { label: l.luckyDays, value: info.days },
                    { label: l.luckyColours, value: info.colours },
                    { label: l.gem, value: info.gem },
                    { label: l.nature, value: info.nature },
                  ]}
                />
              </Box>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ matching

export function MatchResult({ data, d, lang, style }) {
  const l = d.l;
  const m = data.match;
  const tone = m.verdict === "excellent" || m.verdict === "good" ? "success" : m.verdict === "average" ? "warning" : "danger";
  const val = ([type, v]) =>
    ({ varna: d.varna[v], vashya: d.vashya[v], nakshatra: d.nakshatras[v], yoni: d.yoni[v], planet: d.planets[v], gana: d.gana[v], sign: d.signs[v], nadi: d.nadi[v] })[type];
  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-center gap-6 p-5">
        <div className="flex size-28 shrink-0 flex-col items-center justify-center rounded-full border-8 border-brand-100 dark:border-brand-900/50">
          <span className="text-3xl font-semibold tabular-nums">{m.total}</span>
          <span className="text-xs text-muted">/ {m.max}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted">{l.gunaTotal}</p>
          <p className="mt-1 text-lg font-semibold">
            {data.boy.input.name} &amp; {data.girl.input.name}
          </p>
          <Badge tone={tone} className="mt-2">
            {d.verdict[m.verdict]}
          </Badge>
        </div>
      </Card>
      <Box flush>
        <T
          head={[l.koota, `${l.boy}`, `${l.girl}`, l.maxPoints, l.obtained]}
          rows={[
            ...m.kootas.map((x) => [
              <span key="k">
                <span className="font-medium">{d.koota[x.key][0]}</span>
                <span className="block text-xs text-muted">{d.koota[x.key][1]}</span>
              </span>,
              val(x.boy),
              val(x.girl),
              x.max,
              <strong key="o">{x.obtained}</strong>,
            ]),
            [<strong key="t">{l.total}</strong>, "", "", 36, <strong key="s">{m.total}</strong>],
          ]}
        />
      </Box>
      <div className="grid gap-6 lg:grid-cols-2">
        <Box title={l.manglikMatch}>
          <InfoList
            items={[
              { label: `${l.boy}: ${data.boy.input.name}`, value: statusText(m.manglik.boy, d) },
              { label: `${l.girl}: ${data.girl.input.name}`, value: statusText(m.manglik.girl, d) },
            ]}
          />
          <p className="mt-4 text-sm text-muted">{d.manglikNote[m.manglik.note]}</p>
        </Box>
        <Box title={l.notesTitle}>
          {m.notes.length ? (
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {m.notes.map((n) => (
                <li key={n}>{d.matchNotes[n]}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">{l.none}</p>
          )}
        </Box>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {[
          [l.boy, data.boy],
          [l.girl, data.girl],
        ].map(([who, k]) => (
          <Box key={who} title={`${who}: ${k.input.name}`} description={`${fmtInputDate(k.input.date, lang)} · ${k.input.time} · ${placeText(k.input.place)}`}>
            <div className="grid gap-6 sm:grid-cols-2">
              <KundaliChart chart={k.charts.d1} d={d} style={style} title={l.lagnaChart} />
              <KundaliChart chart={k.charts.moon} d={d} style={style} title={l.moonChart} />
            </div>
            <InfoList
              className="mt-5"
              items={[
                { label: l.rashi, value: d.signs[k.panchang.avakhada.sign] },
                { label: l.nakshatra, value: `${d.nakshatras[k.panchang.avakhada.nakshatra]} (${l.pada} ${k.panchang.avakhada.pada})` },
                { label: l.gana, value: d.gana[k.panchang.avakhada.gana] },
                { label: l.nadi, value: d.nadi[k.panchang.avakhada.nadi] },
              ]}
            />
          </Box>
        ))}
      </div>
    </div>
  );
}
