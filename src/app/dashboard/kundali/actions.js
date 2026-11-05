"use server";

import { run } from "@/lib/action";
import { requireAstrologer } from "@/lib/auth/guard";
import { api, isLive } from "@/lib/backend";
import { addKundali, removeKundali } from "@/lib/data/astro";
import { generateKundali, matching } from "@/lib/kundali";
import { searchCities } from "@/lib/kundali/cities";
import { cleanMuhurat, cleanPanchang, dayPanchang, findMuhurat } from "@/lib/kundali/muhurat";

/**
 * Kundali Generator server actions. Calculations run on this server (pure functions of the birth details); the
 * astrologer must be signed in. Errors come back as { ok: false, code } with codes from cleanInput().
 */

const opts = (o) => ({ node: o?.node === "true" ? "true" : "mean", varshYear: Number.isInteger(o?.varshYear) && o.varshYear >= 1800 && o.varshYear <= 2300 ? o.varshYear : undefined });

const num = (v) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));

function codeOf(err) {
  const c = err?.message;
  return ["NAME", "DATE", "TIME", "PLACE", "COORDS", "TZ"].includes(c) ? c : "generic";
}

export async function generateKundaliAction(input, o) {
  await requireAstrologer();
  try {
    return { ok: true, data: generateKundali(input, opts(o)) };
  } catch (err) {
    return { ok: false, code: codeOf(err) };
  }
}

export async function matchKundaliAction(boy, girl, o) {
  await requireAstrologer();
  let kb;
  try {
    kb = generateKundali(boy, opts(o));
  } catch (err) {
    return { ok: false, who: "boy", code: codeOf(err) };
  }
  try {
    const kg = generateKundali(girl, opts(o));
    return { ok: true, data: { boy: kb, girl: kg, match: matching(kb, kg) } };
  } catch (err) {
    return { ok: false, who: "girl", code: codeOf(err) };
  }
}

// ------------------------------------------------------------------ muhurat and panchang

const muCode = (err) => (["EVENT", "PLACE", "DATE", "RANGE"].includes(err?.message) ? err.message : "generic");

export async function muhuratAction(q) {
  await requireAstrologer();
  try {
    const c = cleanMuhurat(q);
    return { ok: true, data: { ...c, ...findMuhurat(c) } };
  } catch (err) {
    return { ok: false, code: muCode(err) };
  }
}

export async function dayPanchangAction(date, place) {
  await requireAstrologer();
  try {
    const c = cleanPanchang(date, place);
    return { ok: true, data: { place: c.place, ...dayPanchang(c.date, c.place) } };
  } catch (err) {
    return { ok: false, code: muCode(err) };
  }
}

/** Birth place search: the backend's place list (live), otherwise the built-in cities. */
export async function searchPlacesAction(q) {
  await requireAstrologer();
  const s = String(q || "").trim().slice(0, 60);
  if (s.length < 2) return [];
  if (isLive()) {
    try {
      const list = await api(`/web/places/search?q=${encodeURIComponent(s)}`, { auth: false, timeoutMs: 6000 });
      if (Array.isArray(list) && list.length) return list.slice(0, 10).map((p) => ({ id: String(p.id), name: String(p.name), region: String(p.region || ""), lat: Number(p.lat), lng: Number(p.lng), timezone: String(p.timezone || "Asia/Kolkata") }));
    } catch {
      // fall back to the built-in list
    }
  }
  return searchCities(s);
}

export async function saveKundaliAction(input) {
  const i = input || {};
  const place = i.place || {};
  return run(
    (id) =>
      addKundali(id, {
        name: String(i.name || ""),
        gender: i.gender === "male" || i.gender === "female" ? i.gender : "",
        dob: String(i.date || ""),
        tob: i.time ? String(i.time) : null,
        place: String(place.name || ""),
        region: String(place.region || ""),
        lat: num(place.lat),
        lng: num(place.lng),
        tz: place.timezone ? String(place.timezone) : null,
      }),
    "/dashboard/kundali",
  );
}

export async function deleteKundaliAction(kundaliId) {
  return run((id) => removeKundali(id, String(kundaliId || "")), "/dashboard/kundali");
}
