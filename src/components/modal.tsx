"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "./ui";

/** Hộp thoại / ngăn kéo: ESC để đóng, khoá cuộn nền, trả focus về nút mở, focus vào hộp khi mở */
export function Modal({
  open, onClose, title, sub, children, footer, width = "max-w-lg", side = false,
}: {
  open: boolean; onClose: () => void; title: string; sub?: string; children: ReactNode; footer?: ReactNode; width?: string; side?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // giữ onClose mới nhất mà không chạy lại effect (tránh giật focus khi gõ phím trong form)
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab" && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className={cn("fixed inset-0 z-50 flex bg-brand-950/55 backdrop-blur-[3px]", side ? "justify-end" : "items-end justify-center sm:items-center sm:p-4")} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "anim-pop flex max-h-[92dvh] w-full flex-col bg-gold-50 shadow-[var(--shadow-pop)] outline-none",
          side ? "h-dvh max-h-dvh max-w-xl rounded-l-3xl" : cn("rounded-t-3xl sm:rounded-3xl", width),
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-bold tracking-tight text-ink">{title}</h2>
            {sub && <p className="mt-0.5 text-sm text-ink-3">{sub}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="-mr-2 grid size-10 shrink-0 place-items-center rounded-xl text-ink-2 hover:bg-brand-100">
            <X className="size-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4 sm:px-6">{footer}</div>}
      </div>
    </div>
  );
}
