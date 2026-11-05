"use client";

import { useState, useTransition } from "react";
import { Send, Save } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button, Card, CardHeader, Field, Input, Textarea } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { saveProfileDraft, submitProfile } from "./actions";
import { PhotoUpload } from "./PhotoUpload";

const LANGUAGES = ["Hindi", "English", "Punjabi", "Gujarati", "Marathi", "Bengali", "Tamil", "Telugu", "Kannada", "Malayalam", "Odia", "Sanskrit"];
const EXPERTISE = ["Vedic", "KP", "Lal Kitab", "Nadi", "Numerology", "Tarot", "Palmistry", "Vastu", "Prashna", "Kundli matching", "Face reading", "Gemology"];
const MIN_BIO = 50;

function Chips({ options, value, onChange, label }) {
  const toggle = (o) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(o)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              on ? "border-brand-500 bg-brand-50 font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-200" : "border-line text-muted hover:border-brand-300 hover:text-fg",
            )}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

export function ProfileForm({ profile, approvalStatus }) {
  const toast = useToast();
  const [v, setV] = useState({
    displayName: profile.displayName || "",
    headline: profile.headline || "",
    bio: profile.bio || "",
    experienceYears: profile.experienceYears ?? 0,
    city: profile.city || "",
    languages: profile.languages || [],
    expertise: profile.expertise || [],
  });
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState(null);
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e?.target ? e.target.value : e }));

  const go = (kind) => {
    setBusy(kind);
    start(async () => {
      const r = kind === "submit" ? await submitProfile(v) : await saveProfileDraft(v);
      setBusy(null);
      if (!r.ok) return toast(r.error.message, { type: "error" });
      toast(kind === "submit" ? "Profile sent for approval" : approvalStatus === "approved" ? "Saved. Your profile is back in review" : "Draft saved");
    });
  };

  const bioLen = v.bio.trim().length;

  return (
    <Card>
      <CardHeader title="Public profile" description="What customers see on your personal page." />
      <div className="space-y-5 p-5">
        <PhotoUpload photoUrl={profile.photoUrl} name={v.displayName} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Display name" htmlFor="pf-name">
            <Input id="pf-name" value={v.displayName} onChange={set("displayName")} maxLength={80} />
          </Field>
          <Field label="City" htmlFor="pf-city">
            <Input id="pf-city" value={v.city} onChange={set("city")} maxLength={60} />
          </Field>
        </div>

        <Field label="Headline" htmlFor="pf-headline" hint="One line, e.g. “Vedic astrologer · Career & marriage”">
          <Input id="pf-headline" value={v.headline} onChange={set("headline")} maxLength={120} />
        </Field>

        <Field
          label="About you"
          htmlFor="pf-bio"
          hint={`${bioLen}/1500 · at least ${MIN_BIO} characters to submit`}
          error={bioLen > 0 && bioLen < MIN_BIO ? `${MIN_BIO - bioLen} more characters needed to submit` : undefined}
        >
          <Textarea id="pf-bio" rows={5} value={v.bio} onChange={set("bio")} maxLength={1500} />
        </Field>

        <Field label="Experience (years)" htmlFor="pf-exp" className="max-w-40">
          <Input id="pf-exp" type="number" min={0} max={70} value={v.experienceYears} onChange={set("experienceYears")} />
        </Field>

        <Field label="Languages">
          <Chips label="Languages" options={LANGUAGES} value={v.languages} onChange={set("languages")} />
        </Field>

        <Field label="Expertise">
          <Chips label="Expertise" options={EXPERTISE} value={v.expertise} onChange={set("expertise")} />
        </Field>

        {approvalStatus === "approved" && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            Editing an approved profile sends it for review again; your page stays on the last approved version until then.
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
          <Button variant="outline" onClick={() => go("draft")} loading={pending && busy === "draft"} disabled={pending}>
            {!(pending && busy === "draft") && <Save aria-hidden />} Save draft
          </Button>
          <Button onClick={() => go("submit")} loading={pending && busy === "submit"} disabled={pending}>
            {!(pending && busy === "submit") && <Send aria-hidden />} Submit for approval
          </Button>
        </div>
      </div>
    </Card>
  );
}
