"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { CircleAlert, CircleCheck, X } from "lucide-react";

type ToastKind = "success" | "error";
interface Toast { id: number; kind: ToastKind; text: string }
interface Ctx { toast: (text: string, kind?: ToastKind) => void }

const ToastCtx = createContext<Ctx>({ toast: () => {} });
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), []);
  const toast = useCallback(
    (text: string, kind: ToastKind = "success") => {
      const id = ++seq.current;
      setItems((l) => [...l.slice(-3), { id, kind, text }]);
      setTimeout(() => dismiss(id), kind === "error" ? 6000 : 3500);
    },
    [dismiss],
  );
  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6" aria-live="polite">
        {items.map((t) => (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            className={`anim-pop pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium shadow-[var(--shadow-pop)] ${
              t.kind === "error" ? "bg-[#7f1d1d] text-white" : "bg-brand-900 text-white"
            }`}
          >
            {t.kind === "error" ? <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> : <CircleCheck className="mt-0.5 size-4 shrink-0 text-brand-300" aria-hidden />}
            <span className="min-w-0 flex-1">{t.text}</span>
            <button type="button" onClick={() => dismiss(t.id)} aria-label="Đóng thông báo" className="-m-1 grid size-7 place-items-center rounded-lg hover:bg-white/10">
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
