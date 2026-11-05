"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, KeyRound, Phone } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";
import { confirmPhoneCode, finishPhoneSignIn, firebaseErrorMessage, sendPhoneCode, warmUp } from "@/lib/firebase/phoneAuth";
import { checkLoginPhone, firebaseSignIn } from "./actions";

/**
 * Phone OTP through Firebase, exactly like the main website: Firebase sends and checks the code, the backend
 * verifies Firebase's token. `testing`: Firebase testing mode (backend FIREBASE_PROD=false, console test numbers).
 */
export function FirebaseLogin({ as = "astrologer", next = "", testing = false }) {
  const router = useRouter();
  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    warmUp();
  }, []);
  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const send = async (e) => {
    e?.preventDefault();
    setError("");
    setBusy(true);
    try {
      const check = await checkLoginPhone(phone, as);
      if (!check.ok) return setError(check.error);
      await sendPhoneCode(check.phone, { testing });
      setPhone(check.phone);
      setStep("otp");
      setResendIn(30);
    } catch (err) {
      setError(firebaseErrorMessage(err?.code) || "Couldn't send the OTP. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) return setError("Enter the 6-digit OTP.");
    setError("");
    setBusy(true);
    try {
      const idToken = await confirmPhoneCode(phone, otp);
      const r = await firebaseSignIn(as, idToken, next);
      if (!r.ok) {
        setBusy(false);
        return setError(r.error);
      }
      await finishPhoneSignIn();
      router.replace(r.to);
      router.refresh();
    } catch (err) {
      setBusy(false);
      setError(firebaseErrorMessage(err?.code) || err?.message || "Couldn't sign you in. Please try again.");
    }
  };

  if (step === "otp") {
    return (
      <form onSubmit={verify} className="space-y-4" noValidate>
        <p className="text-sm text-muted">
          Code sent to <span className="font-medium text-fg">+91 {phone}</span>
        </p>
        <Field label="OTP" htmlFor="otp" error={error}>
          <Input id="otp" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="6-digit code" autoFocus aria-invalid={Boolean(error)} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          {!busy && <KeyRound aria-hidden />} Verify &amp; sign in
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <button
            type="button"
            onClick={() => {
              setStep("phone");
              setOtp("");
              setError("");
            }}
            className="inline-flex items-center gap-1 text-accent hover:underline"
          >
            <ArrowLeft className="size-4" /> Use a different number
          </button>
          <button type="button" onClick={send} disabled={resendIn > 0 || busy} className="text-accent hover:underline disabled:cursor-not-allowed disabled:text-muted disabled:no-underline">
            {resendIn > 0 ? `Resend OTP in ${resendIn}s` : "Resend OTP"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={send} className="space-y-4" noValidate>
      <Field
        label={as === "customer" ? "Mobile number" : "Registered mobile number"}
        htmlFor="phone"
        error={error}
        hint={as === "customer" ? "Your Astro Kaal Chakra account, with the same login and wallet as the app." : "The number you use in the KaalChakra Astro app."}
      >
        <div className="flex">
          <span className="inline-flex items-center rounded-l-xl border border-r-0 border-line bg-surface-muted px-3 text-sm text-muted">+91</span>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" autoComplete="tel-national" maxLength={10} placeholder="98XXXXXXXX" className="rounded-l-none" autoFocus aria-invalid={Boolean(error)} />
        </div>
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={busy}>
        {!busy && <Phone aria-hidden />} Send OTP
      </Button>
    </form>
  );
}
