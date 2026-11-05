import type { Db } from "mongodb";

/** Chỉ mục cho các truy vấn thường dùng (lọc theo vai trò, theo booking, theo NCC, theo ngày). Chạy nhiều lần vẫn an toàn. */
export async function ensureIndexes(db: Db) {
  await Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("customers").createIndex({ saleId: 1 }),
    db.collection("suppliers").createIndex({ active: 1, name: 1 }),
    db.collection("bookings").createIndex({ status: 1, travelDate: 1 }),
    db.collection("bookings").createIndex({ saleId: 1 }),
    db.collection("bookings").createIndex({ customerId: 1 }),
    db.collection("bookings").createIndex({ confirmedBy: 1 }),
    db.collection("quotes").createIndex({ createdBy: 1, createdAt: -1 }),
    db.collection("quotes").createIndex({ customerId: 1 }),
    db.collection("quotes").createIndex({ saleId: 1 }),
    db.collection("transactions").createIndex({ bookingId: 1 }),
    db.collection("transactions").createIndex({ type: 1, bookingId: 1 }),
    db.collection("transactions").createIndex({ kind: 1, bookingId: 1 }),
    db.collection("transactions").createIndex({ type: 1, kind: 1, supplierId: 1 }),
    db.collection("transactions").createIndex({ date: -1 }),
  ]);
}
