"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from "lucide-react";
import { Button } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { roomCallToken } from "./actions";

/**
 * Voice / video for a personal consultation (Agora, same system as the apps). The token comes from the backend
 * for this session only, and only while it is active. The SDK loads only when someone joins the call.
 */
export function CallPanel({ sessionId, mode, active }) {
  const toast = useToast();
  const [state, setState] = useState("idle"); // idle | joining | in | unavailable
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [remote, setRemote] = useState(false);
  const rtc = useRef({ client: null, mic: null, cam: null });
  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const isVideo = mode === "video";

  const leave = useCallback(async () => {
    const { client, mic, cam } = rtc.current;
    mic?.close();
    cam?.close();
    rtc.current = { client: null, mic: null, cam: null };
    if (client) await client.leave().catch(() => {});
    setRemote(false);
    setState((s) => (s === "unavailable" ? s : "idle"));
  }, []);

  // Leave when the session ends or the page closes
  useEffect(() => {
    if (active) return undefined;
    const t = setTimeout(() => void leave(), 0);
    return () => clearTimeout(t);
  }, [active, leave]);
  useEffect(() => () => void leave(), [leave]);

  const join = async () => {
    setState("joining");
    try {
      const r = await roomCallToken(sessionId);
      if (!r.ok) {
        if (r.error.code === "NOT_CONFIGURED") return setState("unavailable");
        toast(r.error.message, { type: "error" });
        return setState("idle");
      }
      const { appId, channelName, uid, token } = r.data;
      const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
      AgoraRTC.setLogLevel(3);
      const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      client.on("user-published", async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        if (mediaType === "audio") user.audioTrack?.play();
        if (mediaType === "video" && remoteRef.current) user.videoTrack?.play(remoteRef.current);
        setRemote(true);
      });
      client.on("user-left", () => setRemote(false));
      await client.join(appId, channelName, token, uid);
      const mic = await AgoraRTC.createMicrophoneAudioTrack();
      const cam = isVideo ? await AgoraRTC.createCameraVideoTrack() : null;
      if (cam && localRef.current) cam.play(localRef.current);
      await client.publish(cam ? [mic, cam] : [mic]);
      rtc.current = { client, mic, cam };
      setState("in");
    } catch (err) {
      await leave();
      const denied = /permission|NotAllowed/i.test(String(err?.message || err?.name || ""));
      toast(denied ? "Please allow microphone" + (isVideo ? " and camera" : "") + " access in your browser, then try again." : "Couldn't connect the call. Please try again.", { type: "error" });
    }
  };

  const toggleMic = async () => {
    await rtc.current.mic?.setEnabled(!micOn);
    setMicOn(!micOn);
  };
  const toggleCam = async () => {
    await rtc.current.cam?.setEnabled(!camOn);
    setCamOn(!camOn);
  };

  if (state === "unavailable")
    return <p className="border-b border-line bg-surface-muted px-4 py-3 text-sm text-muted">{isVideo ? "Video" : "Voice"} calls work once this site is connected to the live system. Chat below works now.</p>;

  return (
    <div className="border-b border-line bg-surface-muted px-4 py-3">
      {isVideo && (
        <div className={state === "in" ? "mb-3 grid gap-2 sm:grid-cols-[1fr_180px]" : "hidden"}>
          <div ref={remoteRef} className="relative aspect-video overflow-hidden rounded-xl bg-black">
            {!remote && <p className="absolute inset-0 flex items-center justify-center text-sm text-white/70">Waiting for the other person to join the call…</p>}
          </div>
          <div ref={localRef} className="aspect-video overflow-hidden rounded-xl bg-black/80" aria-label="Your camera" />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {state !== "in" ? (
          <Button size="sm" onClick={join} loading={state === "joining"} disabled={!active}>
            {state !== "joining" && (isVideo ? <Video aria-hidden /> : <Phone aria-hidden />)} Join {isVideo ? "video" : "voice"} call
          </Button>
        ) : (
          <>
            <span className="mr-1 font-medium text-green-700 dark:text-green-400">{remote ? "Connected" : "Calling…"}</span>
            <Button size="sm" variant="outline" onClick={toggleMic} aria-pressed={!micOn}>
              {micOn ? <Mic aria-hidden /> : <MicOff aria-hidden />} {micOn ? "Mute" : "Unmute"}
            </Button>
            {isVideo && (
              <Button size="sm" variant="outline" onClick={toggleCam} aria-pressed={!camOn}>
                {camOn ? <Video aria-hidden /> : <VideoOff aria-hidden />} {camOn ? "Camera off" : "Camera on"}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={leave}>
              <PhoneOff aria-hidden /> Leave call
            </Button>
          </>
        )}
        {!active && <span className="text-muted">The call opens when the consultation starts.</span>}
      </div>
    </div>
  );
}
