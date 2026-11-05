import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { SaasError } from "@/lib/data/saas";
import { getRoom } from "@/lib/data/customer-data";
import { Room } from "./Room";

export const metadata = { title: "Consultation" };
export const dynamic = "force-dynamic";

/** The consultation room, shared by the customer and the astrologer of this session (nobody else). */
export default async function SessionPage({ params }) {
  const { id } = await params;
  const s = await getSession();
  if (!s) redirect(`/login?as=customer&next=${encodeURIComponent(`/session/${id}`)}`);
  let room;
  try {
    room = await getRoom(id, { id: s.id, role: s.role });
  } catch (err) {
    if (err instanceof SaasError && ["NOT_FOUND", "VALIDATION_ERROR"].includes(err.code)) notFound();
    throw err;
  }
  return <Room initial={room} role={s.role} />;
}
