"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/cn";

const Ctx = createContext(() => {});

/** toast("Saved") or toast("Could not save", { type: "error" }) */
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const toast = useCallback((message, { type = "success" } = {}) => {
    const id = Math.random().toString(36).slice(2);
    setItems((l) => [...l, { id, message, type }]);
    setTimeout(() => setItems((l) => l.filter((x) => x.id !== id)), 3500);
  }, []);
  return (
    <Ctx.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6" aria-live="polite">
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex max-w-md animate-dialog-in items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-lg",
              t.type === "error" ? "bg-red-600" : "bg-brand-800",
            )}
          >
            {t.type === "error" ? <AlertTriangle className="size-4 shrink-0" /> : <CheckCircle2 className="size-4 shrink-0" />}
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
