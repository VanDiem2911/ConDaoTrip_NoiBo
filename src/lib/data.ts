import type { Filter } from "mongodb";
import { col, ser } from "./db";
import { isBackoffice } from "./access";
import { bookingFinance } from "./booking";
import { DEFAULT_RATES, todayIso } from "./money";
import type {
  Booking, Customer, Quote, Service, SessionUser, Settings, Supplier, Tour, Transaction, User,
} from "./types";

export type S<T extends { _id: string }> = Omit<T, "_id"> & { id: string };

/* ------------------------------------------------------------------ */
/* Cài đặt                                                             */
/* ------------------------------------------------------------------ */
export async function getSettings(): Promise<Settings> {
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
export async function getCatalog(user: SessionUser) {
  const staff = user.role !== "customer";
  const f = staff ? {} : { active: true };
  const [tours, services] = await Promise.all([
    (await col<Tour>("tours")).find(f).toArray(),
    (await col<Service>("services")).find(f).toArray(),
  ]);
  return { tours: tours.map(ser), services: services.map(ser) };
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
  const rows = await (await col<Booking>("bookings")).find(bookingScope(user)).sort({ travelDate: -1 }).toArray();
  const paid = isBackoffice(user.role) ? await paidMap() : new Map<string, PaidInfo>();
  return rows.map((b) => {
    const fin = bookingFinance(b);
    const p = paid.get(b._id) ?? EMPTY_PAID;
    const view = shapeBooking(b, user.role);
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
  const txs = back
    ? (await (await col<Transaction>("transactions")).find({ bookingId: id }).sort({ date: 1 }).toArray()).map(ser)
    : [];
  const p = back ? (await paidMap()).get(id) ?? EMPTY_PAID : EMPTY_PAID;
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
export async function getOperations() {
  const rows = await (await col<Booking>("bookings"))
    .find({ status: "confirmed" })
    .sort({ travelDate: 1 })
    .toArray();
  const suppliers = (await (await col<Supplier>("suppliers")).find({ active: true }).sort({ name: 1 }).toArray()).map(ser);
  return { bookings: rows.map(ser), suppliers };
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
  const bookings = await (await col<Booking>("bookings")).find({ status: "confirmed" }).toArray();
  const txs = await (await col<Transaction>("transactions")).find({ type: "chi", kind: "supplier" }).sort({ date: -1 }).toArray();
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
export async function listCustomers(user: SessionUser) {
  const f: Filter<Customer> = user.role === "sale" ? { saleId: user.id } : {};
  const customers = await (await col<Customer>("customers")).find(f).sort({ name: 1 }).toArray();
  const bookings = await (await col<Booking>("bookings")).find({ status: "confirmed" }).toArray();
  const paid = await paidMap();
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

export async function financeRows(user: SessionUser): Promise<FinanceRow[]> {
  const rows = await (await col<Booking>("bookings")).find({ status: "confirmed", ...(bookingScope(user) as object) }).toArray();
  const paid = await paidMap();
  const comm = await (await col<Transaction>("transactions")).find({ kind: "commission" }).toArray();
  const commPaid = new Map<string, number>();
  for (const t of comm) if (t.bookingId) commPaid.set(t.bookingId, (commPaid.get(t.bookingId) ?? 0) + t.amountVnd);
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
  const [fin, catalog, bookingsRaw] = await Promise.all([
    financeRows(user).then((r) => (isBackoffice(user.role) ? r : redactFinance(r, user.role))),
    getCatalog(user),
    (await col<Booking>("bookings")).find({ status: "confirmed", ...(bookingScope(user) as object) }).sort({ travelDate: 1 }).toArray(),
  ]);
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
  const quotes = user.role === "customer" || user.role === "sale" ? await listQuotes(user) : [];
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
  const [bookings, fin, txs] = await Promise.all([
    (await col<Booking>("bookings")).find({ status: "confirmed" }).toArray(),
    financeRows({ role: "operator" } as SessionUser),
    (await col<Transaction>("transactions")).find({}).toArray(),
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
