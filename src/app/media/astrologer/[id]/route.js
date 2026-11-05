import { isLive } from "@/lib/backend";
import { getPhoto } from "@/lib/data/saas";

/**
 * An astrologer's profile photo in the demo store (public: it is shown on their personal page). The URL changes on
 * every upload. With the live backend, photos come from the backend's storage and this route does not exist.
 */
export async function GET(_request, { params }) {
  if (isLive()) return new Response("Not found", { status: 404 });
  const { id } = await params;
  const photo = getPhoto(id);
  if (!photo) return new Response("Not found", { status: 404 });
  return new Response(photo.data, {
    headers: {
      "Content-Type": photo.type,
      "Content-Length": String(photo.data.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
