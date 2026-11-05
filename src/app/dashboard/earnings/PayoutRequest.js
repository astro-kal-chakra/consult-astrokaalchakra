"use client";

import { useEffect, useState, useTransition } from "react";
import { Banknote, BadgeCheck } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { rupees } from "@/lib/format";
import { previewPayout, submitPayout } from "./actions";

/** "Request payout" button + dialog with a live breakdown from the server. */
export function PayoutRequest({ balance, rules, method }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [preview, setPreview] = useState(null);
  const [pending, start] = useTransition();
  const paise = Math.round(Number(value) * 100) || 0;

  useEffect(() => {
    if (!open || paise <= 0) return;
    let live = true;
    const t = setTimeout(async () => {
      try {
        const r = await previewPayout(paise);
        if (live && r.ok) setPreview(r.data);
      } catch {
        // The preview is only a hint; the request itself is checked again on the server.
      }
    }, 300);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [open, paise]);

  const shown = paise > 0 && preview?.amount === paise ? preview : null;
  const tooLow = paise > 0 && paise < rules.minPayout;
  const tooHigh = paise > balance;

  const submit = () =>
    start(async () => {
      try {
        const r = await submitPayout(paise);
        if (!r.ok) return toast(r.error.message, { type: "error" });
        toast(`Payout of ${rupees(paise)} requested`);
        setOpen(false);
        setValue("");
        setPreview(null);
      } catch {
        toast("Couldn't send the payout request. Please check your connection and try again.", { type: "error" });
      }
    });

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={balance < rules.minPayout}>
        <Banknote aria-hidden /> Request payout
      </Button>
      <Modal open={open} onClose={() => !pending && setOpen(false)} title="Request payout" description={`Available: ${rupees(balance)} · minimum ${rupees(rules.minPayout)}`}>
        <div className="space-y-4">
          <Field label="Amount (₹)" htmlFor="po-amount" error={tooLow ? `Minimum payout is ${rupees(rules.minPayout)}` : tooHigh ? "More than your available balance" : undefined}>
            <div className="flex gap-2">
              <Input id="po-amount" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ""))} placeholder="e.g. 2000" aria-invalid={tooLow || tooHigh} autoFocus />
              <Button variant="outline" onClick={() => setValue(String(balance / 100))}>
                Max
              </Button>
            </div>
          </Field>

          {shown && (
            <dl className="space-y-2 rounded-xl bg-surface-muted p-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Amount</dt>
                <dd className="tabular-nums">{rupees(shown.amount, { decimals: true })}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">TDS ({shown.tdsPercent}%)</dt>
                <dd className="tabular-nums">− {rupees(shown.tds, { decimals: true })}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">
                  GST ({shown.gstPercent}%)
                  <span className="block text-xs">
                    {shown.gstApplies
                      ? `Applies because your SaaS earnings this financial year are above ${rupees(shown.gstThresholdFy)}`
                      : `Not applied (below ${rupees(shown.gstThresholdFy)} this financial year)`}
                  </span>
                </dt>
                <dd className="tabular-nums">{shown.gstApplies ? `− ${rupees(shown.gst, { decimals: true })}` : rupees(0)}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2 font-semibold">
                <dt>You receive</dt>
                <dd className="tabular-nums">{rupees(shown.net, { decimals: true })}</dd>
              </div>
            </dl>
          )}

          {method && (
            <div className="flex items-start gap-3 rounded-xl border border-line p-3 text-sm">
              <BadgeCheck className={`mt-0.5 size-5 shrink-0 ${method.verified ? "text-green-600" : "text-muted"}`} aria-hidden />
              <div>
                <p className="font-medium">
                  Bank account {method.accountMasked} · {method.ifsc}
                </p>
                <p className="text-xs text-muted">
                  {method.holder} · {method.verified ? "Verified" : "Not verified yet"}
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={submit} loading={pending} disabled={!paise || tooLow || tooHigh}>
              Request {paise ? rupees(paise) : "payout"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
