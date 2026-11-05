import { cookies } from "next/headers";
import { requireAstrologer } from "@/lib/auth/guard";
import { listKundali } from "@/lib/data/astro";
import { isLang } from "@/lib/kundali/i18n";
import { KundaliStudio } from "./KundaliStudio";

export const metadata = { title: "Kundali" };

export default async function KundaliPage() {
  const { id } = await requireAstrologer();
  const [items, jar] = await Promise.all([listKundali(id), cookies()]);
  const lang = jar.get("kc_kundali_lang")?.value;
  const style = jar.get("kc_kundali_style")?.value;
  return <KundaliStudio saved={items} initialLang={isLang(lang) ? lang : "en"} initialStyle={style === "south" ? "south" : "north"} />;
}
