import { NORTH_LINES, itemLabel, northContent, southContent } from "@/lib/kundali/chartLayout";

/**
 * A North or South Indian chart as SVG. `chart` = { asc, bySign }, `d` = i18n dictionary. `fixedHouses`: Lal Kitab
 * style, where house h always shows the number h.
 */
export function KundaliChart({ chart, d, style = "north", title, fixedHouses = false, className = "" }) {
  const S = 300;
  return (
    <figure className={className}>
      <svg viewBox={`-2 -2 ${S + 4} ${S + 4}`} role="img" aria-label={title} className="h-auto w-full text-fg">
        <rect x="0" y="0" width={S} height={S} rx="6" className="fill-brand-50/40 dark:fill-brand-900/20" />
        {style === "south" ? <South chart={chart} d={d} S={S} title={title} /> : <North chart={chart} d={d} S={S} fixedHouses={fixedHouses} />}
      </svg>
      {title && style !== "south" && <figcaption className="mt-2 text-center text-sm font-medium">{title}</figcaption>}
    </figure>
  );
}

function Lines({ items, fs, x, y, w, accent }) {
  const perLine = w > 0.25 ? 3 : w > 0.2 ? 2 : 1;
  const lines = [];
  for (let i = 0; i < items.length; i += perLine) lines.push(items.slice(i, i + perLine));
  const lh = fs * 1.2;
  const top = y - ((lines.length - 1) * lh) / 2;
  return lines.map((line, i) => (
    <text key={i} x={x} y={top + i * lh} fontSize={fs} textAnchor="middle" dominantBaseline="middle" className="fill-current">
      {line.map((it, j) => (
        <tspan key={j} className={it.key === "asc" ? accent : undefined} fontWeight={it.key === "asc" ? 600 : 500}>
          {j ? " " : ""}
          {it.label}
        </tspan>
      ))}
    </text>
  ));
}

function North({ chart, d, S, fixedHouses }) {
  const houses = northContent(chart, { showAsc: !fixedHouses });
  return (
    <>
      {NORTH_LINES.map((pts, i) => (
        <polyline key={i} points={pts.map(([x, y]) => `${x * S},${y * S}`).join(" ")} fill="none" className="stroke-brand-600 dark:stroke-brand-300" strokeWidth="1.4" strokeLinejoin="round" />
      ))}
      {houses.map((h) => {
        const items = h.items.map((it) => ({ ...it, label: itemLabel(it, d) }));
        const fs = items.length > 4 ? 10 : 11.5;
        return (
          <g key={h.house}>
            <text x={h.num[0] * S} y={h.num[1] * S} fontSize="10" textAnchor="middle" dominantBaseline="middle" className="fill-muted">
              {fixedHouses ? h.house : h.sign + 1}
            </text>
            <Lines items={items} fs={fs} x={h.text[0] * S} y={h.text[1] * S} w={h.w} accent="fill-brand-600 dark:fill-brand-300" />
          </g>
        );
      })}
    </>
  );
}

function South({ chart, d, S, title }) {
  const cell = S / 4;
  const cells = southContent(chart);
  return (
    <>
      {cells.map((c) => {
        const items = c.items.map((it) => ({ ...it, label: itemLabel(it, d) }));
        return (
          <g key={c.sign}>
            <rect x={c.col * cell} y={c.row * cell} width={cell} height={cell} fill="none" className="stroke-brand-600 dark:stroke-brand-300" strokeWidth="1.2" />
            {c.isAsc && <line x1={c.col * cell} y1={c.row * cell + 14} x2={c.col * cell + 14} y2={c.row * cell} className="stroke-brand-600 dark:stroke-brand-300" strokeWidth="1.2" />}
            <text x={c.col * cell + cell - 5} y={c.row * cell + 11} fontSize="9" textAnchor="end" className="fill-muted">
              {d.signsShort[c.sign]}
            </text>
            <Lines items={items} fs={items.length > 4 ? 10 : 11} x={c.col * cell + cell / 2} y={c.row * cell + cell / 2 + 5} w={0.24} accent="fill-brand-600 dark:fill-brand-300" />
          </g>
        );
      })}
      <text x={S / 2} y={S / 2} fontSize="13" textAnchor="middle" dominantBaseline="middle" className="fill-muted">
        {title}
      </text>
    </>
  );
}
