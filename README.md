# ConDaoTrip – Quản lý nội bộ

Next.js 16 (App Router) fullstack + MongoDB. Màu & dữ liệu tour lấy từ condaotrip.com.vn; bố cục theo ảnh mẫu (sidebar xanh rừng + panel kính mờ).

## Chạy
```bash
npm install
cp .env.example .env.local   # điền MONGODB_URI, AUTH_SECRET
npm run seed:reset           # nạp dữ liệu mẫu vào MongoDB (xoá dữ liệu cũ của DB này)
npm run dev                  # http://localhost:3000
```

## Tài khoản demo (mật khẩu `ConDao@2026` — đổi trước khi dùng thật)
| Vai trò | Email |
|---|---|
| Điều hành | dieuhanh@condaotrip.demo |
| Kế toán | ketoan@condaotrip.demo |
| Sale | sale.bao@condaotrip.demo · sale.linh@condaotrip.demo |
| Khách / Đối tác | doitac@condaotrip.demo (hoặc tự đăng ký ở trang đăng nhập) |

## Luồng nghiệp vụ
Báo giá (đa tiền tệ, mỗi đoàn 1 báo giá) → Xác nhận → Booking → Điều hành xếp từng dịch vụ (NCC + giá vốn + thông tin đã xếp) → Thu tiền/Công nợ → Doanh thu, lợi nhuận, hoa hồng.
Đăng nhập nhanh (thẻ vai trò ở trang đăng nhập) bật mặc định; đặt DEMO_LOGIN=off để tắt khi dùng thật.

Hoa hồng = % × lợi nhuận gộp (doanh thu − giá vốn đã xếp), % đặt theo từng sale (Cài đặt).
