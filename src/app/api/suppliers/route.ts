import { ApiError, apiUser, body, num, route, str } from "@/lib/api";
import { BACKOFFICE } from "@/lib/access";
import { col, newId, nowIso, ser } from "@/lib/db";
import { uid } from "@/lib/pricing";
import { SERVICE_CATEGORIES, type Supplier } from "@/lib/types";

const CAT_KEYS = Object.keys(SERVICE_CATEGORIES);

/** Đoán nhóm dịch vụ từ chữ người dùng gõ nhanh (vd: "khách sạn", "cano", "xe") */
function guessCategories(text: string): string[] {
  const t = text.toLowerCase();
  const map: [RegExp, string][] = [
    [/khách sạn|resort|hotel|villa|homestay/, "hotel"], [/máy bay|vé bay|flight/, "flight"],
    [/tàu cao tốc|vé tàu|ferry/, "ferry"], [/cano|speedboat|tàu/, "boat"], [/câu cá/, "fishing"],
    [/xe máy|xe đạp|thuê xe/, "rental"], [/xe|đón|tiễn|transfer/, "transfer"], [/nhà hàng|ăn|quán|meal/, "meal"],
    [/hdv|hướng dẫn|guide/, "guide"], [/vé|tham quan/, "ticket"], [/lặn|snorkel|dụng cụ/, "gear"],
    [/tiệc|team|gala|sự kiện/, "event"], [/ảnh|flycam|quay/, "photo"],
  ];
  const found = map.filter(([re]) => re.test(t)).map(([, k]) => k);
  return found.length ? Array.from(new Set(found)) : [];
}

function build(f: Record<string, unknown>): Supplier | null {
  const name = str(f.name);
  if (!name) return null;
  const cats = (Array.isArray(f.categories) ? f.categories.map(String) : [str(f.category)]).filter((c) => CAT_KEYS.includes(c));
  return {
    _id: newId(), name, categories: cats.length ? cats : guessCategories(str(f.categoryText) || name),
    contactName: str(f.contactName) || undefined, phone: str(f.phone) || undefined, email: str(f.email) || undefined,
    address: str(f.address) || undefined, bank: str(f.bank) || undefined, note: str(f.note) || undefined,
    prices: Array.isArray(f.prices)
      ? (f.prices as Record<string, unknown>[]).filter((p) => str(p.name)).map((p) => ({
          id: uid(), name: str(p.name), category: str(p.category) || "other", unit: str(p.unit) || "lượt", costVnd: Math.max(0, Math.round(num(p.costVnd))),
        }))
      : [],
    active: true, createdAt: nowIso(),
  };
}

/**
 * Nhập NCC nhanh:
 *  - 1 NCC: { name, phone, category... }   (dùng cả trong lúc điều hành xếp dịch vụ)
 *  - Dán nhiều dòng: { bulk: "Tên; SĐT; Nhóm dịch vụ; Người liên hệ" } — mỗi dòng 1 NCC (hoặc phân tách bằng Tab/|, copy từ Excel)
 */
export const POST = route(async (req) => {
  await apiUser(BACKOFFICE);
  const b = await body(req);
  const c = await col<Supplier>("suppliers");
  if (typeof b.bulk === "string") {
    const docs = b.bulk
      .split(/\r?\n/)
      .map((line) => line.split(/\t|;|\|/).map((x) => x.trim()))
      .filter((p) => p[0])
      .map((p) => build({ name: p[0], phone: p[1], categoryText: p[2], contactName: p[3], note: p[4] }))
      .filter((x): x is Supplier => !!x);
    if (docs.length) await c.insertMany(docs);
    return { created: docs.length, suppliers: docs.map(ser) };
  }
  const doc = build(b);
  if (!doc) throw new ApiError(400, "Vui lòng nhập tên nhà cung cấp");
  await c.insertOne(doc);
  return { created: 1, supplier: ser(doc) };
});
