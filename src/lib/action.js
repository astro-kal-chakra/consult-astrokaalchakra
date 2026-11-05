import "server-only";
import { revalidatePath } from "next/cache";
import { requireAstrologer, requireCustomer } from "@/lib/auth/guard";
import { SaasError } from "@/lib/data/saas";

/**
 * Runs a dashboard server action for the signed-in astrologer and returns { ok, data } or { ok: false, error }.
 * The account id always comes from the verified session cookie — never from the browser.
 *   export async function save(input) { "use server"; return run((id) => updateX(id, input), "/dashboard/x"); }
 */
export async function run(fn, ...paths) {
  const { id } = await requireAstrologer();
  try {
    const data = await fn(id);
    revalidatePath("/dashboard", "layout");
    paths.forEach((p) => revalidatePath(p));
    return { ok: true, data: data === undefined ? null : JSON.parse(JSON.stringify(data)) };
  } catch (err) {
    if (err instanceof SaasError) return { ok: false, error: { message: err.message, code: err.code } };
    throw err;
  }
}

/** Same as run() for the signed-in CUSTOMER (personal pages, bookings, sessions). */
export async function runCustomer(fn, ...paths) {
  const { id } = await requireCustomer();
  try {
    const data = await fn(id);
    paths.forEach((p) => revalidatePath(p));
    return { ok: true, data: data === undefined ? null : JSON.parse(JSON.stringify(data)) };
  } catch (err) {
    if (err instanceof SaasError) return { ok: false, error: { message: err.message, code: err.code } };
    throw err;
  }
}
