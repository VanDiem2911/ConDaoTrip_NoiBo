export type Role = "customer" | "sale" | "operator" | "accountant";

export const ROLE_LABEL: Record<Role, string> = {
  customer: "Khách hàng / Đối tác",
  sale: "Sale",
  operator: "Điều hành",
  accountant: "Kế toán",
};

export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  passwordHash: string;
  role: Role;
  /** % hoa hồng trên lợi nhuận gộp (chỉ sale) */
  commissionRate?: number;
  customerId?: string;
  active: boolean;
  createdAt: string;
}

export type SessionUser = Pick<User, "name" | "email" | "role" | "phone" | "commissionRate" | "customerId" | "active"> & { id: string };

export type ProductType = "package" | "day";

export interface Component {
  name: string;
  category: string;
  basis: "pax" | "group";
  qty: number;
}

export interface Tour {
  _id: string;
  slug: string;
  name: string;
  type: ProductType; // package = trọn gói nhiều ngày, day = tour trong ngày (dịch vụ lẻ)
  group: string; // nhóm hiển thị trên website
  duration: string;
  description: string;
  image?: string;
  priceVnd: number; // giá bán tham khảo / khách (0 = liên hệ)
  priceNote?: string;
  components?: Component[];
  url?: string;
  active: boolean;
}

export interface Service {
  _id: string;
  slug: string;
  name: string;
  category: string; // key trong SERVICE_CATEGORIES
  unit: string;
  description: string;
  priceVnd: number;
  basis: "pax" | "group";
  url?: string;
  active: boolean;
}

export interface SupplierPrice {
  id: string;
  name: string;
  category: string;
  unit: string;
  costVnd: number;
}

export interface Supplier {
  _id: string;
  name: string;
  categories: string[];
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  bank?: string;
  note?: string;
  prices: SupplierPrice[];
  active: boolean;
  createdAt: string;
}

export interface Customer {
  _id: string;
  name: string;
  kind: "agent" | "individual";
  contactName?: string;
  phone?: string;
  email?: string;
  country?: string;
  note?: string;
  saleId?: string;
  createdAt: string;
}

export type ItemOrigin = "package" | "retail";

export interface QuoteItem {
  id: string;
  refType: "tour" | "service" | "custom";
  refId?: string;
  name: string;
  category: string;
  origin: ItemOrigin;
  basis: "pax" | "group";
  qty: number;
  unitPriceVnd: number;
  components?: Component[];
  image?: string;
}

export type QuoteStatus = "draft" | "confirmed" | "cancelled";

export interface Quote {
  _id: string;
  code: string;
  groupName: string;
  customerId?: string;
  customerName: string;
  saleId?: string;
  saleName?: string;
  travelDate: string;
  adults: number;
  children: number;
  infants: number;
  childRatio: number;
  currency: string;
  mode: "total" | "perPax";
  rates: Record<string, number>;
  items: QuoteItem[];
  discountVnd: number;
  note?: string;
  status: QuoteStatus;
  bookingId?: string;
  /** Báo giá có cả trọn gói và dịch vụ lẻ được tách thành 2 booking riêng */
  bookingIds?: string[];
  createdBy: string;
  createdByRole: Role;
  createdAt: string;
  updatedAt: string;
}

export type LineStatus = "pending" | "arranged";

export interface BookingLine {
  id: string;
  itemId: string;
  name: string;
  category: string;
  origin: ItemOrigin;
  tourName?: string; // tên tour trọn gói chứa dòng này
  qty: number; // số lượng thực tế cần xếp
  unit: string;
  status: LineStatus;
  supplierId?: string;
  supplierName?: string;
  costVnd?: number;
  arrangeInfo?: string;
  arrangedBy?: string;
  arrangedAt?: string;
}

export type BookingStatus = "confirmed" | "cancelled";

export interface Booking {
  _id: string;
  code: string;
  quoteId: string;
  kind: "package" | "retail";
  groupName: string;
  customerId?: string;
  customerName: string;
  saleId?: string;
  saleName?: string;
  travelDate: string;
  adults: number;
  children: number;
  infants: number;
  cover?: string;
  title: string;
  items: QuoteItem[];
  lines: BookingLine[];
  sellVnd: number;
  discountVnd: number;
  commissionRate: number;
  status: BookingStatus;
  confirmedBy: string;
  createdAt: string;
}

export type TxKind = "deposit" | "advance" | "payment" | "supplier" | "commission" | "expense" | "income";

export interface Transaction {
  _id: string;
  type: "thu" | "chi";
  kind: TxKind;
  amountVnd: number;
  date: string;
  method: string;
  bookingId?: string;
  bookingCode?: string;
  supplierId?: string;
  supplierName?: string;
  userId?: string;
  userName?: string;
  partyName?: string;
  note?: string;
  createdBy: string;
  createdAt: string;
}

export interface Settings {
  _id: "main";
  rates: Record<string, number>;
  defaultCommissionRate: number;
  childRatio: number;
  company: { name: string; brand: string; phone: string; email: string; address: string; taxCode: string };
}

export const SERVICE_CATEGORIES: Record<string, string> = {
  flight: "Vé máy bay",
  ferry: "Vé tàu cao tốc",
  hotel: "Khách sạn & Resort",
  transfer: "Đón tiễn / Xe",
  rental: "Thuê xe máy & xe đạp",
  boat: "Cano & Tàu",
  fishing: "Câu cá",
  gear: "Dụng cụ & Phụ kiện",
  guide: "Hướng dẫn viên",
  meal: "Ăn uống",
  ticket: "Vé tham quan",
  event: "Tiệc & Team building",
  photo: "Chụp ảnh / Flycam",
  tour: "Tour trong ngày",
  package: "Tour trọn gói",
  other: "Khác",
};

export const TX_KIND_LABEL: Record<TxKind, string> = {
  deposit: "Đặt cọc",
  advance: "Tạm ứng",
  payment: "Thanh toán",
  supplier: "Trả NCC",
  commission: "Chi hoa hồng",
  expense: "Chi phí khác",
  income: "Thu khác",
};
