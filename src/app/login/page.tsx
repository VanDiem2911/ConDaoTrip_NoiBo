import { redirect } from "next/navigation";
import { BookOpenText, ChartColumn, Route as RouteIcon } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "Đăng nhập" };
export const dynamic = "force-dynamic";

const HERO =
  "https://res.cloudinary.com/dtjrbh8za/image/upload/f_auto,q_auto,w_1920,c_limit/v1788770945/condaotrip/tours/thumbnails/clipsyjdkzq7xgdptdx0.jpg";

const FEATURES = [
  { icon: BookOpenText, title: "Báo giá đa tiền tệ", text: "VND, USD, RMB… cả tour hoặc từng khách, tách riêng từng đoàn." },
  { icon: RouteIcon, title: "Điều hành & nhà cung cấp", text: "Xếp từng dịch vụ, giá vốn đầu vào, công nợ từng nhà cung cấp." },
  { icon: ChartColumn, title: "Doanh thu · hoa hồng · công nợ", text: "Lợi nhuận từng đơn trọn gói và dịch vụ lẻ, nhắc khách còn nợ." },
];

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  return (
    <div className="relative isolate min-h-dvh overflow-hidden bg-brand-950">
      {/* Nền ảnh Côn Đảo, phóng nhẹ rất chậm (tắt khi người dùng chọn giảm chuyển động) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={HERO} alt="" fetchPriority="high" className="login-kenburns absolute inset-0 -z-20 size-full object-cover" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,rgba(10,42,33,0.94)_0%,rgba(15,58,46,0.78)_45%,rgba(15,58,46,0.35)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-1/3 bg-gradient-to-t from-brand-950/80 to-transparent" />

      <div className="mx-auto grid min-h-dvh max-w-[1280px] items-center gap-10 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_480px] lg:gap-16 lg:px-12">
        <section className="text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.svg" alt="ConDaoTrip – Du lịch Côn Đảo" width={230} height={74} className="h-16 w-auto sm:h-[72px]" />

          <p className="mt-8 text-[13px] font-semibold uppercase tracking-[0.22em] text-gold-400 lg:mt-14">Quản lý nội bộ</p>
          <h1 className="mt-3 max-w-xl text-[30px] font-extrabold leading-[1.15] tracking-tight sm:text-4xl lg:text-[44px]">
            Điều hành tour Côn Đảo <span className="text-gold-400">gọn trong một màn hình.</span>
          </h1>

          <ul className="mt-9 hidden max-w-lg space-y-3.5 lg:block">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex items-start gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/10 text-gold-400 ring-1 ring-inset ring-white/20 backdrop-blur">
                  <f.icon className="size-5" strokeWidth={1.8} aria-hidden />
                </span>
                <span>
                  <span className="block text-[15px] font-bold">{f.title}</span>
                  <span className="block text-sm leading-relaxed text-brand-100/80">{f.text}</span>
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-12 hidden max-w-lg grid-cols-3 gap-4 border-t border-white/15 pt-6 lg:grid">
            {[["2006", "Thành lập"], ["20+", "Năm kinh nghiệm"], ["24/7", "Hỗ trợ khách hàng"]].map(([v, l]) => (
              <div key={l}>
                <dd className="text-2xl font-extrabold text-white">{v}</dd>
                <dt className="text-[13px] font-normal text-brand-100/75">{l}</dt>
              </div>
            ))}
          </dl>
        </section>

        <section className="pb-4 lg:pb-0">
          <LoginForm showDemo={process.env.DEMO_LOGIN !== "off"} />
          <p className="mt-5 text-center text-xs text-brand-100/70">© 2026 Công ty TNHH MTV Du lịch Sinh thái và Môi trường Côn Đảo</p>
        </section>
      </div>
    </div>
  );
}
