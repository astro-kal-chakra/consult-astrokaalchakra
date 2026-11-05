"use server";

import { run } from "@/lib/action";
import { PHOTO_MAX_BYTES, SaasError } from "@/lib/data/saas";
import { removeProfilePhoto, setProfilePhoto, updateProfile } from "@/lib/data/astro";

const FIELDS = ["displayName", "headline", "bio", "experienceYears", "city", "languages", "expertise"];

/** Keeps only the editable profile fields (nothing else from the browser is trusted). */
function pick(input) {
  const out = {};
  for (const k of FIELDS) if (input?.[k] !== undefined) out[k] = input[k];
  if (out.displayName !== undefined) out.displayName = String(out.displayName).trim().slice(0, 80);
  if (out.headline !== undefined) out.headline = String(out.headline).trim().slice(0, 120);
  if (out.bio !== undefined) out.bio = String(out.bio).trim().slice(0, 1500);
  if (out.city !== undefined) out.city = String(out.city).trim().slice(0, 60);
  if (out.experienceYears !== undefined) out.experienceYears = Math.max(0, Math.min(70, Math.round(Number(out.experienceYears) || 0)));
  if (out.languages !== undefined) out.languages = (Array.isArray(out.languages) ? out.languages : []).map(String).slice(0, 12);
  if (out.expertise !== undefined) out.expertise = (Array.isArray(out.expertise) ? out.expertise : []).map(String).slice(0, 12);
  return out;
}

export async function saveProfileDraft(input) {
  return run((id) => updateProfile(id, pick(input)), "/dashboard/profile");
}

export async function submitProfile(input) {
  return run((id) => updateProfile(id, pick(input), { submit: true }), "/dashboard/profile");
}

/** The real image type from the file's first bytes (the browser's claimed type isn't trusted). */
function sniff(b) {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  return null;
}

/** Profile photo: goes live at once, no approval needed (the photo is resized in the browser first). */
export async function uploadPhoto(formData) {
  return run(async (id) => {
    const file = formData?.get?.("photo");
    if (!file || typeof file.arrayBuffer !== "function" || !file.size) throw new SaasError("Please choose a photo", "BAD_PHOTO");
    if (file.size > PHOTO_MAX_BYTES) throw new SaasError("This photo is too large. Please choose a smaller one.", "BAD_PHOTO");
    const data = Buffer.from(await file.arrayBuffer());
    const type = sniff(data);
    if (!type) throw new SaasError("Please choose a JPG, PNG or WebP photo", "BAD_PHOTO");
    return setProfilePhoto(id, { data, type });
  }, "/dashboard/profile");
}

export async function deletePhoto() {
  return run((id) => removeProfilePhoto(id), "/dashboard/profile");
}
