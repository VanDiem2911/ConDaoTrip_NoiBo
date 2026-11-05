/** Khung chờ hiện ngay khi chuyển trang (Next stream phần dữ liệu về sau) — giảm cảm giác chậm */
export default function Loading() {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Đang tải…</span>
      <div className="mb-6 space-y-2">
        <div className="h-8 w-64 animate-pulse rounded-xl bg-brand-100" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded-lg bg-brand-100/70" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="glass h-[112px] animate-pulse rounded-3xl" />
        ))}
      </div>
      <div className="glass mt-5 h-[340px] animate-pulse rounded-3xl" />
    </div>
  );
}
