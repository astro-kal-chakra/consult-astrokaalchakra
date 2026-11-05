import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAccount } from "@/lib/data/astro";
import { generateKundali, matching } from "@/lib/kundali";
import { isLang } from "@/lib/kundali/i18n";
import { cleanMuhurat, cleanPanchang, dayPanchang, findMuhurat } from "@/lib/kundali/muhurat";
import { kundaliPdf, matchPdf, muhuratPdf, panchangPdf } from "@/lib/kundali/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST { type: "kundali", input, lang, style, node, varshYear }, { type: "match", boy, girl, lang, style, node },
 * { type: "muhurat", query, lang } or { type: "panchang", date, place, lang } → application/pdf. Signed-in, verified astrologers only. The kundali is calculated again here from the birth
 * details, so the PDF never trusts numbers sent by the browser.
 */
export async function POST(req) {
  const s = await getSession();
  if (!s || s.role !== "astrologer") return NextResponse.json({ error: "SIGNED_OUT" }, { status: 401 });
  // Same-origin form posts only (no cross-site requests riding on the session cookie)
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  let account;
  try {
    account = await getAccount(s.id);
  } catch {
    return NextResponse.json({ error: "SIGNED_OUT" }, { status: 401 });
  }
  if (!account?.verified) return NextResponse.json({ error: "NOT_VERIFIED" }, { status: 403 });

  let body;
  try {
    const text = await req.text();
    if (text.length > 20000) return NextResponse.json({ error: "TOO_LARGE" }, { status: 413 });
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }
  const lang = isLang(body?.lang) ? body.lang : "en";
  const style = body?.style === "south" ? "south" : "north";
  const node = body?.node === "true" ? "true" : "mean";
  const varshYear = Number.isInteger(body?.varshYear) && body.varshYear >= 1800 && body.varshYear <= 2300 ? body.varshYear : undefined;
  const by = String(account.displayName || account.name || "").slice(0, 80) || undefined;

  let pdf;
  try {
    if (body?.type === "muhurat") {
      const q = cleanMuhurat(body.query);
      pdf = await muhuratPdf({ ...q, ...findMuhurat(q) }, { lang, by });
    } else if (body?.type === "panchang") {
      const q = cleanPanchang(body.date, body.place);
      pdf = await panchangPdf({ place: q.place, ...dayPanchang(q.date, q.place) }, { lang, by });
    } else if (body?.type === "match") {
      const boy = generateKundali(body.boy, { node });
      const girl = generateKundali(body.girl, { node });
      pdf = await matchPdf({ boy, girl, match: matching(boy, girl) }, { lang, style, by });
    } else {
      const k = generateKundali(body?.input, { node, varshYear });
      pdf = await kundaliPdf(k, { lang, style, by });
    }
  } catch (err) {
    if (["NAME", "DATE", "TIME", "PLACE", "COORDS", "TZ", "EVENT", "RANGE"].includes(err?.message)) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("kundali pdf failed", err);
    return NextResponse.json({ error: "PDF_FAILED" }, { status: 500 });
  }
  return new NextResponse(pdf, {
    status: 200,
    headers: { "content-type": "application/pdf", "content-disposition": 'attachment; filename="kundali.pdf"', "cache-control": "no-store", "content-length": String(pdf.length) },
  });
}
