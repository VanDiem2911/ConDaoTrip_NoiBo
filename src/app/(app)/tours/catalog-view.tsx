"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Clock, ExternalLink, Pencil, Plus, Search } from "lucide-react";
import { CategoryGlyph } from "@/components/nav-icon";
import { Modal } from "@/components/modal";
import { useAction, http } from "@/components/hooks";
import { Badge, Button, Card, Cover, Empty, Field, Input, cn } from "@/components/ui";
import { fmtVnd } from "@/lib/money";
import { SERVICE_CATEGORIES, type Service, type Tour } from "@/lib/types";
import type { S } from "@/lib/data";

type T = S<Tour>;
type Sv = S<Service>;
type Tab = "package" | "day" | "service";

export function CatalogView({ tours, services, canEdit }: { tours: T[]; services: Sv[]; canEdit: boolean }) {
  const [tab, setTab] = useState<Tab>("package");
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("all");
  const [edit, setEdit] = useState<{ kind: "tours" | "services"; id: string; name: string; price: number; active: boolean } | null>(null);
  const { run, pending } = useAction();

  const counts = { package: tours.filter((t) => t.type === "package").length, day: tours.filter((t) => t.type === "day").length, service: services.length };

  const groups = useMemo(() => {
    if (tab === "service") return Array.from(new Set(services.map((s) => s.category)));
    return Array.from(new Set(tours.filter((t) => t.type === tab).map((t) => t.group)));
  }, [tab, tours, services]);

  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
  const match = (s: string) => !q || norm(s).includes(norm(q));
  const shownTours = tours.filter((t) => t.type === tab && (group === "all" || t.group === group) && match(t.name + t.group));
  const shownServices = services.filter((s) => (group === "all" || s.category === group) && match(s.name + (SERVICE_CATEGORIES[s.category] ?? "")));

  async function save() {
    if (!edit) return;
    const ok = await run(() => http("PATCH", `/api/catalog/${edit.kind}/${edit.id}`, { priceVnd: edit.price, active: edit.active }), "Đã cập nhật");
    if (ok) setEdit(null);
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Loại danh mục" className="inline-flex rounded-2xl bg-white/70 p-1 ring-1 ring-inset ring-line">
          {([["package", "Tour trọn gói"], ["day", "Tour trong ngày"], ["service", "Dịch vụ lẻ"]] as [Tab, string][]).map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => { setTab(k); setGroup("all"); }}
              className={cn("h-10 rounded-xl px-4 text-sm font-semibold transition-all", tab === k ? "bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow" : "text-ink-2 hover:bg-brand-100")}>
              {label} <span className={cn("ml-1 text-xs", tab === k ? "text-white/80" : "text-ink-3")}>{counts[k]}</span>
            </button>
          ))}
        </div>
        <div className="relative min-w-52 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
          <Input className="pl-10" placeholder="Tìm tour, dịch vụ…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Tìm kiếm" />
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Lọc theo nhóm">
        {["all", ...groups].map((g) => (
          <button key={g} type="button" aria-pressed={group === g} onClick={() => setGroup(g)}
            className={cn("h-9 rounded-full px-3.5 text-[13px] font-semibold ring-1 ring-inset transition-colors", group === g ? "bg-brand-900 text-white ring-brand-900" : "bg-white/70 text-ink-2 ring-line hover:bg-brand-100")}>
            {g === "all" ? "Tất cả" : tab === "service" ? SERVICE_CATEGORIES[g] ?? g : g}
          </button>
        ))}
      </div>

      {tab !== "service" ? (
        shownTours.length === 0 ? <Card><Empty icon={<Search className="size-6" />} title="Không có tour phù hợp" sub="Thử bỏ bộ lọc hoặc đổi từ khoá." /></Card> : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {shownTours.map((t, i) => (
              <Card key={t.id} className="anim-up flex flex-col overflow-hidden p-0" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                <div className="relative">
                  <Cover src={t.image} alt={t.name} className="aspect-[16/10] w-full" />
                  <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 p-3">
                    <Badge tone="slate" className="bg-white/90 backdrop-blur" icon={<Clock className="size-3" aria-hidden />}>{t.duration}</Badge>
                    {!t.active && <Badge tone="red">Đã đóng</Badge>}
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-4 sm:p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gold-700">{t.group}</p>
                  <h3 className="mt-1 text-[16px] font-bold leading-snug text-ink">{t.name}</h3>
                  <p className="mt-2 line-clamp-3 text-sm text-ink-3">{t.description}</p>
                  <div className="mt-auto pt-4">
                    <div className="flex items-end justify-between gap-2">
                      <div>
                        <p className="text-xs text-ink-3">Giá từ / khách</p>
                        <p className="text-lg font-extrabold text-brand-700">{t.priceVnd ? fmtVnd(t.priceVnd) : "Liên hệ"}</p>
                      </div>
                      {t.priceNote && <p className="max-w-[9rem] text-right text-[11px] leading-tight text-ink-3">{t.priceNote}</p>}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Link href={`/quotes/new?add=tour:${t.id}`} className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-brand-500 to-brand-600 px-4 text-sm font-semibold text-white shadow-[0_6px_16px_-6px_rgba(14,122,57,.7)] transition-all hover:from-brand-600 hover:to-brand-700 active:scale-[0.98]">
                        <Plus className="size-4" aria-hidden /> Báo giá
                      </Link>
                      {t.url && (
                        <a href={t.url} target="_blank" rel="noreferrer" aria-label={`Xem ${t.name} trên website`} title="Xem trên website" className="grid size-11 place-items-center rounded-xl bg-white/80 text-ink-2 ring-1 ring-inset ring-line hover:bg-white"><ExternalLink className="size-4" /></a>
                      )}
                      {canEdit && (
                        <button type="button" aria-label={`Sửa giá ${t.name}`} title="Sửa giá / đóng mở" onClick={() => setEdit({ kind: "tours", id: t.id, name: t.name, price: t.priceVnd, active: t.active })} className="grid size-11 place-items-center rounded-xl bg-white/80 text-ink-2 ring-1 ring-inset ring-line hover:bg-white"><Pencil className="size-4" /></button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : shownServices.length === 0 ? (
        <Card><Empty icon={<Search className="size-6" />} title="Không có dịch vụ phù hợp" /></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shownServices.map((s, i) => (
            <Card key={s.id} className="anim-up flex flex-col p-5" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
              <div className="flex items-start gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-100 text-brand-600"><CategoryGlyph category={s.category} className="size-6" /></span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gold-700">{SERVICE_CATEGORIES[s.category] ?? s.category}</p>
                  <h3 className="mt-0.5 font-bold leading-snug text-ink">{s.name}</h3>
                </div>
              </div>
              <p className="mt-3 line-clamp-3 text-sm text-ink-3">{s.description}</p>
              <div className="mt-auto flex items-end justify-between gap-2 pt-4">
                <div>
                  <p className="text-xs text-ink-3">Giá tham khảo / {s.unit}{s.basis === "pax" ? " / khách" : ""}</p>
                  <p className="text-lg font-extrabold text-brand-700">{fmtVnd(s.priceVnd)}</p>
                </div>
                <div className="flex gap-2">
                  {canEdit && <button type="button" aria-label={`Sửa giá ${s.name}`} onClick={() => setEdit({ kind: "services", id: s.id, name: s.name, price: s.priceVnd, active: s.active })} className="grid size-11 place-items-center rounded-xl bg-white/80 text-ink-2 ring-1 ring-inset ring-line hover:bg-white"><Pencil className="size-4" /></button>}
                  <Link href={`/quotes/new?add=service:${s.id}`} className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-gradient-to-b from-brand-500 to-brand-600 px-4 text-sm font-semibold text-white transition-all hover:from-brand-600 hover:to-brand-700 active:scale-[0.98]"><Plus className="size-4" aria-hidden /> Báo giá</Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      <p className="mt-6 text-xs text-ink-3">Tên, thời lượng, mô tả, hình ảnh lấy từ condaotrip.com.vn. Giá ghi “tham khảo nội bộ” là giá tạm cho các mục website để “Liên hệ” — hãy chỉnh theo bảng giá thực tế.</p>

      <Modal open={!!edit} onClose={() => setEdit(null)} title="Chỉnh giá & trạng thái" sub={edit?.name}
        footer={<><Button variant="secondary" onClick={() => setEdit(null)}>Huỷ</Button><Button loading={pending} onClick={save}>Lưu</Button></>}>
        {edit && (
          <div className="space-y-4">
            <Field label="Giá bán tham khảo (VND)" hint="Đây là giá mặc định khi đưa vào báo giá; sale/điều hành vẫn sửa được ở từng báo giá.">
              <Input type="number" min={0} step={1000} inputMode="numeric" value={edit.price} onChange={(e) => setEdit({ ...edit, price: Number(e.target.value) })} />
            </Field>
            <label className="flex min-h-11 items-center gap-3 rounded-xl bg-white/70 px-4 ring-1 ring-inset ring-line">
              <input type="checkbox" className="size-5 accent-brand-600" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} />
              <span className="text-sm font-medium">Đang mở bán (khách hàng nhìn thấy)</span>
            </label>
          </div>
        )}
      </Modal>
    </>
  );
}
