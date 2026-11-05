import type { Quote, QuoteItem } from "./types";

type PaxInfo = Pick<Quote, "adults" | "children" | "infants" | "childRatio">;

/** Số khách quy đổi tính tiền: người lớn + trẻ em × tỷ lệ (em bé miễn phí) */
export function payingPax(p: PaxInfo): number {
  return p.adults + p.children * p.childRatio;
}

export function headcount(p: PaxInfo): number {
  return p.adults + p.children + p.infants;
}

export function itemQuantity(item: Pick<QuoteItem, "basis" | "qty">, p: PaxInfo): number {
  return item.basis === "pax" ? item.qty * payingPax(p) : item.qty;
}

export function itemTotal(item: QuoteItem, p: PaxInfo): number {
  return Math.round(item.unitPriceVnd * itemQuantity(item, p));
}

export function quoteTotals(items: QuoteItem[], p: PaxInfo, discountVnd = 0) {
  const subtotal = items.reduce((s, it) => s + itemTotal(it, p), 0);
  const total = Math.max(0, subtotal - (discountVnd || 0));
  const heads = p.adults + p.children;
  return {
    subtotal,
    total,
    perPax: heads > 0 ? Math.round(total / heads) : 0,
    heads,
    paying: payingPax(p),
  };
}

export const uid = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => b.toString(16).padStart(2, "0")).join("");
