"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { Button } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { startBookingAction } from "./actions";

const WINDOW_BEFORE = 10 * 60_000;
const WINDOW_AFTER = 2 * 60_000;

/** "Start session": only from 10 min before to 2 min after the booked time (the server checks again). */
export function StartBooking({ booking }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [now, setNow] = useState(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 15_000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);
  if (now === null) return null;
  const at = new Date(booking.scheduledAt).getTime();
  const open = now >= at - WINDOW_BEFORE && now <= at + WINDOW_AFTER;
  if (!open) return now < at - WINDOW_BEFORE ? <span className="self-center text-xs text-muted">You can start 10 min before</span> : null;

  const go = () =>
    start(async () => {
      try {
        const r = await startBookingAction(booking.id);
        if (!r.ok) {
          toast(r.error.message, { type: "error" });
          if (r.error.code === "MISSED" || r.error.code === "NOT_UPCOMING") router.refresh();
          return;
        }
        router.push(`/session/${r.data.id}`);
      } catch {
        toast("Couldn't start the session. Please check your connection and try again.", { type: "error" });
      }
    });
  return (
    <Button size="sm" onClick={go} loading={pending}>
      {!pending && <Play aria-hidden />} Start session
    </Button>
  );
}
