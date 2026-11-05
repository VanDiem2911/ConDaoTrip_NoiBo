import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { ToastProvider } from "@/components/toast";
import "./globals.css";

const bevn = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-bevn",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "ConDaoTrip · Quản lý nội bộ", template: "%s · ConDaoTrip" },
  description: "Hệ thống tính giá tour, điều hành dịch vụ, nhà cung cấp, hoa hồng và công nợ của ConDaoTrip.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0f3a2e" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={bevn.variable}>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
