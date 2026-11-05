"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { deletePhoto, uploadPhoto } from "./actions";

const SIZE = 512; // square, enough for every place the photo is shown
const MAX_PICK_BYTES = 15 * 1024 * 1024;

/**
 * Crops the picked image to a centred square and re-encodes it as JPEG in the browser: small upload, and the
 * phone's hidden data (GPS location, camera details) is not sent.
 */
async function toSquareJpeg(file) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = Math.min(SIZE, side);
  canvas
    .getContext("2d")
    .drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.88));
}

export function PhotoUpload({ photoUrl, name }) {
  const toast = useToast();
  const input = useRef(null);
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState(null);
  const initials = (name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  const pick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return toast("Please choose a JPG, PNG or WebP photo", { type: "error" });
    if (file.size > MAX_PICK_BYTES) return toast("This photo is too large (15 MB max)", { type: "error" });
    setBusy("upload");
    start(async () => {
      try {
        const fd = new FormData();
        fd.append("photo", await toSquareJpeg(file), "photo.jpg");
        const r = await uploadPhoto(fd);
        if (!r.ok) return toast(r.error.message, { type: "error" });
        toast("Photo updated");
      } catch {
        toast("Couldn't read this photo. Please try another one.", { type: "error" });
      } finally {
        setBusy(null);
      }
    });
  };

  const remove = () => {
    setBusy("remove");
    start(async () => {
      try {
        const r = await deletePhoto();
        if (!r.ok) return toast(r.error.message, { type: "error" });
        toast("Photo removed");
      } catch {
        toast("Couldn't remove the photo. Please try again.", { type: "error" });
      } finally {
        setBusy(null);
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- our own uploaded photo
        <img src={photoUrl} alt="Your profile photo" className="size-20 shrink-0 rounded-full object-cover ring-2 ring-brand-100 dark:ring-brand-900" />
      ) : (
        <span className="flex size-20 shrink-0 items-center justify-center rounded-full bg-brand-100 text-2xl font-semibold text-brand-700 dark:bg-brand-900/50 dark:text-brand-200" aria-hidden>
          {initials}
        </span>
      )}
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium">Profile photo</p>
        <p className="text-xs text-muted">Shows on your personal page right away. No approval needed. JPG, PNG or WebP.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={pick} tabIndex={-1} aria-hidden />
          <Button size="sm" variant="outline" onClick={() => input.current?.click()} loading={pending && busy === "upload"} disabled={pending}>
            {!(pending && busy === "upload") && <Camera aria-hidden />} {photoUrl ? "Change photo" : "Upload photo"}
          </Button>
          {photoUrl && (
            <Button size="sm" variant="ghost" onClick={remove} loading={pending && busy === "remove"} disabled={pending}>
              {!(pending && busy === "remove") && <Trash2 aria-hidden />} Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
