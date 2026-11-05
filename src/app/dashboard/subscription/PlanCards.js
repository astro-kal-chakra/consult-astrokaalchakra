"use client";

import { useState, useTransition } from "react";
import { Check, MessageCircle, Phone, ShieldCheck, Timer, Video } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatDate, rupees } from "@/lib/format";
import { buyPlan, confirmPlan } from "./actions";

/** Loads Razorpay Checkout once (only when a real payment starts). */
function loadCheckout() {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

/** Plan cards + confirm dialog. `nextStart`: when a newly bought period would start (ISO, from the server). */
export function PlanCards({ plans, nextStart, startsNow }) {
  const toast = useToast();
  const [plan, setPlan] = useState(null);
  const [pending, start] = useTransition();

  const done = ({ period, startsLater }, mock = false) => {
    const msg = startsLater ? `Plan purchased. Starts ${formatDate(period.startsAt)}` : "Plan purchased. Active now";
    toast(mock ? `Test mode (no Razorpay keys, nothing charged): ${msg}` : msg);
    setPlan(null);
  };

  const finish = (order, payment) =>
    start(async () => {
      try {
        const r = await confirmPlan({ orderId: order.orderId, ...payment });
        if (!r.ok) return toast(r.error.message, { type: "error" });
        done(r.data, order.mock);
      } catch {
        toast("We couldn't confirm the payment yet. If money was taken, your plan activates automatically; refresh in a minute.", { type: "error" });
      }
    });

  const confirm = () =>
    start(async () => {
      let r;
      try {
        r = await buyPlan(plan.id);
      } catch {
        return toast("Couldn't start the payment. Please check your connection and try again.", { type: "error" });
      }
      if (!r.ok) return toast(r.error.message, { type: "error" });
      if (r.data.demo) return done(r.data);
      const order = r.data;
      // Test server (no Razorpay keys): the mock gateway accepts this fixed signature
      if (order.mock) return finish(order, { razorpayPaymentId: `pay_mock_${Date.now()}`, signature: "mock_signature" });
      if (!(await loadCheckout())) return toast("Couldn't open the payment window. Please try again.", { type: "error" });
      new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: "Astro Kaal Chakra",
        description: `${order.plan.name} plan`,
        prefill: order.prefill,
        theme: { color: "#c2410c" },
        handler: (res) => finish(order, { razorpayPaymentId: res.razorpay_payment_id, signature: res.razorpay_signature }),
        modal: { ondismiss: () => toast("Payment cancelled. Nothing was charged.") },
      }).open();
    });

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((p) => (
          <Card key={p.id} className="flex flex-col p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold">{p.name}</h3>
                <p className="text-xs text-muted">
                  {p.months} month{p.months === 1 ? "" : "s"} of access
                </p>
              </div>
              {p.badge && <Badge tone="brand">{p.badge}</Badge>}
            </div>
            <p className="mt-4 text-3xl font-semibold tabular-nums">{rupees(p.price)}</p>
            <p className="text-xs text-muted">
              + GST {p.gstPercent}% ({rupees(p.gst)}) = <span className="font-medium text-fg">{rupees(p.total)}</span> · {rupees(p.perMonth)}/month
            </p>
            <ul className="mt-4 space-y-1.5 rounded-xl bg-surface-muted p-3 text-sm" aria-label="Sessions included per period">
              <li className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2"><MessageCircle className="size-4 text-accent" aria-hidden /> Chat sessions</span>
                <span className="font-semibold tabular-nums">{p.limits.chat}</span>
              </li>
              <li className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2"><Phone className="size-4 text-accent" aria-hidden /> Voice call sessions</span>
                <span className="font-semibold tabular-nums">{p.limits.audio}</span>
              </li>
              <li className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2"><Video className="size-4 text-accent" aria-hidden /> Video call sessions</span>
                <span className="font-semibold tabular-nums">{p.limits.video}</span>
              </li>
              <li className="flex items-center justify-between gap-2 border-t border-line pt-1.5 text-xs text-muted">
                <span className="flex items-center gap-2"><Timer className="size-3.5" aria-hidden /> Max length per session</span>
                <span>{p.maxSessionMinutes} min</span>
              </li>
            </ul>
            <ul className="mt-4 flex-1 space-y-2 text-sm">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-green-600" aria-hidden /> {f}
                </li>
              ))}
            </ul>
            <Button className="mt-5 w-full" onClick={() => setPlan(p)}>
              Buy {p.name}
            </Button>
          </Card>
        ))}
      </div>

      <Modal open={Boolean(plan)} onClose={() => !pending && setPlan(null)} title={plan ? `Buy ${plan.name} plan` : ""} description="Check the amount and start date before paying.">
        {plan && (
          <div className="space-y-4">
            <p className="text-sm">
              Includes <span className="font-medium">{plan.limits.chat} chat</span>, <span className="font-medium">{plan.limits.audio} voice</span> and{" "}
              <span className="font-medium">{plan.limits.video} video</span> sessions per {plan.months === 1 ? "month" : `${plan.months}-month period`}, up to {plan.maxSessionMinutes} min each.
            </p>
            <dl className="space-y-2 rounded-xl bg-surface-muted p-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Plan price</dt>
                <dd className="tabular-nums">{rupees(plan.price)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">GST ({plan.gstPercent}%)</dt>
                <dd className="tabular-nums">{rupees(plan.gst)}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2 font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{rupees(plan.total)}</dd>
              </div>
            </dl>
            <p className="text-sm">
              {startsNow ? (
                <>Your plan becomes <span className="font-medium">active right away</span>.</>
              ) : (
                <>
                  Starts automatically on <span className="font-medium">{formatDate(nextStart)}</span>, when your current paid period ends.
                </>
              )}
            </p>
            <p className="flex items-start gap-2 rounded-xl border border-dashed border-line p-3 text-xs text-muted">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
              You pay securely with Razorpay. Your plan activates only after the payment is verified. Nothing is charged automatically later.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPlan(null)} disabled={pending}>
                Cancel
              </Button>
              <Button onClick={confirm} loading={pending}>
                Pay {rupees(plan.total)}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
