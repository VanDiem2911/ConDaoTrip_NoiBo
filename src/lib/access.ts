import type { Role } from "./types";

export const STAFF_ROLES: Role[] = ["sale", "operator", "accountant"];
export const BACKOFFICE: Role[] = ["operator", "accountant"];

export const isStaff = (r: Role) => STAFF_ROLES.includes(r);
/** Điều hành & Kế toán: xem/dùng mọi tính năng, thấy giá vốn */
export const isBackoffice = (r: Role) => BACKOFFICE.includes(r);
/** Chỉ điều hành & kế toán mới thấy giá vốn / công nợ NCC */
export const canSeeCost = isBackoffice;

export type NavIcon =
  | "home" | "plane" | "calc" | "calendar" | "users" | "coins" | "ledger"
  | "swap" | "card" | "chart" | "settings" | "route" | "truck";

export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
  roles: Role[];
}

const ALL: Role[] = ["customer", "sale", "operator", "accountant"];

/** Thứ tự & tên theo mẫu giao diện: Tổng quan → … → Cài đặt hệ thống */
export const NAV: NavItem[] = [
  { href: "/", label: "Tổng quan", icon: "home", roles: ALL },
  { href: "/tours", label: "Tour du lịch", icon: "plane", roles: ALL },
  { href: "/quotes", label: "Tính giá tour", icon: "calc", roles: ALL },
  { href: "/bookings", label: "Booking & Đặt tour", icon: "calendar", roles: ["sale", ...BACKOFFICE] },
  { href: "/operations", label: "Điều hành dịch vụ", icon: "route", roles: BACKOFFICE },
  { href: "/suppliers", label: "Nhà cung cấp", icon: "truck", roles: BACKOFFICE },
  { href: "/customers", label: "Khách hàng (CRM)", icon: "users", roles: BACKOFFICE },
  { href: "/commissions", label: "Hoa hồng", icon: "coins", roles: ["sale", ...BACKOFFICE] },
  { href: "/accounting", label: "Kế toán nội bộ", icon: "ledger", roles: BACKOFFICE },
  { href: "/cashbook", label: "Thu - Chi", icon: "swap", roles: BACKOFFICE },
  { href: "/debts", label: "Công nợ", icon: "card", roles: BACKOFFICE },
  { href: "/reports", label: "Báo cáo thống kê", icon: "chart", roles: BACKOFFICE },
  { href: "/settings", label: "Cài đặt hệ thống", icon: "settings", roles: BACKOFFICE },
];

export const navFor = (role: Role) => NAV.filter((n) => n.roles.includes(role));
