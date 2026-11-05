import { MessageCircle, Phone, Video } from "lucide-react";

/** Consultation types shown across the dashboard. */
export const MODES = {
  chat: { label: "Chat", icon: MessageCircle },
  audio: { label: "Voice call", icon: Phone },
  video: { label: "Video call", icon: Video },
};
