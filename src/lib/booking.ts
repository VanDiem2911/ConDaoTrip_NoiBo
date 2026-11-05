import { itemQuantity, payingPax, uid } from "./pricing";
import { quoteTotals } from "./pricing";
import type { Booking, BookingLine, Quote, QuoteItem } from "./types";

type PaxQuote = Pick<Quote, "adults" | "children" | "infants" | "childRatio">;

export function unitFor(category: string, basis: "pax" | "group"): string {
  switch (category) {
    case "hotel": return basis === "pax" ? "đêm·khách" : "phòng·đêm";
    case "meal": return "suất";
    case "ticket":
    case "flight":
    case "ferry": return "vé";
    case "guide": return "ngày";
    case "boat": return "chuyến";
    case "rental": return "xe·ngày";
    case "transfer": return "lượt";
    default: return basis === "pax" ? "khách" : "lượt";
  }
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Gói trọn gói thành từng dịch vụ cần xếp; dịch vụ lẻ thành 1 dòng. Mỗi dòng nhớ nguồn gốc (trọn gói / lẻ). */
export function buildLines(items: QuoteItem[], pax: PaxQuote): BookingLine[] {
  const lines: BookingLine[] = [];
  for (const it of items) {
    if (it.origin === "package" && it.components?.length) {
      for (const comp of it.components) {
        const qty = r1(comp.qty * (comp.basis === "pax" ? payingPax(pax) : 1) * it.qty);
        lines.push({
          id: uid(), itemId: it.id, name: comp.name, category: comp.category,
          origin: "package", tourName: it.name, qty, unit: unitFor(comp.category, comp.basis), status: "pending",
        });
      }
    } else {
      lines.push({
        id: uid(), itemId: it.id, name: it.name, category: it.category, origin: it.origin,
        qty: r1(itemQuantity(it, pax)), unit: unitFor(it.category, it.basis), status: "pending",
      });
    }
  }
  return lines;
}

export function buildBooking(
  quote: Quote,
  opts: { id: string; code: string; confirmedBy: string; commissionRate: number; createdAt: string },
): Booking {
  const t = quoteTotals(quote.items, quote, quote.discountVnd);
  const hasPackage = quote.items.some((i) => i.origin === "package");
  const first = quote.items[0];
  const extra = quote.items.length - 1;
  return {
    _id: opts.id,
    code: opts.code,
    quoteId: quote._id,
    kind: hasPackage ? "package" : "retail",
    groupName: quote.groupName,
    customerId: quote.customerId,
    customerName: quote.customerName,
    saleId: quote.saleId,
    saleName: quote.saleName,
    travelDate: quote.travelDate,
    adults: quote.adults,
    children: quote.children,
    infants: quote.infants,
    cover: quote.items.find((i) => i.image)?.image,
    title: first ? (extra > 0 ? `${first.name} + ${extra} dịch vụ` : first.name) : quote.groupName,
    items: quote.items,
    lines: buildLines(quote.items, quote),
    sellVnd: t.total,
    discountVnd: quote.discountVnd,
    commissionRate: quote.saleId ? opts.commissionRate : 0,
    status: "confirmed",
    confirmedBy: opts.confirmedBy,
    createdAt: opts.createdAt,
  };
}

/** Giá vốn đã xếp, lợi nhuận gộp, hoa hồng dự kiến của 1 booking */
export function bookingFinance(b: Pick<Booking, "lines" | "sellVnd" | "commissionRate">) {
  const cost = b.lines.reduce((s, l) => s + (l.status === "arranged" ? l.costVnd ?? 0 : 0), 0);
  const arranged = b.lines.filter((l) => l.status === "arranged").length;
  const profit = b.sellVnd - cost;
  const complete = arranged === b.lines.length && b.lines.length > 0;
  return {
    cost,
    profit,
    margin: b.sellVnd > 0 ? profit / b.sellVnd : 0,
    commission: Math.max(0, Math.round((profit * b.commissionRate) / 100)),
    arranged,
    total: b.lines.length,
    complete,
  };
}

/**
 * Tách báo giá thành các đơn riêng theo loại: tour trọn gói / dịch vụ lẻ.
 * Nhờ vậy doanh thu, lợi nhuận, hoa hồng được tính riêng cho từng đơn trọn gói và từng đơn dịch vụ lẻ.
 * Giảm giá được chia theo tỷ trọng tạm tính của từng đơn.
 */
export function splitQuote(q: Quote): Quote[] {
  const groups = [q.items.filter((i) => i.origin === "package"), q.items.filter((i) => i.origin !== "package")].filter((g) => g.length);
  if (groups.length <= 1) return [q];
  const subs = groups.map((g) => quoteTotals(g, q, 0).subtotal);
  const all = subs.reduce((a, b) => a + b, 0) || 1;
  let left = q.discountVnd;
  return groups.map((items, i) => {
    const d = i === groups.length - 1 ? left : Math.round((q.discountVnd * subs[i]) / all);
    left -= d;
    return { ...q, items, discountVnd: d };
  });
}
