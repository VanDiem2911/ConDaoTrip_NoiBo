/* Ghi dữ liệu mẫu vào MongoDB.  npm run seed  |  npm run seed:reset (xoá & nạp lại) */
import { config } from "dotenv";
config({ path: ".env.local" });

import bcrypt from "bcryptjs";
import { getDb } from "../src/lib/db";
import { ensureIndexes } from "../src/lib/indexes";
import { SERVICE_SEEDS, TOUR_SEEDS, cloudImg } from "../src/lib/catalog";
import { buildBooking, bookingFinance, splitQuote } from "../src/lib/booking";
import { DEFAULT_RATES } from "../src/lib/money";
import { uid } from "../src/lib/pricing";
import type {
  Booking, Customer, Quote, QuoteItem, Service, Settings, Supplier, Tour, Transaction, User,
} from "../src/lib/types";

const PASSWORD = "ConDao@2026";
const reset = process.argv.includes("--reset");

// ---- bộ sinh số giả ngẫu nhiên cố định để dữ liệu mẫu lặp lại được ----
let seedState = 20261105;
const rnd = () => {
  seedState = (seedState * 1664525 + 1013904223) % 4294967296;
  return seedState / 4294967296;
};
const between = (a: number, b: number) => a + rnd() * (b - a);

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (s: string, n: number) => {
  const d = new Date(s + "T09:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
};
const TODAY = "2026-11-05";
const ym = (s: string) => s.slice(2, 4) + s.slice(5, 7);

async function main() {
  const db = await getDb();
  const hasUsers = (await db.collection("users").countDocuments()) > 0;
  if (hasUsers && !reset) {
    console.log("DB đã có dữ liệu. Dùng `npm run seed:reset` để xoá và nạp lại.");
    process.exit(0);
  }
  if (reset) {
    for (const n of ["users", "customers", "tours", "services", "suppliers", "quotes", "bookings", "transactions", "settings", "counters"]) {
      await db.collection(n).deleteMany({});
    }
  }
  const now = new Date().toISOString();
  const hash = await bcrypt.hash(PASSWORD, 10);

  // ---------------- Cài đặt ----------------
  const settings: Settings = {
    _id: "main",
    rates: DEFAULT_RATES,
    defaultCommissionRate: 10,
    childRatio: 0.5,
    company: {
      name: "CÔNG TY TNHH MTV DU LỊCH SINH THÁI VÀ MÔI TRƯỜNG CÔN ĐẢO",
      brand: "ConDaoTrip",
      phone: "0947 474 864",
      email: "tienconghuynh@gmail.com",
      address: "Khu 5, Nguyễn Đức Thuận, Đặc khu Côn Đảo, TP. Hồ Chí Minh",
      taxCode: "3502434454",
    },
  };
  await db.collection("settings").insertOne(settings as never);

  // ---------------- Danh mục tour & dịch vụ (từ website) ----------------
  const tours: Tour[] = TOUR_SEEDS.map((t) => ({
    _id: t.slug, slug: t.slug, name: t.name, type: t.type, group: t.group, duration: t.duration,
    description: t.description, image: cloudImg(t.image), priceVnd: t.priceVnd, priceNote: t.priceNote,
    components: t.components, url: `https://condaotrip.com.vn/tour/${t.slug}`, active: true,
  }));
  await db.collection("tours").insertMany(tours as never[]);
  const services: Service[] = SERVICE_SEEDS.map((s) => ({
    ...s, _id: s.slug, url: `https://condaotrip.com.vn/service/${s.slug}`, active: true,
  }));
  await db.collection("services").insertMany(services as never[]);

  // ---------------- Người dùng ----------------
  const mkUser = (id: string, name: string, email: string, role: User["role"], extra: Partial<User> = {}): User => ({
    _id: id, name, email, role, passwordHash: hash, active: true, createdAt: now, ...extra,
  });
  const users: User[] = [
    mkUser("u-operator", "Trần Hữu Phước", "dieuhanh@condaotrip.demo", "operator", { phone: "0901 000 101" }),
    mkUser("u-accountant", "Nguyễn Thu Hà", "ketoan@condaotrip.demo", "accountant", { phone: "0901 000 102" }),
    mkUser("u-bao", "Phạm Quốc Bảo", "sale.bao@condaotrip.demo", "sale", { phone: "0901 000 103", commissionRate: 10 }),
    mkUser("u-linh", "Võ Ngọc Linh", "sale.linh@condaotrip.demo", "sale", { phone: "0901 000 104", commissionRate: 12 }),
    mkUser("u-sunrise", "Sunrise Travel (Đối tác)", "doitac@condaotrip.demo", "customer", { customerId: "c-sunrise" }),
  ];
  await db.collection("users").insertMany(users as never[]);
  const userName = (id?: string) => users.find((u) => u._id === id)?.name;

  // ---------------- Khách hàng / đại lý ----------------
  const mkCust = (id: string, name: string, kind: Customer["kind"], extra: Partial<Customer>): Customer => ({
    _id: id, name, kind, createdAt: now, ...extra,
  });
  const customers: Customer[] = [
    mkCust("c-sunrise", "Sunrise Travel", "agent", { contactName: "Ms. Hạnh", phone: "0902 100 001", email: "doitac@condaotrip.demo", country: "Việt Nam", saleId: "u-bao", note: "Đại lý lữ hành TP.HCM, đưa đoàn định kỳ" }),
    mkCust("c-blue", "Shanghai Blue Sea Travel", "agent", { contactName: "Mr. Wang", phone: "+86 21 5555 0101", email: "wang@bluesea.example", country: "Trung Quốc", saleId: "u-linh", note: "Báo giá bằng RMB" }),
    mkCust("c-seoul", "Seoul Island Tours", "agent", { contactName: "Ms. Kim", phone: "+82 2 555 0102", email: "kim@seoulisland.example", country: "Hàn Quốc", saleId: "u-linh", note: "Báo giá bằng USD" }),
    mkCust("c-abc", "Công ty CP ABC (Team building)", "agent", { contactName: "Chị Thảo", phone: "0902 100 004", country: "Việt Nam", saleId: "u-bao" }),
    mkCust("c-minh", "Anh Hoàng Minh", "individual", { phone: "0902 100 005", country: "Việt Nam", saleId: "u-bao" }),
    mkCust("c-lan", "Chị Ngọc Lan", "individual", { phone: "0902 100 006", country: "Việt Nam", saleId: "u-linh" }),
    mkCust("c-tuan", "Anh Tuấn & gia đình", "individual", { phone: "0902 100 007", country: "Việt Nam", saleId: "u-bao" }),
  ];
  await db.collection("customers").insertMany(customers as never[]);

  // ---------------- Nhà cung cấp (dữ liệu mẫu) ----------------
  const sp = (name: string, category: string, unit: string, costVnd: number) => ({ id: uid(), name, category, unit, costVnd });
  const suppliers: Supplier[] = [
    { _id: "s-hotel1", name: "Khách sạn Biển Xanh (mẫu)", categories: ["hotel"], contactName: "Lễ tân", phone: "0903 200 001", address: "Trung tâm thị trấn Côn Đảo", bank: "VCB 0011 2233 44 – KS Biển Xanh", prices: [sp("Phòng Deluxe 2 khách", "hotel", "phòng/đêm", 850000), sp("Phòng Family 4 khách", "hotel", "phòng/đêm", 1300000)] },
    { _id: "s-hotel2", name: "Resort Hàng Dương (mẫu)", categories: ["hotel"], contactName: "Sales Mr. Dũng", phone: "0903 200 002", address: "Đường ven biển, Côn Đảo", prices: [sp("Phòng Superior", "hotel", "phòng/đêm", 1100000), sp("Villa 2 phòng ngủ", "hotel", "phòng/đêm", 2800000)] },
    { _id: "s-xe", name: "Nhà xe Côn Sơn (mẫu)", categories: ["transfer", "rental"], contactName: "Anh Sơn", phone: "0903 200 003", prices: [sp("Xe 16 chỗ đón tiễn sân bay", "transfer", "lượt", 220000), sp("Xe 16 chỗ tham quan", "transfer", "ngày", 1500000), sp("Xe máy tự lái", "rental", "xe/ngày", 120000)] },
    { _id: "s-cano", name: "Cano Hòn Cau (mẫu)", categories: ["boat", "fishing"], contactName: "Thuyền trưởng Hải", phone: "0903 200 004", prices: [sp("Cano 18 chỗ Hòn Bảy Cạnh", "boat", "chuyến", 5200000), sp("Tàu câu cá", "fishing", "chuyến", 3800000)] },
    { _id: "s-tau", name: "Tàu cao tốc Vũng Tàu (mẫu)", categories: ["ferry"], contactName: "Phòng vé", phone: "0903 200 005", prices: [sp("Vé hạng thường", "ferry", "vé", 640000), sp("Vé VIP", "ferry", "vé", 790000)] },
    { _id: "s-bay", name: "Đại lý vé máy bay Sao Việt (mẫu)", categories: ["flight"], contactName: "Chị Mai", phone: "0903 200 006", email: "ve@saoviet.example", prices: [sp("Vé SGN – VCS (1 chiều)", "flight", "vé", 1050000)] },
    { _id: "s-nhahang", name: "Nhà hàng Hải sản Bến Đầm (mẫu)", categories: ["meal"], contactName: "Chị Hoa", phone: "0903 200 007", prices: [sp("Set menu đoàn 150k", "meal", "suất", 150000), sp("Set menu đoàn 220k", "meal", "suất", 220000)] },
    { _id: "s-hdv", name: "HDV Nguyễn Văn Nam (mẫu)", categories: ["guide"], contactName: "Anh Nam", phone: "0903 200 008", prices: [sp("HDV tiếng Việt", "guide", "ngày", 650000), sp("HDV tiếng Anh", "guide", "ngày", 900000)] },
    { _id: "s-gear", name: "Dụng cụ lặn Biển Xanh (mẫu)", categories: ["gear", "ticket"], contactName: "Anh Tín", phone: "0903 200 009", prices: [sp("Bộ snorkeling", "gear", "bộ", 50000), sp("Vé tham quan di tích (đoàn)", "ticket", "vé", 40000)] },
    { _id: "s-event", name: "Sự kiện & Ảnh Côn Đảo (mẫu)", categories: ["event", "photo"], contactName: "Chị Vy", phone: "0903 200 010", prices: [sp("Team building trọn gói", "event", "khách", 300000), sp("Chụp ảnh + flycam", "photo", "buổi", 1100000)] },
  ].map((s) => ({ active: true, createdAt: now, ...s }) as Supplier);
  await db.collection("suppliers").insertMany(suppliers as never[]);
  const supplierFor = (cat: string): Supplier => {
    const direct = suppliers.filter((s) => s.categories.includes(cat));
    const pool = direct.length ? direct : suppliers;
    return pool[Math.floor(rnd() * pool.length)];
  };

  // ---------------- Booking mẫu ----------------
  const tourItem = (slug: string, qty = 1): QuoteItem => {
    const t = tours.find((x) => x.slug.includes(slug))!;
    const pkg = t.type === "package";
    return { id: uid(), refType: "tour", refId: t._id, name: t.name, category: pkg ? "package" : "tour", origin: pkg ? "package" : "retail", basis: "pax", qty, unitPriceVnd: t.priceVnd, components: pkg ? t.components : undefined, image: t.image };
  };
  const svcItem = (slug: string, qty = 1): QuoteItem => {
    const s = services.find((x) => x.slug.includes(slug))!;
    return { id: uid(), refType: "service", refId: s._id, name: s.name, category: s.category, origin: "retail", basis: s.basis, qty, unitPriceVnd: s.priceVnd };
  };

  type Spec = {
    group: string; cust: string; sale?: string; date: string; adults: number; children?: number; infants?: number;
    items: QuoteItem[]; cur?: string; discount?: number; arranged?: number; debt?: number; byCustomer?: boolean;
  };
  const S: Spec[] = [
    { group: "Đoàn Sunrise 06/06 – 14 khách", cust: "c-sunrise", sale: "u-bao", date: "2026-06-06", adults: 12, children: 2, items: [tourItem("3n2d-kham-pha")] },
    { group: "Gia đình Hoàng Minh – lặn san hô", cust: "c-minh", sale: "u-bao", date: "2026-06-14", adults: 3, children: 1, items: [tourItem("hon-bay-canh-boi"), svcItem("thue-xe-may", 2)] },
    { group: "Gia đình chị Lan 4N3Đ", cust: "c-lan", sale: "u-linh", date: "2026-06-22", adults: 4, children: 2, items: [tourItem("4n3d")] },
    { group: "Đoàn Blue Sea (CN) – 20 khách", cust: "c-blue", sale: "u-linh", date: "2026-07-03", adults: 20, items: [tourItem("3n2d-kham-pha")], cur: "CNY", debt: 0.15 },
    { group: "Solo – chị Lan 2N1Đ", cust: "c-lan", sale: "u-linh", date: "2026-07-11", adults: 1, items: [tourItem("solo-traveler-2n1d")] },
    { group: "Team building Cty ABC – 30 khách", cust: "c-abc", sale: "u-bao", date: "2026-07-19", adults: 30, items: [svcItem("team-building", 1), svcItem("thue-cano", 2), svcItem("khong-gian-to-chuc-tiec")] },
    { group: "Đoàn Sunrise 27/07 – 8 khách", cust: "c-sunrise", sale: "u-bao", date: "2026-07-27", adults: 8, items: [tourItem("2n1d-binh-yen")] },
    { group: "Đoàn Seoul Island – 10 khách", cust: "c-seoul", sale: "u-linh", date: "2026-08-05", adults: 10, items: [tourItem("4n3d")], cur: "USD", discount: 1500000 },
    { group: "Anh Tuấn – vé tàu + khách sạn", cust: "c-tuan", sale: "u-bao", date: "2026-08-13", adults: 5, items: [svcItem("tau-vung-tau"), svcItem("the-secret", 3)] },
    { group: "Đoàn Sunrise 21/08 – 16 khách", cust: "c-sunrise", sale: "u-bao", date: "2026-08-21", adults: 14, children: 2, items: [tourItem("3n2d-kham-pha")] },
    { group: "Nhóm bạn – xem rùa", cust: "c-minh", sale: "u-bao", date: "2026-08-29", adults: 6, items: [tourItem("tha-rua-con"), svcItem("thue-huong-dan-vien")] },
    { group: "Đoàn Sunrise 04/09 – 18 khách", cust: "c-sunrise", sale: "u-bao", date: "2026-09-04", adults: 16, children: 2, items: [tourItem("3n2d-kham-pha")], debt: 0.2 },
    { group: "Solo 3N2Đ – anh Minh", cust: "c-minh", sale: "u-bao", date: "2026-09-12", adults: 2, items: [tourItem("solo-traveler-3n2d")] },
    { group: "Đoàn 4N3Đ 20/09 – 12 khách", cust: "c-tuan", sale: "u-bao", date: "2026-09-20", adults: 12, items: [tourItem("4n3d")] },
    { group: "Nhóm câu cá – anh Tuấn", cust: "c-tuan", sale: "u-bao", date: "2026-09-27", adults: 6, items: [svcItem("thue-tau-cau-ca"), svcItem("dung-cu-cau-ca")] },
    { group: "Đoàn Blue Sea (CN) – 22 khách", cust: "c-blue", sale: "u-linh", date: "2026-10-03", adults: 22, items: [tourItem("4n3d")], cur: "CNY", debt: 0.25 },
    { group: "Khách lẻ: xe + HDV + xe máy", cust: "c-lan", sale: "u-linh", date: "2026-10-11", adults: 4, items: [svcItem("xe-du-lich"), svcItem("huong-dan-vien"), svcItem("thue-xe-may", 2)] },
    { group: "Đối tác Sunrise tự đặt – 9 khách", cust: "c-sunrise", date: "2026-10-18", adults: 9, items: [tourItem("3n2d-kham-pha")], byCustomer: true },
    { group: "Đoàn 2N1Đ 26/10 – 11 khách", cust: "c-abc", sale: "u-bao", date: "2026-10-26", adults: 11, items: [tourItem("2n1d-binh-yen")] },
    { group: "Nhóm Hòn Bảy Cạnh 02/11", cust: "c-minh", sale: "u-bao", date: "2026-11-02", adults: 8, items: [tourItem("hon-bay-canh-boi")], debt: 0.4 },
    { group: "Đoàn Sunrise 10/11 – 12 khách", cust: "c-sunrise", sale: "u-bao", date: "2026-11-10", adults: 12, items: [tourItem("3n2d-kham-pha")], arranged: 0.65 },
    { group: "Gia đình Tuấn 4N3Đ – 15/11", cust: "c-tuan", sale: "u-bao", date: "2026-11-15", adults: 6, children: 2, items: [tourItem("4n3d"), svcItem("chup-anh")], arranged: 0.3 },
    { group: "Đoàn Blue Sea (CN) 20/11 – 20 khách", cust: "c-blue", sale: "u-linh", date: "2026-11-20", adults: 20, items: [tourItem("3n2d-kham-pha")], cur: "CNY", arranged: 0 },
    { group: "Gala dinner Cty ABC – 24 khách", cust: "c-abc", sale: "u-bao", date: "2026-11-28", adults: 24, items: [svcItem("team-building"), svcItem("the-secret", 12)], arranged: 0 },
    { group: "Đoàn Seoul Island – 05/12", cust: "c-seoul", sale: "u-linh", date: "2026-12-05", adults: 10, items: [tourItem("4n3d")], cur: "USD", arranged: 0 },
    { group: "Đoàn 2N1Đ 18/12 – 6 khách", cust: "c-lan", sale: "u-linh", date: "2026-12-18", adults: 6, items: [tourItem("2n1d-binh-yen")], arranged: 0 },
  ];

  const quotes: Quote[] = [];
  const bookings: Booking[] = [];
  const txs: Transaction[] = [];
  const seq: Record<string, number> = {};
  const nextSeq = (k: string) => (seq[k] = (seq[k] ?? 0) + 1);
  const code = (p: string, d: string) => {
    const k = `${p}-${ym(d)}`;
    return `${k}-${String(nextSeq(k)).padStart(4, "0")}`;
  };
  const tx = (t: Partial<Transaction> & Pick<Transaction, "type" | "kind" | "amountVnd" | "date">): Transaction => ({
    _id: uid(), method: "Chuyển khoản", createdBy: "u-accountant", createdAt: t.date + "T08:00:00.000Z", ...t,
  });

  for (const sp of S) {
    const cust = customers.find((c) => c._id === sp.cust)!;
    const created = addDays(sp.date, -18);
    const qid = uid();
    const quote: Quote = {
      _id: qid, code: code("BG", created), groupName: sp.group, customerId: cust._id, customerName: cust.name,
      saleId: sp.sale, saleName: userName(sp.sale), travelDate: sp.date,
      adults: sp.adults, children: sp.children ?? 0, infants: sp.infants ?? 0, childRatio: 0.5,
      currency: sp.cur ?? "VND", mode: "total", rates: DEFAULT_RATES, items: sp.items, discountVnd: sp.discount ?? 0,
      status: "confirmed", createdBy: sp.byCustomer ? "u-sunrise" : sp.sale ?? "u-operator",
      createdByRole: sp.byCustomer ? "customer" : "sale", createdAt: created + "T03:00:00.000Z", updatedAt: created + "T03:00:00.000Z",
    };
    const rate = users.find((u) => u._id === sp.sale)?.commissionRate ?? 0;
    quote.bookingIds = [];
    for (const part of splitQuote(quote)) {
    const bid = uid();
    const bk = buildBooking(part, { id: bid, code: code("BK", created), confirmedBy: quote.createdBy, commissionRate: rate, createdAt: addDays(created, 2) + "T03:00:00.000Z" });
    quote.bookingId ??= bid;
    quote.bookingIds.push(bid);

    // --- xếp dịch vụ ---
    const past = sp.date <= TODAY;
    const share = past ? 1 : sp.arranged ?? 0;
    const target = bk.sellVnd * between(0.7, 0.8);
    const W: Record<string, number> = { hotel: 4, meal: 2, boat: 3, transfer: 1.5, guide: 1, gear: 0.5, ticket: 0.5, ferry: 2, flight: 2 };
    const wsum = bk.lines.reduce((s, l) => s + (W[l.category] ?? 1.5), 0);
    const toArrange = Math.round(bk.lines.length * share);
    bk.lines.forEach((l, i) => {
      if (i >= toArrange) return;
      const s = supplierFor(l.category);
      const cost = Math.round(((target * (W[l.category] ?? 1.5)) / wsum) / 1000) * 1000;
      l.status = "arranged";
      l.supplierId = s._id;
      l.supplierName = s.name;
      l.costVnd = cost;
      l.arrangeInfo = `${s.prices[0]?.name ?? l.name} · ${l.qty} ${l.unit} · LH: ${s.contactName ?? s.name} ${s.phone ?? ""}`.trim();
      l.arrangedBy = "Trần Hữu Phước";
      l.arrangedAt = addDays(created, 4 + (i % 5)) + "T04:00:00.000Z";
    });

    // --- thu khách ---
    const owed = sp.debt ?? 0;
    const collect = Math.round((bk.sellVnd * (1 - owed)) / 1000) * 1000;
    const dep = Math.round((bk.sellVnd * 0.3) / 1000) * 1000;
    const base = { bookingId: bid, bookingCode: bk.code, partyName: cust.name } as const;
    txs.push(tx({ ...base, type: "thu", kind: "deposit", amountVnd: dep, date: addDays(created, 3), note: "Đặt cọc 30%" }));
    if (past) {
      if (collect > dep) txs.push(tx({ ...base, type: "thu", kind: "payment", amountVnd: collect - dep, date: addDays(sp.date, -3), note: "Thanh toán còn lại" }));
    } else if (share > 0 || sp.date <= "2026-11-30") {
      txs.push(tx({ ...base, type: "thu", kind: "advance", amountVnd: Math.round((bk.sellVnd * 0.2) / 1000) * 1000, date: addDays(TODAY, -2), note: "Tạm ứng đợt 2" }));
    }

    // --- chi NCC & hoa hồng cho tour đã diễn ra ---
    if (past) {
      const bySup = new Map<string, { name: string; sum: number }>();
      for (const l of bk.lines) if (l.supplierId) {
        const e = bySup.get(l.supplierId) ?? { name: l.supplierName!, sum: 0 };
        e.sum += l.costVnd ?? 0;
        bySup.set(l.supplierId, e);
      }
      const recent = sp.date > addDays(TODAY, -25);
      for (const [sid, e] of bySup) {
        const amt = Math.round((e.sum * (recent ? 0.5 : 1)) / 1000) * 1000;
        if (amt > 0) txs.push(tx({ type: "chi", kind: "supplier", amountVnd: amt, date: addDays(sp.date, 5), bookingId: bid, bookingCode: bk.code, supplierId: sid, supplierName: e.name, partyName: e.name, note: `Thanh toán NCC – ${bk.code}` }));
      }
      const fin = bookingFinance(bk);
      if (fin.commission > 0 && !recent && bk.saleId) {
        txs.push(tx({ type: "chi", kind: "commission", amountVnd: fin.commission, date: addDays(sp.date, 12), bookingId: bid, bookingCode: bk.code, userId: bk.saleId, userName: bk.saleName, partyName: bk.saleName, note: `Hoa hồng ${bk.code}` }));
      }
    }
    bookings.push(bk);
    }
    quotes.push(quote);
  }

  // --- chi phí vận hành hằng tháng ---
  for (const m of ["2026-06", "2026-07", "2026-08", "2026-09", "2026-10"]) {
    txs.push(tx({ type: "chi", kind: "expense", amountVnd: 45000000, date: `${m}-28`, partyName: "Lương nhân viên", note: `Lương tháng ${m.slice(5)}` }));
    txs.push(tx({ type: "chi", kind: "expense", amountVnd: 12000000, date: `${m}-05`, partyName: "Chủ nhà văn phòng", note: "Thuê văn phòng" }));
    txs.push(tx({ type: "chi", kind: "expense", amountVnd: 8000000, date: `${m}-15`, partyName: "Quảng cáo Facebook/Google", note: "Marketing" }));
  }
  txs.push(tx({ type: "thu", kind: "income", amountVnd: 6500000, date: "2026-09-10", partyName: "Hoa hồng đối tác bảo hiểm", note: "Hoa hồng bảo hiểm du lịch" }));

  await db.collection("quotes").insertMany(quotes as never[]);
  await db.collection("bookings").insertMany(bookings as never[]);
  await db.collection("transactions").insertMany(txs as never[]);
  await db.collection("counters").insertMany(Object.entries(seq).map(([k, v]) => ({ _id: k, seq: v })) as never[]);

  await ensureIndexes(db);

  console.log(`✔ Đã ghi: ${users.length} người dùng, ${customers.length} khách hàng, ${tours.length} tour, ${services.length} dịch vụ,`);
  console.log(`  ${suppliers.length} NCC, ${quotes.length} báo giá, ${bookings.length} booking, ${txs.length} giao dịch thu/chi.`);
  console.log(`  Mật khẩu demo mọi tài khoản: ${PASSWORD}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
