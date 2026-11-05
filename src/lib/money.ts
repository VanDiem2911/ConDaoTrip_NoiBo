export interface CurrencyMeta {
  code: string;
  label: string;
  name: string;
  digits: number;
}

export const CURRENCIES: CurrencyMeta[] = [
  { code: "VND", label: "VND", name: "Việt Nam Đồng", digits: 0 },
  { code: "USD", label: "USD", name: "Đô la Mỹ", digits: 2 },
  { code: "CNY", label: "RMB", name: "Nhân dân tệ", digits: 2 },
  { code: "EUR", label: "EUR", name: "Euro", digits: 2 },
  { code: "KRW", label: "KRW", name: "Won Hàn Quốc", digits: 0 },
  { code: "THB", label: "THB", name: "Baht Thái", digits: 2 },
];

export const DEFAULT_RATES: Record<string, number> = {
  USD: 25400,
  CNY: 3550,
  EUR: 29500,
  KRW: 18.5,
  THB: 730,
};

export function currencyMeta(code: string): CurrencyMeta {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}

/** VND -> đơn vị tiền tệ đích (rates = số VND cho 1 đơn vị ngoại tệ) */
export function convert(vnd: number, cur: string, rates: Record<string, number>): number {
  if (cur === "VND") return vnd;
  const r = rates[cur];
  return r ? vnd / r : 0;
}

export function fmtMoney(vnd: number, cur = "VND", rates: Record<string, number> = DEFAULT_RATES): string {
  const m = currencyMeta(cur);
  const v = convert(vnd, cur, rates);
  const num = new Intl.NumberFormat(cur === "VND" ? "vi-VN" : "en-US", {
    minimumFractionDigits: m.digits,
    maximumFractionDigits: m.digits,
  }).format(m.digits === 0 ? Math.round(v) : v);
  return cur === "VND" ? `${num} ₫` : `${num} ${m.label}`;
}

export const fmtVnd = (n: number) => fmtMoney(n, "VND");

export function fmtNum(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.round(n));
}

const trim = (x: number) => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(x);

/** 1.250.000.000 -> "1,3 tỷ"; 900.000 -> "900 k" — ngắn gọn cho biểu đồ */
export function compactVnd(n: number): string {
  const a = Math.abs(n);
  const s = n < 0 ? "-" : "";
  if (a >= 1e9) return `${s}${trim(a / 1e9)} tỷ`;
  if (a >= 1e6) return `${s}${trim(a / 1e6)} tr`;
  if (a >= 1e3) return `${s}${trim(a / 1e3)} k`;
  return `${s}${Math.round(a)}`;
}

export function fmtDate(iso?: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export const todayIso = () => new Date().toISOString().slice(0, 10);
