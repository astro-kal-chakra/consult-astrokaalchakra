"use client";

import { useState, useTransition } from "react";
import { MessageCircle, Phone, Save, Video, Zap } from "lucide-react";
import { rupees } from "@/lib/format";
import { Button, Card, CardHeader, Field, Input, Select } from "@/components/ui";
import { Switch } from "@/components/ui/Switch";
import { useToast } from "@/components/ui/Toast";
import { saveServices } from "./actions";

const MODES = [
  { key: "chat", label: "Chat", icon: MessageCircle },
  { key: "audio", label: "Voice call", icon: Phone },
  { key: "video", label: "Video call", icon: Video },
];

export function ServicesForm({ services, limits }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [v, setV] = useState({
    chat: { enabled: services.chat.enabled, price: String(services.chat.price / 100) },
    audio: { enabled: services.audio.enabled, price: String(services.audio.price / 100) },
    video: { enabled: services.video.enabled, price: String(services.video.price / 100) },
    talkNow: services.talkNow,
    slotMinutes: services.slotMinutes,
  });
  const minR = limits.min / 100;
  const maxR = limits.max / 100;

  const setMode = (mode, patch) => setV((s) => ({ ...s, [mode]: { ...s[mode], ...patch } }));

  const save = () => {
    const payload = { talkNow: v.talkNow, slotMinutes: Number(v.slotMinutes) };
    for (const { key } of MODES) payload[key] = { enabled: v[key].enabled, price: Math.round(Number(v[key].price) * 100) };
    start(async () => {
      const r = await saveServices(payload);
      if (!r.ok) return toast(r.error.message, { type: "error" });
      toast("Services saved");
    });
  };

  const examplePrice = Math.round(Number(v.chat.price) * 100) || 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Consultation types & fees" description={`Price per minute, between ₹${minR} and ₹${maxR}.`} />
        <ul className="divide-y divide-line">
          {MODES.map(({ key, label, icon: Icon }) => {
            const m = v[key];
            const r = Number(m.price);
            const bad = m.enabled && (!r || r < minR || r > maxR);
            return (
              <li key={key} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-accent">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div className="min-w-32 flex-1">
                  <p className="font-medium">{label}</p>
                  <p className="text-xs text-muted">{m.enabled ? "Customers can book this" : "Switched off"}</p>
                </div>
                <div className="w-36">
                  <label htmlFor={`price-${key}`} className="sr-only">
                    {label} price per minute in rupees
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center rounded-l-xl border border-r-0 border-line bg-surface-muted px-2.5 text-sm text-muted">₹</span>
                    <Input
                      id={`price-${key}`}
                      type="number"
                      min={minR}
                      max={maxR}
                      step="1"
                      inputMode="decimal"
                      value={m.price}
                      disabled={!m.enabled}
                      onChange={(e) => setMode(key, { price: e.target.value })}
                      className="rounded-l-none"
                      aria-invalid={bad}
                    />
                  </div>
                  <p className="mt-1 text-right text-xs text-muted">per minute</p>
                </div>
                <Switch checked={m.enabled} onChange={(on) => setMode(key, { enabled: on })} label={`${label} on or off`} />
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <CardHeader title="Booking options" />
        <div className="space-y-5 p-5">
          <div className="flex items-start gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-accent">
              <Zap className="size-5" aria-hidden />
            </span>
            <div className="flex-1">
              <p className="font-medium">Talk now</p>
              <p className="text-sm text-muted">Customers can start instantly when you&apos;re online. You must accept within 2 minutes, or the request expires and nothing is charged.</p>
            </div>
            <Switch checked={v.talkNow} onChange={(on) => setV((s) => ({ ...s, talkNow: on }))} label="Talk now on or off" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Longest session customers can book" htmlFor="slot" hint="Customers choose 5, 10, 20, 30 min or 1 hour, up to this and your plan's limit.">
              <Select id="slot" value={v.slotMinutes} onChange={(e) => setV((s) => ({ ...s, slotMinutes: Number(e.target.value) }))}>
                {[5, 10, 20, 30, 60].map((n) => (
                  <option key={n} value={n}>
                    {n === 60 ? "1 hour" : `${n} minutes`}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Gap between sessions</p>
              <p className="flex h-10 items-center rounded-xl border border-line bg-surface-muted px-3 text-sm">10 minutes (fixed)</p>
              <p className="text-xs text-muted">Every booked session keeps 10 minutes free before and after it.</p>
            </div>
          </div>
          {examplePrice > 0 && (
            <p className="rounded-xl bg-surface-muted px-4 py-3 text-sm text-muted">
              Example: a 30-min chat at {rupees(examplePrice)}/min = <span className="font-semibold text-fg">{rupees(examplePrice * 30)}</span> (charged per minute from the customer&apos;s wallet during the session; nothing charged if it doesn&apos;t happen).
            </p>
          )}
        </div>
      </Card>

      <div className="flex justify-end">
        <Button size="lg" onClick={save} loading={pending}>
          {!pending && <Save aria-hidden />} Save services
        </Button>
      </div>
    </div>
  );
}
