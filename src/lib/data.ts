import type { Filter } from "mongodb";
import { col, ser } from "./db";
import { isBackoffice } from "./access";
import { bookingFinance } from "./booking";
import { memo } from "./cache";
import { DEFAULT_RATES, todayIso } from "./money";
import type {
  Booking, Customer, Quote, Service, SessionUser, Settings, Supplier, Tour, Transaction, User,
} from "./types";

export type S<T extends { _id: string }> = Omit<T, "_id"> & { id: string };

/* ------------------------------------------------------------------ */
/* Cài đặt                                                             */
/* ------------------------------------------------------------------ */
export function getSettings(): Promise<Settings> {
  return memo("settings", 30_000, loadSettings);
}
async function loadSettings(): Promise<Settings> {
  const c = await col<Settings>("settings");
  const s = await c.findOne({ _id: "main" });
  return (
    s ?? {
      _id: "main",
      rates: DEFAULT_RATES,
      defaultCommissionRate: 10,
      childRatio: 0.5,
      company: { name: "ConDaoTrip", brand: "ConDaoTrip", phone: "", email: "", address: "", taxCode: "" },
    }
  );
}

/* ------------------------------------------------------------------ */
/* Danh mục                                                            */
/* ------------------------------------------------------------------ */
export function getCatalog(user: SessionUser) {
  const staff = user.role !== "customer";
  return memo(`catalog:${staff}`, 30_000, async () => {
    const f = staff ? {} : { active: true };
    const [toursCol, servicesCol] = await Promise.all([col<Tour>("tours"), col<Service>("services")]);
    const [tours, services] = await Promise.all([toursCol.find(f).toArray(), servicesCol.find(f).toArray()]);
    return { tours: tours.map(ser), services: services.map(ser) };
  });
}

/* ------------------------------------------------------------------ */
/* Phạm vi dữ liệu theo vai trò                                         */
/* ------------------------------------------------------------------ */
function bookingScope(u: SessionUser): Filter<Booking> {
  if (isBackoffice(u.role)) return {};
  if (u.role === "sale") return { $or: [{ saleId: u.id }, { confirmedBy: u.id }] };
  const or: Filter<Booking>[] = [{ confirmedBy: u.id }];
  if (u.customerId) or.push({ customerId: u.customerId });
  return { $or: or };
}
function quoteScope(u: SessionUser): Filter<Quote> {
  if (isBackoffice(u.role)) return {};
  if (u.role === "sale") return { $or: [{ saleId: u.id }, { createdBy: u.id }] };
  const or: Filter<Quote>[] = [{ createdBy: u.id }];
  if (u.customerId) or.push({ customerId: u.customerId });
  return { $or: or };
}

/** Ẩn thông tin mà vai trò không được xem (giá vốn, NCC, sắp xếp...) */
export function shapeBooking(b: Booking, role: SessionUser["role"]): S<Booking> {
  if (isBackoffice(role)) return ser(b);
  if (role === "sale") {
    return ser({ ...b, lines: b.lines.map(({ costVnd: _c, ...l }) => l) });
  }
  // khách hàng: chỉ thấy nội dung đã đặt, không thấy sắp xếp / giá vốn / hoa hồng
  return ser({ ...b, lines: [], commissionRate: 0, confirmedBy: "" });
}

/* ------------------------------------------------------------------ */
/* Báo giá                                                             */
/* ------------------------------------------------------------------ */
export async function listQuotes(user: SessionUser) {
  const rows = await (await col<Quote>("quotes")).find(quoteScope(user)).sort({ createdAt: -1 }).toArray();
  return rows.map(ser);
}

export async function getQuote(id: string, user: SessionUser) {
  const q = await (await col<Quote>("quotes")).findOne({ _id: id, ...(quoteScope(user) as object) });
  return q ? ser(q) : null;
}

/* ------------------------------------------------------------------ */
/* Thu tiền theo booking                                               */
/* ------------------------------------------------------------------ */
export interface PaidInfo { paid: number; deposit: number; advance: number; payment: number }

export async function paidMap(): Promise<Map<string, PaidInfo>> {
  const rows = await (await col<Transaction>("transactions"))
    .aggregate<{ _id: string; paid: number; deposit: number; advance: number; payment: number }>([
      { $match: { type: "thu", bookingId: { $exists: true } } },
      {
        $group: {
          _id: "$bookingId",
          paid: { $sum: "$amountVnd" },
          deposit: { $sum: { $cond: [{ $eq: ["$kind", "deposit"] }, "$amountVnd", 0] } },
          advance: { $sum: { $cond: [{ $eq: ["$kind", "advance"] }, "$amountVnd", 0] } },
          payment: { $sum: { $cond: [{ $eq: ["$kind", "payment"] }, "$amountVnd", 0] } },
        },
      },
    ])
    .toArray();
  return new Map(rows.map((r) => [r._id, r]));
}

const EMPTY_PAID: PaidInfo = { paid: 0, deposit: 0, advance: 0, payment: 0 };

export function debtStatus(sell: number, paid: number): "paid" | "partial" | "unpaid" {
  if (paid >= sell) return "paid";
  return paid > 0 ? "partial" : "unpaid";
}

export function daysUntil(dateIso: string): number {
  const a = new Date(todayIso() + "T00:00:00Z").getTime();
  const b = new Date(dateIso + "T00:00:00Z").getTime();
  return Math.round((b - a) / 86400000);
}

/* ------------------------------------------------------------------ */
/* Booking                                                             */
/* ------------------------------------------------------------------ */
export async function listBookings(user: SessionUser) {
  const [bookings, paid] = await Promise.all([
    col<Booking>("bookings").then((c) => c.find(bookingScope(user)).sort({ travelDate: -1 }).toArray()),
    isBackoffice(user.role) ? paidMap() : Promise.resolve(new Map<string, PaidInfo>()),
  ]);
  return bookings.map((b) => {
    const fin = bookingFinance(b);
    const p = paid.get(b._id) ?? EMPTY_PAID;
    const { lines: _lines, items: _items, ...view } = shapeBooking(b, user.role);
    return {
      ...view,
      progress: { arranged: fin.arranged, total: fin.total, complete: fin.complete },
      ...(isBackoffice(user.role) ? { paid: p.paid, owed: Math.max(0, b.sellVnd - p.paid), profit: fin.profit, cost: fin.cost } : {}),
      ...(user.role === "sale" ? { commission: fin.commission } : {}),
    };
  });
}

export async function getBookingDetail(id: string, user: SessionUser) {
  const b = await (await col<Booking>("bookings")).findOne({ _id: id, ...(bookingScope(user) as object) });
  if (!b) return null;
  const fin = bookingFinance(b);
  const back = isBackoffice(user.role);
  const raw = back
    ? await (await col<Transaction>("transactions")).find({ bookingId: id, type: "thu" }).sort({ date: 1 }).toArray()
    : [];
  const txs = raw.map(ser);
  const sumKind = (k: string) => raw.filter((t) => t.kind === k).reduce((s, t) => s + t.amountVnd, 0);
  const p: PaidInfo = { paid: raw.reduce((s, t) => s + t.amountVnd, 0), deposit: sumKind("deposit"), advance: sumKind("advance"), payment: sumKind("payment") };
  return {
    booking: shapeBooking(b, user.role),
    finance: back
      ? { ...fin, paid: p.paid, deposit: p.deposit, advance: p.advance, owed: Math.max(0, b.sellVnd - p.paid) }
      : user.role === "sale"
        ? { commission: fin.commission, arranged: fin.arranged, total: fin.total, complete: fin.complete }
        : null,
    payments: txs,
  };
}

/* ------------------------------------------------------------------ */
/* Điều hành: hàng đợi dịch vụ cần xếp                                  */
/* ------------------------------------------------------------------ */
export async function getActiveSuppliers() {
  const rows = await (await col<Supplier>("suppliers")).find({ active: true }).sort({ name: 1 }).toArray();
  return rows.map(ser);
}

export async function getOperations() {
  const [rows, suppliers] = await Promise.all([
    col<Booking>("bookings").then((c) => c.find({ status: "confirmed" }, { projection: { items: 0 } }).sort({ travelDate: 1 }).toArray()),
    getActiveSuppliers(),
  ]);
  return { bookings: rows.map((b) => ser({ ...b, items: [] })), suppliers };
}

/* ------------------------------------------------------------------ */
/* Nhà cung cấp & công nợ NCC                                           */
/* ------------------------------------------------------------------ */
export interface SupplierLedger {
  cost: number;
  lines: number;
  paid: number;
  lastPaid?: string;
  items: { bookingId: string; code: string; group: string; name: string; cost: number; date: string; info?: string }[];
  pays: { id: string; date: string; amount: number; note?: string; code?: string }[];
}

export async function getSupplierDebts() {
  const [bookings, txs] = await Promise.all([
    col<Booking>("bookings").then((c) =>
      c.find({ status: "confirmed" }, { projection: { code: 1, groupName: 1, travelDate: 1, lines: 1 } }).toArray()),
    col<Transaction>("transactions").then((c) => c.find({ type: "chi", kind: "supplier" }).sort({ date: -1 }).toArray()),
  ]);
  const map = new Map<string, SupplierLedger>();
  const get = (id: string) => {
    let e = map.get(id);
    if (!e) { e = { cost: 0, lines: 0, paid: 0, items: [], pays: [] }; map.set(id, e); }
    return e;
  };
  for (const b of bookings)
    for (const l of b.lines)
      if (l.status === "arranged" && l.supplierId) {
        const e = get(l.supplierId);
        e.cost += l.costVnd ?? 0;
        e.lines += 1;
        e.items.push({ bookingId: b._id, code: b.code, group: b.groupName, name: l.name, cost: l.costVnd ?? 0, date: b.travelDate, info: l.arrangeInfo });
      }
  for (const t of txs)
    if (t.supplierId) {
      const e = get(t.supplierId);
      e.paid += t.amountVnd;
      if (!e.lastPaid || t.date > e.lastPaid) e.lastPaid = t.date;
      e.pays.push({ id: t._id, date: t.date, amount: t.amountVnd, note: t.note, code: t.bookingCode });
    }
  for (const e of map.values()) e.items.sort((a, b) => (a.date < b.date ? 1 : -1));
  return map;
}

export async function listSuppliers() {
  const [rows, debts] = await Promise.all([
    (await col<Supplier>("suppliers")).find({}).sort({ name: 1 }).toArray(),
    getSupplierDebts(),
  ]);
  return rows.map((s) => {
    const d = debts.get(s._id) ?? { cost: 0, lines: 0, paid: 0, items: [], pays: [] };
    return { ...ser(s), cost: d.cost, paid: d.paid, owed: Math.max(0, d.cost - d.paid), lines: d.lines, lastPaid: d.lastPaid, items: d.items, pays: d.pays };
  });
}

/* ------------------------------------------------------------------ */
/* Khách hàng (CRM)                                                    */
/* ------------------------------------------------------------------ */
/** Chỉ id/tên/sale của khách — đủ cho ô chọn khách trong form báo giá (không quét booking) */
export async function listCustomerOptions(user: SessionUser) {
  const f: Filter<Customer> = user.role === "sale" ? { saleId: user.id } : {};
  const rows = await (await col<Customer>("customers")).find(f, { projection: { name: 1, saleId: 1 } }).sort({ name: 1 }).toArray();
  return rows.map((c) => ({ id: c._id, name: c.name, saleId: c.saleId }));
}

export async function listCustomers(user: SessionUser) {
  const f: Filter<Customer> = user.role === "sale" ? { saleId: user.id } : {};
  const [customers, bookings, paid] = await Promise.all([
    col<Customer>("customers").then((c) => c.find(f).sort({ name: 1 }).toArray()),
    col<Booking>("bookings").then((c) => c.find({ status: "confirmed" }, { projection: { customerId: 1, sellVnd: 1, travelDate: 1 } }).toArray()),
    paidMap(),
  ]);
  return customers.map((c) => {
    const mine = bookings.filter((b) => b.customerId === c._id);
    const sell = mine.reduce((s, b) => s + b.sellVnd, 0);
    const got = mine.reduce((s, b) => s + (paid.get(b._id)?.paid ?? 0), 0);
    return {
      ...ser(c),
      bookings: mine.length,
      revenue: isBackoffice(user.role) ? sell : undefined,
      owed: isBackoffice(user.role) ? Math.max(0, sell - got) : undefined,
      lastTrip: mine.map((b) => b.travelDate).sort().pop(),
    };
  });
}

export async function listStaff() {
  const rows = await (await col<User>("users")).find({}).sort({ role: 1, name: 1 }).toArray();
  return rows.map(({ passwordHash: _p, ...u }) => ser(u as User));
}

/* ------------------------------------------------------------------ */
/* Tài chính: doanh thu – giá vốn – lợi nhuận – hoa hồng – công nợ KH    */
/* ------------------------------------------------------------------ */
export interface FinanceRow {
  id: string;
  code: string;
  groupName: string;
  kind: "package" | "retail";
  customerName: string;
  saleId?: string;
  saleName?: string;
  travelDate: string;
  sell: number;
  cost: number;
  profit: number;
  margin: number;
  complete: boolean;
  arranged: number;
  total: number;
  rate: number;
  commission: number;
  commissionPaid: number;
  paid: number;
  deposit: number;
  advance: number;
  owed: number;
  status: "paid" | "partial" | "unpaid";
  overdue: boolean;
  daysToTravel: number;
  pax: number;
  cover?: string;
  title: string;
}

async function commissionPaidMap(): Promise<Map<string, number>> {
  const rows = await (await col<Transaction>("transactions"))
    .aggregate<{ _id: string; v: number }>([
      { $match: { kind: "commission", bookingId: { $exists: true } } },
      { $group: { _id: "$bookingId", v: { $sum: "$amountVnd" } } },
    ])
    .toArray();
  return new Map(rows.map((r) => [r._id, r.v]));
}

export async function financeRows(user: SessionUser): Promise<FinanceRow[]> {
  return (await loadFinance(user)).rows;
}

/** Nạp booking + tiền đã thu + hoa hồng đã chi song song; trả cả booking thô để trang khác dùng lại (không truy vấn lần 2) */
export async function loadFinance(user: SessionUser) {
  const back = isBackoffice(user.role);
  const [bookings, paid, commPaid] = await Promise.all([
    col<Booking>("bookings").then((c) => c.find({ status: "confirmed", ...(bookingScope(user) as object) }).toArray()),
    back ? paidMap() : Promise.resolve(new Map<string, PaidInfo>()),
    back ? commissionPaidMap() : Promise.resolve(new Map<string, number>()),
  ]);
  return { bookings, rows: buildFinanceRows(bookings, paid, commPaid) };
}

function buildFinanceRows(rows: Booking[], paid: Map<string, PaidInfo>, commPaid: Map<string, number>): FinanceRow[] {
  return rows
    .map((b) => {
      const f = bookingFinance(b);
      const pi = paid.get(b._id) ?? EMPTY_PAID;
      const p = pi.paid;
      const owed = Math.max(0, b.sellVnd - p);
      const d = daysUntil(b.travelDate);
      return {
        id: b._id, code: b.code, groupName: b.groupName, kind: b.kind, customerName: b.customerName,
        saleId: b.saleId, saleName: b.saleName, travelDate: b.travelDate,
        sell: b.sellVnd, cost: f.cost, profit: f.profit, margin: f.margin, complete: f.complete,
        arranged: f.arranged, total: f.total, rate: b.commissionRate, commission: f.commission,
        commissionPaid: commPaid.get(b._id) ?? 0, paid: p, deposit: pi.deposit, advance: pi.advance, owed, status: debtStatus(b.sellVnd, p),
        overdue: owed > 0 && d <= 7, daysToTravel: d, pax: b.adults + b.children + b.infants,
        cover: b.cover, title: b.title,
      } satisfies FinanceRow;
    })
    .sort((a, b) => (a.travelDate < b.travelDate ? 1 : -1));
}

/* ------------------------------------------------------------------ */
/* Tổng quan                                                           */
/* ------------------------------------------------------------------ */
export function monthKey(d: string) {
  return d.slice(0, 7);
}

export function monthWindow(back: number, fwd: number, from = todayIso()) {
  const [y, m] = from.split("-").map(Number);
  const out: string[] = [];
  for (let i = -back; i <= fwd; i++) {
    const d = new Date(Date.UTC(y, m - 1 + i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

/** Sale/khách không được thấy giá vốn & lợi nhuận: xoá khỏi dữ liệu trả về */
export function redactFinance(rows: FinanceRow[], role: SessionUser["role"]): FinanceRow[] {
  if (isBackoffice(role)) return rows;
  return rows.map((r) => ({
    ...r, cost: 0, profit: 0, margin: 0, paid: 0, deposit: 0, advance: 0, owed: 0, commissionPaid: r.commissionPaid,
    status: "unpaid" as const, overdue: false,
    commission: role === "sale" ? r.commission : 0, rate: role === "sale" ? r.rate : 0,
  }));
}

export async function getDashboard(user: SessionUser) {
  const [loaded, catalog, quotes] = await Promise.all([
    loadFinance(user),
    getCatalog(user),
    user.role === "sale" ? listQuotes(user) : Promise.resolve([]),
  ]);
  const fin = isBackoffice(user.role) ? loaded.rows : redactFinance(loaded.rows, user.role);
  const bookingsRaw = [...loaded.bookings].sort((a, b) => (a.travelDate < b.travelDate ? -1 : 1));
  const today = todayIso();
  const months = monthWindow(4, 1);
  const series = months.map((m) => {
    const rows = fin.filter((r) => monthKey(r.travelDate) === m);
    return {
      key: m,
      label: `T${Number(m.slice(5))}`,
      revenue: rows.reduce((s, r) => s + r.sell, 0),
      profit: rows.reduce((s, r) => s + r.profit, 0),
      commission: rows.reduce((s, r) => s + r.commission, 0),
      count: rows.length,
    };
  });
  const upcoming = bookingsRaw
    .filter((b) => b.travelDate >= today)
    .slice(0, 5)
    .map((b) => {
      const f = bookingFinance(b);
      return {
        id: b._id, code: b.code, title: b.title, groupName: b.groupName, cover: b.cover, travelDate: b.travelDate,
        pax: b.adults + b.children + b.infants, kind: b.kind, customerName: b.customerName,
        progress: { arranged: f.arranged, total: f.total, complete: f.complete },
      };
    });
  const pendingLines = bookingsRaw.reduce((s, b) => s + b.lines.filter((l) => l.status === "pending").length, 0);
  const owedRows = fin.filter((r) => r.owed > 0);
  return {
    series,
    upcoming,
    kpi: {
      openTours: catalog.tours.filter((t) => t.active).length,
      pax: fin.reduce((s, r) => s + r.pax, 0),
      revenue: fin.reduce((s, r) => s + r.sell, 0),
      profit: fin.reduce((s, r) => s + r.profit, 0),
      owed: owedRows.reduce((s, r) => s + r.owed, 0),
      owedCount: owedRows.length,
      overdueCount: owedRows.filter((r) => r.overdue).length,
      pendingLines,
      bookings: fin.length,
      commission: fin.reduce((s, r) => s + r.commission, 0),
      draftQuotes: quotes.filter((q) => q.status === "draft").length,
    },
    byKind: (["package", "retail"] as const).map((k) => ({
      kind: k,
      revenue: fin.filter((r) => r.kind === k).reduce((s, r) => s + r.sell, 0),
      profit: fin.filter((r) => r.kind === k).reduce((s, r) => s + r.profit, 0),
      count: fin.filter((r) => r.kind === k).length,
    })),
    alerts: owedRows
      .filter((r) => r.overdue)
      .sort((a, b) => a.daysToTravel - b.daysToTravel)
      .slice(0, 5),
  };
}

/* ------------------------------------------------------------------ */
/* Báo cáo                                                             */
/* ------------------------------------------------------------------ */
export async function getReportData() {
  const [{ bookings, rows: fin }, txs] = await Promise.all([
    loadFinance({ role: "operator" } as SessionUser),
    col<Transaction>("transactions").then((c) => c.find({}, { projection: { type: 1, kind: 1, amountVnd: 1, date: 1 } }).toArray()),
  ]);
  // doanh thu theo tour / dịch vụ (chia theo tỷ trọng thành tiền từng dòng)
  const byItem = new Map<string, { revenue: number; count: number; kind: string }>();
  for (const b of bookings) {
    const sub = b.items.reduce((s, it) => s + it.unitPriceVnd * (it.basis === "pax" ? it.qty * (b.adults + b.children * 0.5) : it.qty), 0) || 1;
    for (const it of b.items) {
      const amt = it.unitPriceVnd * (it.basis === "pax" ? it.qty * (b.adults + b.children * 0.5) : it.qty);
      const e = byItem.get(it.name) ?? { revenue: 0, count: 0, kind: it.origin };
      e.revenue += Math.round((amt / sub) * b.sellVnd);
      e.count += 1;
      byItem.set(it.name, e);
    }
  }
  const cash = txs.map((t) => ({ type: t.type, kind: t.kind, amountVnd: t.amountVnd, date: t.date }));
  return {
    fin,
    cash,
    topItems: Array.from(byItem, ([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue).slice(0, 8),
  };
}
