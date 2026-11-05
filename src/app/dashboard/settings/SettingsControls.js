"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader } from "@/components/ui";
import { Switch } from "@/components/ui/Switch";
import { useToast } from "@/components/ui/Toast";
import { saveNotifications, savePersonalEnabled } from "./actions";

const NOTIFS = [
  { key: "newBooking", label: "New bookings", sub: "When a customer books a personal consultation" },
  { key: "cancellations", label: "Cancellations", sub: "When a customer cancels a booking" },
  { key: "reminders", label: "Session reminders", sub: "Before each booked session" },
  { key: "payouts", label: "Payouts", sub: "When a payout is approved, paid or rejected" },
  { key: "feedback", label: "Feedback", sub: "When a customer leaves feedback" },
];

export function PersonalSwitch({ enabled }) {
  const toast = useToast();
  const [on, setOn] = useState(enabled);
  const [pending, start] = useTransition();
  const change = (next) => {
    setOn(next);
    start(async () => {
      const r = await savePersonalEnabled(next);
      if (!r.ok) {
        setOn(!next);
        return toast(r.error.message, { type: "error" });
      }
      toast(next ? "Personal consultations switched on" : "Personal consultations switched off. You're offline");
    });
  };
  return (
    <Card className="p-5">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <p className="font-semibold">Accept personal consultations</p>
          <p className="mt-0.5 text-sm text-muted">
            When off, your page stays visible but customers can&apos;t book, and your personal service goes offline. Your marketplace work is not affected.
          </p>
        </div>
        <Switch checked={on} onChange={change} disabled={pending} label="Accept personal consultations" />
      </div>
    </Card>
  );
}

export function NotificationSettings({ notifications }) {
  const toast = useToast();
  const [v, setV] = useState(notifications);
  const [, start] = useTransition();
  const change = (key, next) => {
    setV((s) => ({ ...s, [key]: next }));
    start(async () => {
      const r = await saveNotifications({ [key]: next });
      if (!r.ok) {
        setV((s) => ({ ...s, [key]: !next }));
        return toast(r.error.message, { type: "error" });
      }
      toast("Notification settings saved");
    });
  };
  return (
    <Card>
      <CardHeader title="Notifications" description="Push and in-app alerts for your personal service." />
      <ul className="divide-y divide-line">
        {NOTIFS.map((n) => (
          <li key={n.key} className="flex items-center gap-4 px-5 py-3">
            <div className="flex-1">
              <p className="text-sm font-medium">{n.label}</p>
              <p className="text-xs text-muted">{n.sub}</p>
            </div>
            <Switch checked={Boolean(v[n.key])} onChange={(next) => change(n.key, next)} label={n.label} />
          </li>
        ))}
      </ul>
    </Card>
  );
}
