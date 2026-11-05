"use client";

import { Fragment, useState, useTransition } from "react";
import { CalendarCheck, CalendarDays, Download, Search, Sun } from "lucide-react";
import { Badge, Button, Card, CardHeader, EmptyState, Field, InfoList, Input, Select } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { fmtInputDate } from "@/lib/kundali/i18n";
import { EVENTS, EVENT_KEYS, GOOD_CHOGHADIYA } from "@/lib/kundali/muhuratRules";
import { limbName, placeText, spanOn, timeOn } from "@/lib/kundali/text";
import { PlaceField } from "./BirthForm";
import { T } from "./Sections";
import { dayPanchangAction, generateKundaliAction, muhuratAction } from "@/app/dashboard/kundali/actions";

const pad = (x) => String(x).padStart(2, "0");
const ymd = (n) => `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
const today = () => ymd(new Date());
const plusDays = (date, n) => {
  const x = new Date(`${date}T12:00:00`);
  x.setDate(x.getDate() + n);
  return ymd(x);
};

const NO_PERSON = { rashi: "", nakshatra: "" };

/**
 * Muhurat & Panchang tab: the Shubh Muhurat finder (event, dates, place, optional rashi / nakshatra of up to two
 * people) and the full panchang of a day. `saved`: saved kundalis (to fill rashi / nakshatra); `onPdf(body, name)`.
 */
export function MuhuratPanel({ d, lang, saved, defaultPlace, onPdf, pdfBusy }) {
  const mu = d.mu;
  const [view, setView] = useState("finder");
  return (
    <div className="space-y-6">
      <div className="inline-flex gap-1 rounded-xl border border-line bg-surface p-1" role="tablist">
        {[
          ["finder", mu.finder, CalendarCheck],
          ["day", mu.day, Sun],
        ].map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={view === key}
            onClick={() => setView(key)}
            className={cn("inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium", view === key ? "bg-brand-600 text-white" : "text-muted hover:text-fg")}
          >
            <Icon className="size-4" aria-hidden /> {label}
          </button>
        ))}
      </div>
      {/* Both stay mounted so switching views keeps the form and the results */}
      <div hidden={view !== "finder"}>
        <Finder d={d} lang={lang} saved={saved} defaultPlace={defaultPlace} onPdf={onPdf} pdfBusy={pdfBusy} />
      </div>
      <div hidden={view !== "day"}>
        <DayView d={d} lang={lang} defaultPlace={defaultPlace} onPdf={onPdf} pdfBusy={pdfBusy} />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ finder

function Finder({ d, lang, saved, defaultPlace, onPdf, pdfBusy }) {
  const mu = d.mu;
  const u = d.ui;
  const toast = useToast();
  const [event, setEvent] = useState("vivah");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(() => plusDays(today(), 90));
  const [place, setPlace] = useState(defaultPlace || null);
  const [persons, setPersons] = useState([NO_PERSON, NO_PERSON]);
  const [error, setError] = useState(null);
  const [r, setR] = useState(null);
  const [pending, start] = useTransition();
  const [filling, startFill] = useTransition();

  const query = () => ({
    event,
    from,
    to,
    place,
    persons: persons.map((p) => ({ rashi: p.rashi === "" ? null : Number(p.rashi), nakshatra: p.nakshatra === "" ? null : Number(p.nakshatra) })),
  });

  const find = () => {
    setError(null);
    start(async () => {
      try {
        const res = await muhuratAction(query());
        if (!res.ok) return setError(res.code);
        setR(res.data);
      } catch {
        toast(u.errors.generic, { type: "error" });
      }
    });
  };

  const setPerson = (i, patch) => setPersons((list) => list.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  // Rashi and nakshatra of a saved kundali come from its full calculation
  const fill = (i, s) => {
    if (!s) return;
    startFill(async () => {
      try {
        const res = await generateKundaliAction({ name: s.name, gender: s.gender || "", date: s.dob, time: s.tob, place: { name: s.place, region: s.region || "", lat: s.lat, lng: s.lng, timezone: s.tz || "Asia/Kolkata" } }, {});
        if (!res.ok) return toast(u.errors.generic, { type: "error" });
        const a = res.data.panchang.avakhada;
        setPerson(i, { rashi: String(a.sign), nakshatra: String(a.nakshatra) });
      } catch {
        toast(u.errors.generic, { type: "error" });
      }
    });
  };
  const fillable = saved.filter((s) => s.lat != null && s.lng != null && s.tob);

  const errText = error && (mu.errors[error] || u.errors[error] || u.errors.generic);
  const months = r ? groupByMonth(r.days, lang) : [];
  const usesLagna = r && EVENTS[r.event].lagna;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title={mu.finder} description={mu.checked} />
        <form
          className="space-y-5 p-5"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            find();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={mu.event} htmlFor="mu-event" error={error === "EVENT" ? errText : null}>
              <Select id="mu-event" value={event} onChange={(e) => setEvent(e.target.value)}>
                {EVENT_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {mu.events[k]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={mu.from} htmlFor="mu-from" error={["DATE", "RANGE"].includes(error) ? errText : null}>
              <Input id="mu-from" type="date" min="1900-01-01" max="2100-12-31" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label={mu.to} htmlFor="mu-to">
              <Input id="mu-to" type="date" min={from} max="2100-12-31" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
          </div>
          <PlaceField value={place} onChange={setPlace} d={d} idPrefix="mu" label={mu.place} errors={error === "PLACE" ? { PLACE: u.errors.PLACE } : {}} />

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">{mu.forWhom}</legend>
            <p className="text-xs text-muted">{mu.forWhomHint}</p>
            {persons.map((p, i) => (
              <div key={i} className="grid gap-3 sm:grid-cols-[7rem_1fr_1fr_1fr] sm:items-end">
                <span className="text-sm text-muted sm:pb-2.5">{i ? mu.person2 : mu.person1}</span>
                <Field label={mu.rashi} htmlFor={`mu-r${i}`}>
                  <Select id={`mu-r${i}`} value={p.rashi} onChange={(e) => setPerson(i, { rashi: e.target.value })}>
                    <option value="">{mu.notGiven}</option>
                    {d.signs.map((s, k) => (
                      <option key={k} value={k}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={mu.nakshatra} htmlFor={`mu-n${i}`}>
                  <Select id={`mu-n${i}`} value={p.nakshatra} onChange={(e) => setPerson(i, { nakshatra: e.target.value })}>
                    <option value="">{mu.notGiven}</option>
                    {d.nakshatras.map((s, k) => (
                      <option key={k} value={k}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </Field>
                {fillable.length > 0 ? (
                  <Select aria-label={`${mu.fillFrom} (${i ? mu.person2 : mu.person1})`} value="" onChange={(e) => fill(i, fillable.find((s) => s.id === e.target.value))} disabled={filling}>
                    <option value="">{mu.fillFrom}</option>
                    {fillable.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} · {s.dob}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <span />
                )}
              </div>
            ))}
          </fieldset>

          {errText && !["EVENT", "DATE", "RANGE", "PLACE"].includes(error) && <p className="text-sm text-red-600">{errText}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={pending}>
              <Search aria-hidden /> {mu.find}
            </Button>
            {r && (
              <Button variant="soft" loading={pdfBusy} onClick={() => onPdf({ type: "muhurat", query: { event: r.event, from: r.from, to: r.to, place: r.place, persons: r.persons } }, `muhurat-${r.event}`)}>
                {!pdfBusy && <Download aria-hidden />} {pdfBusy ? u.form.pdfBusy : u.form.pdf}
              </Button>
            )}
          </div>
        </form>
      </Card>

      {!r ? (
        <Card>
          <EmptyState icon={CalendarCheck} title={mu.finder} description={mu.empty} />
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <span className="font-medium text-fg">{mu.events[r.event]}</span>· {fmtInputDate(r.from, lang)} - {fmtInputDate(r.to, lang)} · {placeText(r.place)}
            <Badge tone={r.days.length ? "success" : "warning"}>{mu.found.replace("{n}", r.days.length)}</Badge>
          </div>

          {r.blocked.length > 0 && (
            <Card>
              <CardHeader title={mu.blocked} />
              <ul className="divide-y divide-line">
                {r.blocked.map((b, i) => (
                  <li key={i} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 text-sm">
                    <span>{mu.bars[b.reason]}</span>
                    <span className="text-muted tabular-nums">
                      {fmtInputDate(b.from, lang)}
                      {b.to !== b.from ? ` - ${fmtInputDate(b.to, lang)}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {r.days.length === 0 ? (
            <Card>
              <EmptyState icon={CalendarDays} title={mu.finder} description={mu.none} />
            </Card>
          ) : (
            months.map(([label, days]) => (
              <Card key={label}>
                <CardHeader title={label} />
                <ul className="divide-y divide-line">
                  {days.map((x) => (
                    <li key={x.date} className="grid gap-3 px-5 py-4 sm:grid-cols-[11rem_1fr]">
                      <div>
                        <p className="font-medium">{fmtInputDate(x.date, lang)}</p>
                        <p className="text-sm text-muted">{d.weekdays[x.weekday]}</p>
                        {x.special.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {x.special.map((s) => (
                              <Badge key={s} tone="brand">
                                {mu.specials[s]}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <ul className="space-y-2.5">
                        {x.windows.map((w, i) => (
                          <li key={i} className="text-sm">
                            <p className="font-semibold text-accent tabular-nums">{spanOn(w, x.date, r.place.timezone, lang)}</p>
                            <p className="text-muted">
                              {d.l.nakshatra}: {w.nakshatra.map((n) => d.nakshatras[n]).join(", ")} · {d.l.tithi}: {w.tithi.map((t) => limbName("tithi", t, d)).join(", ")}
                              {usesLagna ? ` · ${mu.lagna}: ${w.lagna.map((s) => d.signs[s]).join(", ")}` : ""}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </Card>
            ))
          )}
          <p className="text-xs text-muted">{mu.disclaimer}</p>
        </>
      )}
    </div>
  );
}

function groupByMonth(days, lang) {
  const fmt = new Intl.DateTimeFormat(lang === "hi" ? "hi-IN" : "en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
  const out = new Map();
  for (const x of days) {
    const label = fmt.format(new Date(`${x.date}T12:00:00Z`));
    if (!out.has(label)) out.set(label, []);
    out.get(label).push(x);
  }
  return [...out.entries()];
}

// ------------------------------------------------------------------ day panchang

function DayView({ d, lang, defaultPlace, onPdf, pdfBusy }) {
  const mu = d.mu;
  const u = d.ui;
  const toast = useToast();
  const [date, setDate] = useState(today);
  const [place, setPlace] = useState(defaultPlace || null);
  const [error, setError] = useState(null);
  const [p, setP] = useState(null);
  const [pending, start] = useTransition();

  const show = () => {
    setError(null);
    start(async () => {
      try {
        const res = await dayPanchangAction(date, place);
        if (!res.ok) return setError(res.code);
        setP(res.data);
      } catch {
        toast(u.errors.generic, { type: "error" });
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title={mu.day} />
        <form
          className="space-y-5 p-5"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            show();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={mu.date} htmlFor="pd-date" error={error === "DATE" ? mu.errors.DATE : null}>
              <Input id="pd-date" type="date" min="1900-01-01" max="2100-12-31" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <div className="sm:col-span-2">
              <PlaceField value={place} onChange={setPlace} d={d} idPrefix="pd" label={mu.place} errors={error === "PLACE" ? { PLACE: u.errors.PLACE } : {}} />
            </div>
          </div>
          {error === "generic" && <p className="text-sm text-red-600">{u.errors.generic}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={pending}>
              <Sun aria-hidden /> {mu.show}
            </Button>
            {p && (
              <Button variant="soft" loading={pdfBusy} onClick={() => onPdf({ type: "panchang", date: p.date, place: p.place }, `panchang-${p.date}`)}>
                {!pdfBusy && <Download aria-hidden />} {pdfBusy ? u.form.pdfBusy : u.form.pdf}
              </Button>
            )}
          </div>
        </form>
      </Card>
      {p ? (
        <DayPanchang p={p} d={d} lang={lang} />
      ) : (
        <Card>
          <EmptyState icon={Sun} title={mu.day} description={mu.emptyDay} />
        </Card>
      )}
    </div>
  );
}

function DayPanchang({ p, d, lang }) {
  const mu = d.mu;
  const l = d.l;
  const tz = p.place.timezone;
  const at = (ms) => timeOn(ms, p.date, tz, lang);
  const span = (iv) => spanOn(iv, p.date, tz, lang);
  const limb = (key, list) =>
    list.map((x, i) => (
      <Fragment key={i}>
        {i > 0 && <br />}
        {limbName(key, x.value, d)} <span className="text-muted">{x.end ? `${mu.till} ${at(x.end)}` : ""}</span>
      </Fragment>
    ));
  const chogRows = (list) => list.map((c) => [<span key="n" className="font-medium">{mu.chog[c.key]}</span>, span(c), <Badge key="b" tone={GOOD_CHOGHADIYA.includes(c.key) ? "success" : "danger"}>{GOOD_CHOGHADIYA.includes(c.key) ? mu.good : mu.bad}</Badge>]);

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted">
        <span className="font-medium text-fg">{fmtInputDate(p.date, lang)}</span> · {d.weekdays[p.weekday]} · {placeText(p.place)}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={mu.panchang} />
          <div className="p-5">
            <InfoList
              items={[
                { label: l.tithi, value: limb("tithi", p.tithi) },
                { label: l.nakshatra, value: limb("nakshatra", p.nakshatra) },
                { label: l.yoga, value: limb("yoga", p.yoga) },
                { label: l.karana, value: limb("karana", p.karana) },
                { label: l.day, value: d.weekdays[p.weekday] },
                { label: mu.moonSign, value: limb("moonSign", p.moonSign) },
                { label: l.sunSign, value: d.signs[p.sunSign] },
                { label: l.lunarMonth, value: p.lunarMonth ? `${p.lunarMonth.adhika ? `${l.adhika} ` : ""}${d.months[p.lunarMonth.index]}` : "-" },
                { label: `${l.vikram} / ${l.shaka}`, value: `${p.vikramSamvat} / ${p.shakaSamvat}` },
                { label: `${l.sunrise} / ${l.sunset}`, value: `${at(p.sunrise)} / ${at(p.sunset)}` },
                { label: `${l.moonrise} / ${l.moonset}`, value: `${at(p.moonrise)} / ${at(p.moonset)}` },
                { label: mu.dishaShool, value: mu.directions[p.dishaShool] },
              ]}
            />
          </div>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title={mu.goodTimes} />
            <ul className="divide-y divide-line text-sm">
              <Row label={mu.brahma} value={span(p.brahma)} />
              <Row label={mu.abhijit} value={span(p.abhijit)} note={p.abhijit.wednesday ? mu.abhijitWed : null} />
              {p.special.map((s, i) => (
                <Row key={i} label={mu.specials[s.key]} value={span(s)} />
              ))}
            </ul>
          </Card>
          <Card>
            <CardHeader title={mu.badTimes} />
            <ul className="divide-y divide-line text-sm">
              <Row label={mu.rahuKaal} value={span(p.rahuKaal)} bad />
              <Row label={mu.yamaganda} value={span(p.yamaganda)} bad />
              <Row label={mu.gulika} value={span(p.gulika)} bad />
              {p.bhadra.map((b, i) => (
                <Row key={`b${i}`} label={mu.bhadra} value={span(b)} bad />
              ))}
              {p.panchaka.map((b, i) => (
                <Row key={`p${i}`} label={mu.panchaka} value={span(b)} bad />
              ))}
              {p.bars.map((b) => (
                <Row key={b} label={mu.seasonal} value={mu.bars[b]} bad />
              ))}
            </ul>
          </Card>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={`${mu.choghadiya}: ${mu.dayChog}`} />
          <T head={[mu.choghadiya, `${mu.start} - ${mu.end}`, ""]} rows={chogRows(p.choghadiya.day)} />
        </Card>
        <Card>
          <CardHeader title={`${mu.choghadiya}: ${mu.nightChog}`} />
          <T head={[mu.choghadiya, `${mu.start} - ${mu.end}`, ""]} rows={chogRows(p.choghadiya.night)} />
        </Card>
      </div>
      <Card>
        <CardHeader title={mu.lagnaTable} />
        <T head={[mu.lagna, mu.start, mu.end]} rows={p.lagnas.map((x) => [d.signs[x.sign], at(x.start), at(x.end)])} />
      </Card>
      <p className="text-xs text-muted">{mu.disclaimer}</p>
    </div>
  );
}

const Row = ({ label, value, note, bad }) => (
  <li className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5">
    <span className={cn("font-medium", bad ? "text-red-700 dark:text-red-300" : "text-green-700 dark:text-green-300")}>
      {label}
      {note && <span className="ml-1 text-xs font-normal text-muted">({note})</span>}
    </span>
    <span className="text-muted tabular-nums">{value}</span>
  </li>
);
