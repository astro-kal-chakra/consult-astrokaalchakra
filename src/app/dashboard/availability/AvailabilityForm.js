"use client";

import { useState, useTransition } from "react";
import { CalendarOff, Copy, Plus, Save, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/format";
import { Button, Card, CardHeader, Field, Input } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { saveAvailability } from "./actions";

const DAYS = [
  ["mon", "Monday"],
  ["tue", "Tuesday"],
  ["wed", "Wednesday"],
  ["thu", "Thursday"],
  ["fri", "Friday"],
  ["sat", "Saturday"],
  ["sun", "Sunday"],
];
const WEEKDAYS = ["tue", "wed", "thu", "fri"];

export function AvailabilityForm({ availability }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [weekly, setWeekly] = useState(availability.weekly);
  const [daysOff, setDaysOff] = useState(availability.daysOff || []);
  const [newOff, setNewOff] = useState("");
  const [windowDays, setWindowDays] = useState(availability.bookingWindowDays);

  const setSlot = (day, i, patch) => setWeekly((w) => ({ ...w, [day]: w[day].map((s, j) => (j === i ? { ...s, ...patch } : s)) }));
  const addSlot = (day) =>
    setWeekly((w) => {
      const last = w[day][w[day].length - 1];
      const from = last ? last.to : "10:00";
      const h = Math.min(23, Number(from.slice(0, 2)) + 2);
      return { ...w, [day]: [...w[day], { from, to: `${String(h).padStart(2, "0")}:${from.slice(3)}` }] };
    });
  const removeSlot = (day, i) => setWeekly((w) => ({ ...w, [day]: w[day].filter((_, j) => j !== i) }));
  const copyMonday = () => {
    setWeekly((w) => ({ ...w, ...Object.fromEntries(WEEKDAYS.map((d) => [d, w.mon.map((s) => ({ ...s }))])) }));
    toast("Monday's hours copied to Tuesday–Friday");
  };

  const addOff = () => {
    if (!newOff) return;
    if (!daysOff.includes(newOff)) setDaysOff((l) => [...l, newOff].sort());
    setNewOff("");
  };

  const save = () =>
    start(async () => {
      const r = await saveAvailability({ weekly, daysOff, bookingWindowDays: Number(windowDays) });
      if (!r.ok) return toast(r.error.message, { type: "error" });
      toast("Availability saved");
    });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Weekly hours"
          description="Times are in IST (India Standard Time)."
          action={
            <Button variant="outline" size="sm" onClick={copyMonday}>
              <Copy aria-hidden /> Copy Monday to weekdays
            </Button>
          }
        />
        <ul className="divide-y divide-line">
          {DAYS.map(([key, label]) => {
            const slots = weekly[key] || [];
            return (
              <li key={key} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start">
                <p className="w-28 shrink-0 pt-2 text-sm font-medium">{label}</p>
                <div className="flex-1 space-y-2">
                  {slots.length === 0 && <p className="pt-2 text-sm text-muted">Closed</p>}
                  {slots.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input type="time" value={s.from} onChange={(e) => setSlot(key, i, { from: e.target.value })} className="w-32" aria-label={`${label} from`} />
                      <span className="text-sm text-muted">to</span>
                      <Input type="time" value={s.to} onChange={(e) => setSlot(key, i, { to: e.target.value })} className="w-32" aria-label={`${label} to`} />
                      <button type="button" onClick={() => removeSlot(key, i)} aria-label={`Remove ${label} time range`} className="rounded-lg p-2 text-muted hover:bg-surface-muted hover:text-red-600">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <Button variant="ghost" size="sm" onClick={() => addSlot(key)} className="self-start">
                  <Plus aria-hidden /> Add hours
                </Button>
              </li>
            );
          })}
        </ul>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Days off" description="No bookings on these dates." />
          <div className="space-y-4 p-5">
            <div className="flex gap-2">
              <Input type="date" value={newOff} onChange={(e) => setNewOff(e.target.value)} aria-label="Add a day off" />
              <Button variant="outline" onClick={addOff} disabled={!newOff}>
                <Plus aria-hidden /> Add
              </Button>
            </div>
            {daysOff.length ? (
              <ul className="flex flex-wrap gap-2">
                {daysOff.map((d) => (
                  <li key={d} className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted py-1 pr-1 pl-3 text-sm">
                    <CalendarOff className="size-3.5 text-muted" aria-hidden />
                    {formatDate(`${d}T12:00:00+05:30`)}
                    <button type="button" onClick={() => setDaysOff((l) => l.filter((x) => x !== d))} aria-label={`Remove ${d}`} className="rounded-full p-1 text-muted hover:bg-surface hover:text-red-600">
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No days off added.</p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Booking window" />
          <div className="p-5">
            <Field label="How far ahead customers can book" htmlFor="window" hint="1 to 60 days">
              <div className="flex items-center gap-2">
                <Input id="window" type="number" min={1} max={60} value={windowDays} onChange={(e) => setWindowDays(e.target.value)} className="w-28" />
                <span className="text-sm text-muted">days</span>
              </div>
            </Field>
          </div>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button size="lg" onClick={save} loading={pending}>
          {!pending && <Save aria-hidden />} Save availability
        </Button>
      </div>
    </div>
  );
}
