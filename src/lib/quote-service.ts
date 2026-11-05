import { ApiError, num, str } from "./api";
import { isBackoffice, isStaff } from "./access";
import { buildBooking, splitQuote } from "./booking";
import { col, newId, nextCode, nowIso } from "./db";
import { getSettings } from "./data";
import { CURRENCIES } from "./money";
import { uid } from "./pricing";
import type { Customer, Quote, QuoteItem, Service, SessionUser, Tour, User } from "./types";

const int = (v: unknown, min = 0) => Math.max(min, Math.floor(num(v)));

/** Chuẩn hoá & kiểm tra dữ liệu báo giá do client gửi lên */
export async function normalizeQuote(input: Record<string, unknown>, user: SessionUser): Promise<Omit<Quote, "_id" | "code" | "createdAt" | "createdBy" | "createdByRole" | "status" | "bookingId">> {
  const groupName = str(input.groupName);
  if (!groupName) throw new ApiError(400, "Vui lòng nhập tên đoàn / khách để tách riêng báo giá");
  const travelDate = str(input.travelDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(travelDate)) throw new ApiError(400, "Vui lòng chọn ngày khởi hành");
  const adults = int(input.adults);
  const children = int(input.children);
  const infants = int(input.infants);
  if (adults + children < 1) throw new ApiError(400, "Cần ít nhất 1 khách");

  const rawItems = Array.isArray(input.items) ? (input.items as Record<string, unknown>[]) : [];
  if (!rawItems.length) throw new ApiError(400, "Chưa chọn tour / dịch vụ nào");
  const staff = isStaff(user.role);
  const tours = await col<Tour>("tours");
  const services = await col<Service>("services");

  const items: QuoteItem[] = [];
  for (const r of rawItems) {
    const refType = str(r.refType) as QuoteItem["refType"];
    const qty = Math.max(0.1, num(r.qty, 1));
    if (refType === "tour") {
      const t = await tours.findOne({ _id: str(r.refId) });
      if (!t || (!t.active && !staff)) throw new ApiError(400, "Tour không tồn tại hoặc đã đóng");
      const pkg = t.type === "package";
      items.push({
        id: str(r.id) || uid(), refType, refId: t._id, name: t.name, category: pkg ? "package" : "tour",
        origin: pkg ? "package" : "retail", basis: "pax", qty,
        unitPriceVnd: staff ? Math.max(0, Math.round(num(r.unitPriceVnd, t.priceVnd))) : t.priceVnd,
        components: pkg ? t.components : undefined, image: t.image,
      });
    } else if (refType === "service") {
      const s = await services.findOne({ _id: str(r.refId) });
      if (!s || (!s.active && !staff)) throw new ApiError(400, "Dịch vụ không tồn tại hoặc đã đóng");
      items.push({
        id: str(r.id) || uid(), refType, refId: s._id, name: s.name, category: s.category, origin: "retail",
        basis: s.basis, qty,
        unitPriceVnd: staff ? Math.max(0, Math.round(num(r.unitPriceVnd, s.priceVnd))) : s.priceVnd,
      });
    } else if (refType === "custom") {
      if (!staff) throw new ApiError(403, "Chỉ nhân viên mới thêm được dòng tuỳ chọn");
      const name = str(r.name);
      if (!name) throw new ApiError(400, "Dòng tuỳ chọn cần có tên");
      items.push({
        id: str(r.id) || uid(), refType, name, category: str(r.category) || "other", origin: "retail",
        basis: r.basis === "group" ? "group" : "pax", qty, unitPriceVnd: Math.max(0, Math.round(num(r.unitPriceVnd))),
      });
    } else throw new ApiError(400, "Dòng dịch vụ không hợp lệ");
  }

  const settings = await getSettings();
  const currency = CURRENCIES.some((c) => c.code === input.currency) ? String(input.currency) : "VND";

  // Khách hàng / đối tác
  const customers = await col<Customer>("customers");
  let customerId: string | undefined;
  let customerName = str(input.customerName);
  if (user.role === "customer") {
    customerId = user.customerId;
    const c = customerId ? await customers.findOne({ _id: customerId }) : null;
    customerName = c?.name ?? user.name;
  } else if (str(input.customerId)) {
    const c = await customers.findOne({ _id: str(input.customerId) });
    if (c) {
      customerId = c._id;
      customerName = c.name;
    }
  }
  if (!customerName) customerName = groupName;

  // Sale phụ trách
  const users = await col<User>("users");
  let saleId: string | undefined;
  if (user.role === "sale") saleId = user.id;
  else if (isBackoffice(user.role) && str(input.saleId)) saleId = str(input.saleId);
  else if (user.role === "customer" && customerId) saleId = (await customers.findOne({ _id: customerId }))?.saleId;
  const sale = saleId ? await users.findOne({ _id: saleId, role: "sale" }) : null;

  return {
    groupName, customerId, customerName, saleId: sale?._id, saleName: sale?.name,
    travelDate, adults, children, infants, childRatio: settings.childRatio,
    currency, mode: input.mode === "perPax" ? "perPax" : "total", rates: settings.rates, items,
    discountVnd: staff ? Math.max(0, Math.round(num(input.discountVnd))) : 0,
    note: str(input.note) || undefined, updatedAt: nowIso(),
  };
}

/** Xác nhận báo giá -> sinh booking; điều hành sẽ thấy các dịch vụ cần xếp.
 *  Báo giá gồm cả trọn gói và dịch vụ lẻ được tách thành 2 booking để tính doanh thu/hoa hồng riêng. */
export async function confirmQuote(q: Quote, user: SessionUser) {
  const quotes = await col<Quote>("quotes");
  const bookings = await col<import("./types").Booking>("bookings");
  if (q.status === "confirmed" && q.bookingId) return { bookingId: q.bookingId, bookingIds: q.bookingIds ?? [q.bookingId] };
  if (q.status !== "draft") throw new ApiError(400, "Báo giá này không thể xác nhận");

  const settings = await getSettings();
  const sale = q.saleId ? await (await col<User>("users")).findOne({ _id: q.saleId }) : null;
  const ids: string[] = [];
  for (const part of splitQuote(q)) {
    const id = newId();
    await bookings.insertOne(buildBooking(part, {
      id, code: await nextCode("BK"), confirmedBy: user.id,
      commissionRate: sale?.commissionRate ?? settings.defaultCommissionRate, createdAt: nowIso(),
    }));
    ids.push(id);
  }
  await quotes.updateOne({ _id: q._id }, { $set: { status: "confirmed", bookingId: ids[0], bookingIds: ids, updatedAt: nowIso() } });
  return { bookingId: ids[0], bookingIds: ids };
}
