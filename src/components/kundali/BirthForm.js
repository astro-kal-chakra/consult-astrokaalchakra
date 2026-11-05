"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { Field, Input, Select } from "@/components/ui";
import { searchPlacesAction } from "@/app/dashboard/kundali/actions";

export const EMPTY_BIRTH = { name: "", gender: "", date: "", time: "", place: null };

const zones = () => {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return ["Asia/Kolkata", "Asia/Kathmandu", "Asia/Dhaka", "Asia/Dubai", "Asia/Singapore", "Europe/London", "America/New_York", "UTC"];
  }
};

/**
 * Birth details: name, gender, date, time (24 h, optional seconds) and place (search or coordinates).
 * Controlled: `value` = { name, gender, date, time, place: { name, region, lat, lng, timezone } | null }.
 */
export function BirthForm({ value, onChange, d, errors = {}, idPrefix = "kb" }) {
  const f = d.ui.form;
  const id = (k) => `${idPrefix}-${k}`;
  const set = (patch) => onChange({ ...value, ...patch });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={f.name} htmlFor={id("name")} error={errors.NAME}>
        <Input id={id("name")} value={value.name} onChange={(e) => set({ name: e.target.value })} maxLength={80} autoComplete="off" aria-invalid={Boolean(errors.NAME)} />
      </Field>
      <Field label={f.gender} htmlFor={id("gender")}>
        <Select id={id("gender")} value={value.gender} onChange={(e) => set({ gender: e.target.value })}>
          <option value="">{d.gender[""]}</option>
          <option value="male">{d.gender.male}</option>
          <option value="female">{d.gender.female}</option>
        </Select>
      </Field>
      <Field label={f.date} htmlFor={id("date")} error={errors.DATE}>
        <Input id={id("date")} type="date" min="1800-01-01" max="2200-12-31" value={value.date} onChange={(e) => set({ date: e.target.value })} aria-invalid={Boolean(errors.DATE)} />
      </Field>
      <Field label={f.time} htmlFor={id("time")} error={errors.TIME} hint={f.timeHint}>
        <Input id={id("time")} type="time" step="1" value={value.time} onChange={(e) => set({ time: e.target.value })} aria-invalid={Boolean(errors.TIME)} />
      </Field>
      <div className="sm:col-span-2">
        <PlaceField value={value.place} onChange={(place) => set({ place })} d={d} idPrefix={idPrefix} errors={errors} />
      </div>
    </div>
  );
}

/** Place: city search, or coordinates and time zone typed in. `label` overrides "Place of birth". */
export function PlaceField({ value, onChange, d, idPrefix = "kb", errors = {}, label }) {
  const id = (k) => `${idPrefix}-${k}`;
  const [manual, setManual] = useState(false);
  return manual ? (
    <ManualPlace value={value} onChange={onChange} d={d} id={id} errors={errors} label={label} onSearch={() => setManual(false)} />
  ) : (
    <PlaceSearch value={value} onChange={onChange} d={d} id={id("place")} label={label} error={errors.PLACE || errors.COORDS || errors.TZ} onManual={() => setManual(true)} />
  );
}

function PlaceSearch({ value, onChange, d, id, error, onManual, label: fieldLabel }) {
  const f = d.ui.form;
  const listId = useId();
  const [q, setQ] = useState(value ? [value.name, value.region].filter(Boolean).join(", ") : "");
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [searched, setSearched] = useState("");
  const seq = useRef(0);

  // Keep the box in sync when a saved kundali is loaded
  const label = value ? [value.name, value.region].filter(Boolean).join(", ") : "";
  const [shown, setShown] = useState(label);
  if (label !== shown) {
    setShown(label);
    setQ(label);
  }

  useEffect(() => {
    const s = q.trim();
    if (s.length < 2 || s === label) return undefined;
    const n = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const list = await searchPlacesAction(s);
        if (n === seq.current) {
          setItems(list);
          setSearched(s);
          setActive(-1);
          setOpen(true);
        }
      } catch {
        if (n === seq.current) setItems([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, label]);

  const pick = (p) => {
    onChange(p);
    setOpen(false);
  };
  const onKey = (e) => {
    if (!open || !items.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      pick(items[active]);
    } else if (e.key === "Escape") setOpen(false);
  };

  return (
    <Field
      label={fieldLabel || f.place}
      htmlFor={id}
      error={error}
      hint={
        value ? (
          `${value.lat.toFixed(4)}, ${value.lng.toFixed(4)} · ${value.timezone}`
        ) : (
          <button type="button" className="text-accent hover:underline" onClick={onManual}>
            {f.manual}
          </button>
        )
      }
    >
      <div className="relative">
        <MapPin className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <Input
          id={id}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            if (value) onChange(null);
          }}
          onKeyDown={onKey}
          onFocus={() => items.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={f.placeHint}
          className="pl-9"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-invalid={Boolean(error)}
        />
        {open && (
          <ul id={listId} role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-line bg-surface py-1 shadow-lg">
            {items.length ? (
              items.map((p, i) => (
                <li key={p.id} role="option" aria-selected={i === active}>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(p)} className={`flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-surface-muted ${i === active ? "bg-surface-muted" : ""}`}>
                    <span className="font-medium">{p.name}</span>
                    <span className="text-xs text-muted">{p.region}</span>
                  </button>
                </li>
              ))
            ) : searched ? (
              <li className="px-3 py-2 text-sm text-muted">
                {f.noPlaces}{" "}
                <button type="button" onMouseDown={(e) => e.preventDefault()} className="text-accent hover:underline" onClick={onManual}>
                  {f.manual}
                </button>
              </li>
            ) : null}
          </ul>
        )}
      </div>
    </Field>
  );
}

function ManualPlace({ value, onChange, d, id, errors, onSearch, label }) {
  const f = d.ui.form;
  const tzs = useMemo(() => zones(), []);
  const [v, setV] = useState(() => ({ name: value?.name || "", lat: value?.lat ?? "", lng: value?.lng ?? "", timezone: value?.timezone || "Asia/Kolkata" }));
  const update = (patch) => {
    const n = { ...v, ...patch };
    setV(n);
    const lat = n.lat === "" ? NaN : Number(n.lat);
    const lng = n.lng === "" ? NaN : Number(n.lng);
    onChange(n.name.trim() && Number.isFinite(lat) && Number.isFinite(lng) ? { id: "manual", name: n.name.trim(), region: "", lat, lng, timezone: n.timezone } : null);
  };
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field
        label={label || f.place}
        htmlFor={id("pname")}
        error={errors.PLACE}
        hint={
          <button type="button" className="text-accent hover:underline" onClick={onSearch}>
            {f.search}
          </button>
        }
      >
        <Input id={id("pname")} value={v.name} onChange={(e) => update({ name: e.target.value })} maxLength={120} />
      </Field>
      <Field label={f.tz} htmlFor={id("tz")} error={errors.TZ}>
        <Select id={id("tz")} value={v.timezone} onChange={(e) => update({ timezone: e.target.value })}>
          {tzs.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={f.lat} htmlFor={id("lat")} error={errors.COORDS}>
        <Input id={id("lat")} type="number" step="0.0001" min="-90" max="90" value={v.lat} onChange={(e) => update({ lat: e.target.value })} placeholder="28.6139" />
      </Field>
      <Field label={f.lng} htmlFor={id("lng")}>
        <Input id={id("lng")} type="number" step="0.0001" min="-180" max="180" value={v.lng} onChange={(e) => update({ lng: e.target.value })} placeholder="77.2090" />
      </Field>
    </div>
  );
}
