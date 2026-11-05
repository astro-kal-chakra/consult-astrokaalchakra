"use client";

import { useActionState } from "react";
import { ArrowLeft, KeyRound, Phone } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";
import { requestOtp, verifyOtp } from "./actions";

/** `as`: "astrologer" | "customer" (wording + which numbers are accepted). `next`: where to go after login. */
export function LoginForm({ as = "astrologer", next = "" }) {
  const [phoneState, sendAction, sending] = useActionState(requestOtp, { step: "phone" });
  const [otpState, verifyAction, verifying] = useActionState(verifyOtp, null);
  // The OTP step shows once a number was accepted; a failed verify can send the user back to the number step
  const step = otpState?.step === "phone" ? "phone" : phoneState.step;
  const phone = otpState?.phone || phoneState.phone;
  const error = step === "otp" ? otpState?.error : otpState?.step === "phone" ? otpState.error : phoneState.error;

  if (step === "otp") {
    return (
      <form action={verifyAction} className="space-y-4" noValidate>
        <input type="hidden" name="phone" value={phone} />
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="as" value={as} />
        <p className="text-sm text-muted">
          Code sent to <span className="font-medium text-fg">+91 {phone}</span>
        </p>
        <Field label="OTP" htmlFor="otp" error={error} hint={phoneState.info}>
          <Input id="otp" name="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="6-digit code" autoFocus aria-invalid={Boolean(error)} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={verifying}>
          {!verifying && <KeyRound aria-hidden />} Verify &amp; sign in
        </Button>
        <button type="button" onClick={() => window.location.reload()} className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
          <ArrowLeft className="size-4" /> Use a different number
        </button>
      </form>
    );
  }

  return (
    <form action={sendAction} className="space-y-4" noValidate>
      <input type="hidden" name="as" value={as} />
      <Field
        label={as === "customer" ? "Mobile number" : "Registered mobile number"}
        htmlFor="phone"
        error={error}
        hint={as === "customer" ? "Your Astro Kaal Chakra account, with the same login and wallet as the app." : "The number you use in the KaalChakra Astro app."}
      >
        <div className="flex">
          <span className="inline-flex items-center rounded-l-xl border border-r-0 border-line bg-surface-muted px-3 text-sm text-muted">+91</span>
          <Input id="phone" name="phone" inputMode="numeric" autoComplete="tel-national" maxLength={10} placeholder="98XXXXXXXX" className="rounded-l-none" defaultValue={phoneState.phone} autoFocus aria-invalid={Boolean(error)} />
        </div>
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={sending}>
        {!sending && <Phone aria-hidden />} Send OTP
      </Button>
    </form>
  );
}
