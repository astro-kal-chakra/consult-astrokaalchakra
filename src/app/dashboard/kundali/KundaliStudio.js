"use client";

import { useState, useTransition } from "react";
import { CalendarCheck, Clock, Download, Heart, Languages, Orbit, Save, Trash2, UserRound } from "lucide-react";
import { Badge, Button, Card, CardHeader, EmptyState, Field, PageHeader, Select } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { LANGS, dict, fmtInputDate } from "@/lib/kundali/i18n";
import { BirthForm, EMPTY_BIRTH } from "@/components/kundali/BirthForm";
import { MuhuratPanel } from "@/components/kundali/Muhurat";
import { Ashtakavarga, Charts, Dasha, DoshaYoga, Kp, LalKitab, MatchResult, Numerology, Overview, Planets, Transit, Varshphal, Vargas } from "@/components/kundali/Sections";
import { deleteKundaliAction, generateKundaliAction, matchKundaliAction, saveKundaliAction } from "./actions";

const SECTIONS = ["overview", "charts", "planets", "vargas", "dasha", "ashtakavarga", "doshas", "kp", "transit", "varshphal", "lalkitab", "numerology"];

const remember = (name, value) => {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/dashboard/kundali; max-age=31536000; samesite=lax`;
};

/** A saved kundali (backend / demo shape) → form value. */
const fromSaved = (s) => ({
  name: s.name,
  gender: s.gender || "",
  date: s.dob,
  time: s.tob || "",
  place: s.lat != null && s.lng != null ? { id: `saved-${s.id}`, name: s.place, region: s.region || "", lat: s.lat, lng: s.lng, timezone: s.tz || "Asia/Kolkata" } : null,
});

const nowInput = () => {
  const n = new Date();
  const p = (x) => String(x).padStart(2, "0");
  return { date: `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`, time: `${p(n.getHours())}:${p(n.getMinutes())}:${p(n.getSeconds())}` };
};

async function downloadPdf(body, filename) {
  const res = await fetch("/dashboard/kundali/pdf", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  // An ended session is redirected to the login page: only a real PDF counts
  if (!res.ok || !String(res.headers.get("content-type")).includes("application/pdf")) throw new Error("pdf");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const fileName = (prefix, name) => `${prefix}-${String(name || "kundali").trim().replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 40) || "kundali"}.pdf`;

export function KundaliStudio({ saved, initialLang = "en", initialStyle = "north" }) {
  const [lang, setLang] = useState(initialLang);
  const [style, setStyle] = useState(initialStyle);
  const [node, setNode] = useState("mean");
  const [tab, setTab] = useState("kundali");
  const d = dict(lang);
  const u = d.ui;

  const changeLang = (v) => {
    setLang(v);
    remember("kc_kundali_lang", v);
  };
  const changeStyle = (v) => {
    setStyle(v);
    remember("kc_kundali_style", v);
  };

  // Janam kundali
  const [birth, setBirth] = useState(EMPTY_BIRTH);
  const [errors, setErrors] = useState({});
  const [k, setK] = useState(null);
  const [section, setSection] = useState("overview");
  const [pending, start] = useTransition();
  const [pdfBusy, setPdfBusy] = useState(false);
  const toast = useToast();

  const generate = (input = birth, extra = {}) => {
    setErrors({});
    start(async () => {
      try {
        const r = await generateKundaliAction(input, { node, ...extra });
        if (!r.ok) {
          setErrors({ [r.code]: u.errors[r.code] || u.errors.generic });
          if (!u.errors[r.code] || r.code === "generic") toast(u.errors.generic, { type: "error" });
          return;
        }
        setK(r.data);
      } catch {
        toast(u.errors.generic, { type: "error" });
      }
    });
  };

  const save = () => {
    start(async () => {
      try {
        const r = await saveKundaliAction(birth);
        if (!r.ok) return toast(r.error.message, { type: "error" });
        toast(u.form.saved);
      } catch {
        toast(u.errors.generic, { type: "error" });
      }
    });
  };

  const pdf = async () => {
    if (!k) return;
    setPdfBusy(true);
    try {
      await downloadPdf({ type: "kundali", input: k.input, lang, style, node: k.calc.node, varshYear: k.varshphal?.year }, fileName("kundali", k.input.name));
    } catch {
      toast(u.errors.pdf, { type: "error" });
    } finally {
      setPdfBusy(false);
    }
  };

  // Kundali milan
  const [boy, setBoy] = useState(EMPTY_BIRTH);
  const [girl, setGirl] = useState(EMPTY_BIRTH);
  const [matchErr, setMatchErr] = useState({ boy: {}, girl: {} });
  const [match, setMatch] = useState(null);
  const runMatch = () => {
    setMatchErr({ boy: {}, girl: {} });
    start(async () => {
      try {
        const r = await matchKundaliAction(boy, girl, { node });
        if (!r.ok) {
          setMatchErr({ boy: {}, girl: {}, [r.who]: { [r.code]: u.errors[r.code] || u.errors.generic } });
          return;
        }
        setMatch(r.data);
      } catch {
        toast(u.errors.generic, { type: "error" });
      }
    });
  };
  const matchPdf = async () => {
    if (!match) return;
    setPdfBusy(true);
    try {
      await downloadPdf({ type: "match", boy: match.boy.input, girl: match.girl.input, lang, style, node }, fileName("kundali-milan", `${match.boy.input.name}-${match.girl.input.name}`));
    } catch {
      toast(u.errors.pdf, { type: "error" });
    } finally {
      setPdfBusy(false);
    }
  };

  // Muhurat and day panchang (recalculated on the server for the PDF)
  const muhuratPdf = async (body, base) => {
    setPdfBusy(true);
    try {
      await downloadPdf({ ...body, lang }, `${base}.pdf`);
    } catch {
      toast(u.errors.pdf, { type: "error" });
    } finally {
      setPdfBusy(false);
    }
  };

  // Saved
  const [confirm, setConfirm] = useState(null);
  const remove = () => {
    const id = confirm?.id;
    start(async () => {
      try {
        const r = await deleteKundaliAction(id);
        if (!r.ok) return toast(r.error.message, { type: "error" });
        toast(u.removed);
        setConfirm(null);
      } catch {
        toast(u.errors.generic, { type: "error" });
      }
    });
  };
  const open = (s) => {
    const v = fromSaved(s);
    setBirth(v);
    setTab("kundali");
    setSection("overview");
    if (v.place && v.time) generate(v);
    else setK(null);
  };

  const options = (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={u.form.chartStyle} htmlFor="kd-style">
        <Select id="kd-style" value={style} onChange={(e) => changeStyle(e.target.value)}>
          <option value="north">{u.form.north}</option>
          <option value="south">{u.form.south}</option>
        </Select>
      </Field>
      <Field label={u.form.node} htmlFor="kd-node">
        <Select id="kd-node" value={node} onChange={(e) => setNode(e.target.value)}>
          <option value="mean">{u.form.meanNode}</option>
          <option value="true">{u.form.trueNode}</option>
        </Select>
      </Field>
    </div>
  );

  return (
    <div lang={lang}>
      <PageHeader
        title={u.title}
        description={u.description}
        action={
          <div className="inline-flex items-center gap-1 rounded-xl border border-line bg-surface p-1" role="group" aria-label="Language">
            <Languages className="mx-1.5 size-4 text-muted" aria-hidden />
            {LANGS.map((x) => (
              <button
                key={x.code}
                type="button"
                onClick={() => changeLang(x.code)}
                aria-pressed={lang === x.code}
                className={cn("rounded-lg px-3 py-1.5 text-sm font-medium", lang === x.code ? "bg-brand-600 text-white" : "text-muted hover:text-fg")}
              >
                {x.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-line" role="tablist">
        {[
          ["kundali", u.tabs.kundali, Orbit],
          ["matching", u.tabs.matching, Heart],
          ["muhurat", u.tabs.muhurat, CalendarCheck],
          ["saved", `${u.tabs.saved} (${saved.length})`, Save],
        ].map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn("-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap", tab === key ? "border-brand-600 text-accent" : "border-transparent text-muted hover:text-fg")}
          >
            <Icon className="size-4" aria-hidden /> {label}
          </button>
        ))}
      </div>

      {tab === "kundali" && (
        <div className="space-y-6">
          <Card>
            <CardHeader
              title={u.tabs.kundali}
              action={
                saved.length > 0 && (
                  <Select aria-label={u.form.useSaved} value="" onChange={(e) => e.target.value && open(saved.find((s) => s.id === e.target.value))} className="h-9 w-56">
                    <option value="">{u.form.useSaved}</option>
                    {saved.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} · {s.dob}
                      </option>
                    ))}
                  </Select>
                )
              }
            />
            <form
              className="space-y-5 p-5"
              onSubmit={(e) => {
                e.preventDefault();
                setSection("overview");
                generate();
              }}
              noValidate
            >
              <BirthForm value={birth} onChange={setBirth} d={d} errors={errors} idPrefix="kd" />
              {options}
              <div className="flex flex-wrap gap-2">
                <Button type="submit" loading={pending}>
                  <Orbit aria-hidden /> {u.form.generate}
                </Button>
                <Button
                  variant="outline"
                  disabled={pending}
                  onClick={() => {
                    const v = { ...birth, ...nowInput(), name: birth.name || u.form.now };
                    setBirth(v);
                    if (v.place) generate(v);
                    else setErrors({ PLACE: u.errors.PLACE });
                  }}
                >
                  <Clock aria-hidden /> {u.form.now}
                </Button>
                {k && (
                  <>
                    <Button variant="outline" onClick={save} disabled={pending}>
                      <Save aria-hidden /> {u.form.save}
                    </Button>
                    <Button variant="soft" onClick={pdf} loading={pdfBusy}>
                      {!pdfBusy && <Download aria-hidden />} {pdfBusy ? u.form.pdfBusy : u.form.pdf}
                    </Button>
                  </>
                )}
              </div>
            </form>
          </Card>

          {k ? (
            <>
              <div className="sticky top-0 z-10 -mx-1 flex gap-1 overflow-x-auto bg-bg/90 px-1 py-2 backdrop-blur" role="tablist" aria-label={u.tabs.kundali}>
                {SECTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="tab"
                    aria-selected={section === s}
                    onClick={() => setSection(s)}
                    className={cn("rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap", section === s ? "bg-brand-600 text-white" : "bg-surface-muted text-muted hover:text-fg")}
                  >
                    {u.sections[s]}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                <UserRound className="size-4" aria-hidden />
                <span className="font-medium text-fg">{k.input.name}</span>· {fmtInputDate(k.input.date, lang)} · {k.input.time} · {k.input.place.name}
                {k.calc.node === "true" && <Badge>{u.form.trueNode}</Badge>}
              </div>
              {section === "overview" && <Overview k={k} d={d} lang={lang} />}
              {section === "charts" && <Charts k={k} d={d} style={style} />}
              {section === "planets" && <Planets k={k} d={d} />}
              {section === "vargas" && <Vargas k={k} d={d} style={style} />}
              {section === "dasha" && <Dasha key={k.calc.birthUtc} k={k} d={d} lang={lang} />}
              {section === "ashtakavarga" && <Ashtakavarga k={k} d={d} style={style} />}
              {section === "doshas" && <DoshaYoga k={k} d={d} />}
              {section === "kp" && <Kp k={k} d={d} />}
              {section === "transit" && <Transit k={k} d={d} lang={lang} style={style} />}
              {section === "varshphal" && <Varshphal k={k} d={d} lang={lang} style={style} busy={pending} onYear={(y) => generate(k.input, { node: k.calc.node, varshYear: y })} />}
              {section === "lalkitab" && <LalKitab k={k} d={d} />}
              {section === "numerology" && <Numerology k={k} d={d} />}
              <p className="text-xs text-muted">{d.l.disclaimer}</p>
            </>
          ) : (
            <Card>
              <EmptyState icon={Orbit} title={u.tabs.kundali} description={u.empty} />
            </Card>
          )}
        </div>
      )}

      {tab === "matching" && (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-2">
            {[
              ["boy", u.form.boy, boy, setBoy],
              ["girl", u.form.girl, girl, setGirl],
            ].map(([who, title, value, set]) => (
              <Card key={who}>
                <CardHeader
                  title={title}
                  action={
                    saved.length > 0 && (
                      <Select aria-label={u.form.useSaved} value="" onChange={(e) => e.target.value && set(fromSaved(saved.find((s) => s.id === e.target.value)))} className="h-9 w-48">
                        <option value="">{u.form.useSaved}</option>
                        {saved.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} · {s.dob}
                          </option>
                        ))}
                      </Select>
                    )
                  }
                />
                <div className="p-5">
                  <BirthForm value={value} onChange={set} d={d} errors={matchErr[who]} idPrefix={`km-${who}`} />
                </div>
              </Card>
            ))}
          </div>
          <Card className="space-y-5 p-5">
            {options}
            <div className="flex flex-wrap gap-2">
              <Button onClick={runMatch} loading={pending}>
                <Heart aria-hidden /> {u.form.match}
              </Button>
              {match && (
                <Button variant="soft" onClick={matchPdf} loading={pdfBusy}>
                  {!pdfBusy && <Download aria-hidden />} {pdfBusy ? u.form.pdfBusy : u.form.pdf}
                </Button>
              )}
            </div>
          </Card>
          {match ? (
            <MatchResult data={match} d={d} lang={lang} style={style} />
          ) : (
            <Card>
              <EmptyState icon={Heart} title={u.tabs.matching} description={u.emptyMatch} />
            </Card>
          )}
        </div>
      )}

      {/* Kept mounted so the muhurat form and results survive switching tabs */}
      <div hidden={tab !== "muhurat"}>
        <MuhuratPanel d={d} lang={lang} saved={saved} defaultPlace={birth.place} onPdf={muhuratPdf} pdfBusy={pdfBusy} />
      </div>

      {tab === "saved" && (
        <Card>
          {saved.length ? (
            <ul className="divide-y divide-line">
              {saved.map((s) => (
                <li key={s.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
                    <Orbit className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{s.name}</p>
                    <p className="text-sm text-muted">
                      {fmtInputDate(s.dob, lang)}
                      {s.tob ? ` · ${s.tob}` : ""} · {[s.place, s.region].filter(Boolean).join(", ")}
                    </p>
                    {s.forBooking && <p className="text-xs text-muted">{s.forBooking}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => open(s)}>
                      {u.open}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirm(s)} aria-label={`${u.remove} ${s.name}`}>
                      <Trash2 aria-hidden />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Save} title={u.tabs.saved} description={u.savedEmpty} />
          )}
        </Card>
      )}

      <Modal open={Boolean(confirm)} onClose={() => !pending && setConfirm(null)} title={u.removeConfirm} description={confirm?.name} size="sm">
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirm(null)} disabled={pending}>
            {u.cancel}
          </Button>
          <Button variant="danger" onClick={remove} loading={pending}>
            {u.remove}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
