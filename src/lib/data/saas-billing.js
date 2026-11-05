import "server-only";
import { getSubscription } from "./saas";

/** When a period bought right now would start: after the last paid period, or now (same rule as purchasePlan). */
export function nextPeriodStart(id) {
  const now = Date.now();
  const lastEnd = getSubscription(id).periods.reduce((m, p) => Math.max(m, new Date(p.endsAt).getTime()), 0);
  const start = Math.max(now, lastEnd);
  return { startsAt: new Date(start).toISOString(), startsNow: start <= now };
}
