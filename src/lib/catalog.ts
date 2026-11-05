import type { Component, ProductType, Service } from "./types";

/**
 * Danh mục lấy từ https://condaotrip.com.vn (tên, nhóm, thời lượng, mô tả, ảnh, đường dẫn).
 * Giá: dùng giá công bố trên web nếu có; tour/dịch vụ ghi "Liên hệ" được điền GIÁ THAM KHẢO NỘI BỘ
 * (đánh dấu priceNote) để có số tính báo giá — Điều hành/Kế toán có thể chỉnh ở trang Tour du lịch.
 */

const IMG = "https://res.cloudinary.com/dtjrbh8za/image/upload";
export const cloudImg = (tail: string, w = 800) => `${IMG}/f_auto,q_auto,w_${w},c_limit/${tail}`;

const REF = "Giá tham khảo nội bộ (website: Liên hệ)";
const WEB = "Giá công bố trên website";

type TourSeed = {
  slug: string;
  name: string;
  type: ProductType;
  group: string;
  duration: string;
  description: string;
  image: string;
  priceVnd: number;
  priceNote: string;
  components?: Component[];
};

const c = (name: string, category: string, basis: "pax" | "group", qty: number): Component => ({ name, category, basis, qty });

const PKG_2N1D: Component[] = [
  c("Đón / tiễn sân bay – cảng Bến Đầm", "transfer", "group", 2),
  c("Khách sạn Côn Đảo (1 đêm)", "hotel", "pax", 1),
  c("Ăn sáng / trưa / tối theo chương trình", "meal", "pax", 3),
  c("Xe tham quan nội đảo", "transfer", "group", 2),
  c("Hướng dẫn viên địa phương", "guide", "group", 2),
  c("Vé tham quan di tích", "ticket", "pax", 1),
];
const PKG_3N2D: Component[] = [
  c("Đón / tiễn sân bay – cảng Bến Đầm", "transfer", "group", 2),
  c("Khách sạn Côn Đảo (2 đêm)", "hotel", "pax", 2),
  c("Ăn sáng / trưa / tối theo chương trình", "meal", "pax", 6),
  c("Xe tham quan nội đảo", "transfer", "group", 3),
  c("Cano cao tốc Hòn Bảy Cạnh – Hòn Cau", "boat", "group", 1),
  c("Kính lặn, ống thở, áo phao", "gear", "pax", 1),
  c("Hướng dẫn viên địa phương", "guide", "group", 3),
  c("Vé tham quan di tích", "ticket", "pax", 1),
];
const PKG_4N3D: Component[] = [
  c("Đón / tiễn sân bay – cảng Bến Đầm", "transfer", "group", 2),
  c("Khách sạn Côn Đảo (3 đêm)", "hotel", "pax", 3),
  c("Ăn sáng / trưa / tối theo chương trình", "meal", "pax", 9),
  c("Xe tham quan nội đảo", "transfer", "group", 4),
  c("Cano cao tốc – snorkeling", "boat", "group", 1),
  c("Kính lặn, ống thở, áo phao", "gear", "pax", 1),
  c("Hướng dẫn viên địa phương", "guide", "group", 4),
  c("Vé tham quan di tích", "ticket", "pax", 1),
];

export const TOUR_SEEDS: TourSeed[] = [
  {
    slug: "tour-tron-goi-3n2d-kham-pha-con-dao",
    name: "Tour trọn gói 3N2Đ – Khám phá Côn Đảo",
    type: "package",
    group: "Tour Côn Đảo Trọn Gói 2–4 Ngày",
    duration: "3 ngày 2 đêm",
    description:
      "Hành trình trọn vẹn kết hợp lịch sử, tâm linh, thiên nhiên và biển đảo. Tắm biển, snorkeling ngắm san hô và cá trong hành trình 2 đảo. Phương tiện: xe du lịch + cano cao tốc.",
    image: "v1788769864/condaotrip/tours/thumbnails/piyvnkvrlaogghtopncm.jpg",
    priceVnd: 5200000,
    priceNote: REF,
    components: PKG_3N2D,
  },
  {
    slug: "tour-tron-goi-4n3d-binh-yen-con-dao",
    name: "Tour trọn gói 4N3Đ – Bình yên Côn Đảo",
    type: "package",
    group: "Tour Côn Đảo Trọn Gói 2–4 Ngày",
    duration: "4 ngày 3 đêm",
    description:
      "Hành trình trọn vẹn và thư thả, kết hợp lịch sử, tâm linh, cảnh đẹp thiên nhiên, biển đảo và snorkeling. Có thêm thời gian nghỉ ngơi, không phải di chuyển quá dày.",
    image: "v1788770945/condaotrip/tours/thumbnails/clipsyjdkzq7xgdptdx0.jpg",
    priceVnd: 7400000,
    priceNote: REF,
    components: PKG_4N3D,
  },
  {
    slug: "tour-tron-goi-2n1d-binh-yen-con-dao",
    name: "Tour trọn gói 2N1Đ – Bình yên Côn Đảo",
    type: "package",
    group: "Tour Côn Đảo Trọn Gói 2–4 Ngày",
    duration: "2 ngày 1 đêm",
    description:
      "Lịch trình gọn gàng và trọn vẹn, không tham gia tour biển, tập trung khám phá lịch sử, văn hóa, tâm linh và những cảnh đẹp đặc trưng của Côn Đảo.",
    image: "v1788768470/condaotrip/tours/thumbnails/pjn2jcrudvvnyrfirixz.jpg",
    priceVnd: 3100000,
    priceNote: REF,
    components: PKG_2N1D,
  },
  {
    slug: "tour-solo-traveler-3n2d-kham-pha-con-dao",
    name: "Tour Solo Traveler 3N2Đ – Khám phá Côn Đảo",
    type: "package",
    group: "Tour Solo Khám Phá Côn Đảo",
    duration: "3 ngày 2 đêm",
    description:
      "Hành trình 3 ngày 2 đêm dành riêng cho Solo Traveler – khám phá lịch sử, tâm linh, thiên nhiên và biển đảo, snorkeling. Linh hoạt, riêng tư và không cần ghép đoàn.",
    image: "v1788766422/condaotrip/tours/thumbnails/uwvjhmnaggb3hyfal5u3.jpg",
    priceVnd: 6200000,
    priceNote: REF,
    components: PKG_3N2D,
  },
  {
    slug: "tour-solo-traveler-2n1d-kham-pha-con-dao",
    name: "Tour Solo Traveler 2N1Đ – Khám phá Côn Đảo",
    type: "package",
    group: "Tour Solo Khám Phá Côn Đảo",
    duration: "2 ngày 1 đêm",
    description:
      "Một hành trình nhỏ dành riêng cho Solo Traveler – linh hoạt, riêng tư và không cần ghép đoàn. Khám phá Côn Đảo theo nhịp điệu của riêng bạn.",
    image: "v1788768130/condaotrip/tours/thumbnails/unzqvbpacf6pyfrasfps.jpg",
    priceVnd: 3700000,
    priceNote: REF,
    components: PKG_2N1D,
  },
  {
    slug: "hon-bay-canh-boi-ngam-san-ho",
    name: "Hòn Bảy Cạnh – Bơi ngắm san hô",
    type: "day",
    group: "Tour Snorkeling Côn Đảo",
    duration: "3 giờ",
    description:
      "Khởi hành 08:30 hằng ngày. Cano cao tốc đến Hòn Bảy Cạnh, bơi ngắm san hô, tham quan khu bảo tồn rùa biển, rừng ngập mặn. Gồm HDV, vé tham quan, bảo hiểm, kính lặn – ống thở – áo phao, nước và trái cây. Nhóm lớn (tối đa 18 khách) 900.000đ; nhóm nhỏ (tối đa 8 khách) 1.250.000đ.",
    image: "v1785385082/condaotrip/tours/thumbnails/airu6wxwcp6suwihrbge.jpg",
    priceVnd: 900000,
    priceNote: WEB,
  },
  {
    slug: "tour-tha-rua-con-and-lan-ngam-san-ho",
    name: "Tour thả rùa con & lặn ngắm san hô",
    type: "day",
    group: "Tour Xem Rùa Biển & Thả Rùa Con",
    duration: "3 giờ",
    description: "Trải nghiệm thả rùa con về biển, ngắm bình minh và lặn ngắm san hô tuyệt đẹp tại Côn Đảo.",
    image: "v1782724146/condaotrip/tours/thumbnails/p4qz1ocxss8cmycprxvg.jpg",
    priceVnd: 900000,
    priceNote: WEB,
  },
  {
    slug: "tour-an-trua-hon-bay-canh-snorkeling-ngam-san-ho",
    name: "Tour ăn trưa Hòn Bảy Cạnh – Snorkeling ngắm san hô",
    type: "day",
    group: "Tour Snorkeling Côn Đảo",
    duration: "3 giờ",
    description:
      "Khám phá Hòn Bảy Cạnh hoang sơ, snorkeling ngắm san hô và cá, đi bộ xuyên rừng ngập mặn và thưởng thức bữa trưa giữa thiên nhiên trong lành.",
    image: "v1788754678/condaotrip/tours/thumbnails/jlb886pcersbdgkb30s7.jpg",
    priceVnd: 1250000,
    priceNote: REF,
  },
  {
    slug: "tour-xem-rua-de-trung-and-tha-rua-con-hon-bay-canh",
    name: "Tour xem rùa đẻ trứng & thả rùa con Hòn Bảy Cạnh",
    type: "day",
    group: "Tour Xem Rùa Biển & Thả Rùa Con",
    duration: "16 giờ",
    description: "Xem rùa mẹ đẻ trứng – Thả rùa con về biển – Lặn ngắm san hô – Nghỉ đêm tại Trạm Kiểm lâm.",
    image: "v1780998939/condaotrip/flower/wrgod5uydjdib380aixc.jpg",
    priceVnd: 2600000,
    priceNote: REF,
  },
  {
    slug: "tour-xem-rua-de-trung-and-trekking-ngon-hai-dang-hon-bay-canh",
    name: "Tour xem rùa đẻ trứng & trekking Ngọn Hải Đăng Hòn Bảy Cạnh",
    type: "day",
    group: "Tour Xem Rùa Biển & Thả Rùa Con",
    duration: "16 giờ",
    description: "Tour riêng – Trekking Ngọn Hải Đăng – Xem rùa đẻ trứng – Lặn ngắm san hô – Nghỉ đêm trên đảo.",
    image: "v1782465796/condaotrip/tours/thumbnails/n2ybdzbfzqduirtb6ht5.jpg",
    priceVnd: 2900000,
    priceNote: REF,
  },
  {
    slug: "tour-xe-may-tham-quan-quanh-dao-con-dao",
    name: "Tour xe máy tham quan quanh đảo Côn Đảo",
    type: "day",
    group: "Tour Xe Máy & Xe Đạp",
    duration: "5 giờ",
    description:
      "Trải nghiệm Côn Đảo tự do trên những cung đường ven biển: trung tâm, Bắc đảo, Nam đảo và cung đường Tây Bắc, dừng chân tại những điểm đẹp để chụp ảnh, ngắm biển.",
    image: "v1788770661/condaotrip/tours/thumbnails/v6hbwl35ibzxtkkcvlit.jpg",
    priceVnd: 450000,
    priceNote: REF,
  },
  {
    slug: "tour-xe-dap-kham-pha-di-tich-lich-su-con-dao",
    name: "Tour xe đạp khám phá di tích lịch sử Côn Đảo",
    type: "day",
    group: "Tour Xe Máy & Xe Đạp",
    duration: "3 giờ 30 phút",
    description:
      "Đạp xe qua những dấu tích lịch sử của Côn Đảo, tìm hiểu lịch sử nhà tù và đời sống Côn Đảo qua nhiều giai đoạn, kết hợp tham quan di tích và ngắm cảnh.",
    image: "v1788765649/condaotrip/tours/thumbnails/wt35tgknzrjhcxfsroeg.jpg",
    priceVnd: 380000,
    priceNote: REF,
  },
  {
    slug: "tour-xe-dap-con-dao",
    name: "Tour xe đạp Côn Đảo",
    type: "day",
    group: "Tour Xe Máy & Xe Đạp",
    duration: "3 giờ 30 phút",
    description:
      "Khám phá vẻ đẹp bình yên của thị trấn Côn Đảo bằng xe đạp – hành trình nhẹ nhàng, gần gũi, phù hợp du khách muốn chậm lại để cảm nhận đảo.",
    image: "v1788755868/condaotrip/tours/thumbnails/r81qezwprstcydadongk.jpg",
    priceVnd: 320000,
    priceNote: REF,
  },
  {
    slug: "tour-vieng-nghia-trang-hang-duong",
    name: "Tour viếng Nghĩa trang Hàng Dương",
    type: "day",
    group: "Tour Tâm Linh & Di Tích",
    duration: "1 – 1,5 giờ",
    description:
      "Viếng Nghĩa trang Hàng Dương, dâng hoa và tưởng niệm các Anh hùng, Liệt sĩ đã hy sinh tại Côn Đảo.",
    image: "v1788769064/condaotrip/tours/thumbnails/m9y518n5iq3iztzxt4ss.jpg",
    priceVnd: 250000,
    priceNote: REF,
  },
  {
    slug: "tour-tam-linh-quanh-dao-con-dao",
    name: "Tour tâm linh quanh đảo Côn Đảo",
    type: "day",
    group: "Tour Tâm Linh & Di Tích",
    duration: "3 giờ",
    description:
      "Khám phá những điểm tâm linh tiêu biểu quanh đảo, tìm hiểu các câu chuyện lịch sử, tín ngưỡng dân gian và cảm nhận không gian thanh tịnh của Côn Đảo.",
    image: "v1788768816/condaotrip/tours/thumbnails/ptwkmgrud5vvugn57jxn.jpg",
    priceVnd: 480000,
    priceNote: REF,
  },
  {
    slug: "tour-tam-linh-con-dao",
    name: "Tour tâm linh Côn Đảo",
    type: "day",
    group: "Tour Tâm Linh & Di Tích",
    duration: "3 giờ",
    description:
      "Đến những địa danh tâm linh nổi tiếng, tìm hiểu lịch sử, tưởng niệm và cảm nhận không gian thanh tịnh của Côn Đảo.",
    image: "v1788767674/condaotrip/tours/thumbnails/m6wsulmvm2vuu0mgrgt7.jpg",
    priceVnd: 450000,
    priceNote: REF,
  },
];

type ServiceSeed = Omit<Service, "_id" | "active">;

export const SERVICE_SEEDS: ServiceSeed[] = [
  { slug: "ve-may-bay-di-con-dao", name: "Vé máy bay đi Côn Đảo", category: "flight", unit: "vé", basis: "pax", priceVnd: 2300000, description: "Tư vấn và đặt vé máy bay đi/về Côn Đảo tối ưu theo giờ bay và ngân sách." },
  { slug: "tau-vung-tau-con-dao-vung-tau", name: "Vé tàu cao tốc Vũng Tàu – Côn Đảo – Vũng Tàu", category: "ferry", unit: "vé", basis: "pax", priceVnd: 790000, description: "Tàu cao tốc 1017 ghế (265 ghế VIP), khoảng 4 tiếng, khởi hành từ Cảng Cầu Đá. Giá từ 790.000đ." },
  { slug: "dat-phong-khach-san-and-resort", name: "Đặt phòng khách sạn & resort (2–5 sao)", category: "hotel", unit: "phòng/đêm", basis: "group", priceVnd: 1300000, description: "Đặt phòng khách sạn, resort từ 2 sao đến 5 sao tại Côn Đảo với chính sách giá ưu đãi." },
  { slug: "the-secret", name: "Khách sạn The Secret (4 sao, hồ bơi ngoài trời)", category: "hotel", unit: "phòng/đêm", basis: "group", priceVnd: 1600000, description: "Phòng theo đêm – giá tham khảo." },
  { slug: "tan-son-nhat-con-dao-resort", name: "Tân Sơn Nhất Côn Đảo Resort (3 sao)", category: "hotel", unit: "phòng/đêm", basis: "group", priceVnd: 950000, description: "Phòng theo đêm – giá tham khảo." },
  { slug: "poulo-condo-boutique-resort", name: "Poulo Condo Boutique Resort (4 sao)", category: "hotel", unit: "phòng/đêm", basis: "group", priceVnd: 1850000, description: "Cách sân bay Côn Sơn 1 km – phòng theo đêm, giá tham khảo." },
  { slug: "khach-san-maya-3", name: "Khách sạn Maya 3 (4 sao)", category: "hotel", unit: "phòng/đêm", basis: "group", priceVnd: 1450000, description: "Cách bãi biển Lò Vôi chưa đến 1 km – giá tham khảo." },
  { slug: "marina-bay-con-dao-hotel", name: "Marina Bay Côn Đảo Hotel (4 sao)", category: "hotel", unit: "phòng/đêm", basis: "group", priceVnd: 1650000, description: "Phòng theo đêm – giá tham khảo." },
  { slug: "don-tien-san-bay-and-cang-con-dao", name: "Đón tiễn sân bay Cỏ Ống & cảng Bến Đầm", category: "transfer", unit: "lượt", basis: "group", priceVnd: 280000, description: "Xe riêng đời mới 4–16 chỗ, đón tiễn đúng giờ." },
  { slug: "thue-xe-may-or-thue-xe-dien-or-thue-xe-dap", name: "Thuê xe máy / xe điện / xe đạp", category: "rental", unit: "xe/ngày", basis: "group", priceVnd: 150000, description: "Xe máy tự lái đời mới giao tận nơi, xe điện tham quan hoặc xe đạp theo giờ." },
  { slug: "cho-thue-xe-du-lich-7-29-cho-tai-con-dao", name: "Thuê xe du lịch 7 – 29 chỗ", category: "transfer", unit: "ngày", basis: "group", priceVnd: 1900000, description: "Xe 7, 16, 29 chỗ phục vụ trọn gói tham quan, tài xế bản địa." },
  { slug: "thue-cano-and-tau-con-dao", name: "Thuê cano & tàu Côn Đảo", category: "boat", unit: "chuyến", basis: "group", priceVnd: 6500000, description: "Cano và speedboat cao tốc tham quan các đảo nhỏ, lặn ngắm san hô Hòn Cau, Hòn Bảy Cạnh." },
  { slug: "thue-tau-cau-ca-and-ghe-cau", name: "Thuê tàu câu cá & ghe câu", category: "fishing", unit: "chuyến", basis: "group", priceVnd: 4800000, description: "Tàu câu cá, ghe câu truyền thống theo buổi hoặc trọn gói câu cá giải trí." },
  { slug: "cho-thue-dung-cu-snorkeling-con-dao", name: "Thuê dụng cụ snorkeling", category: "gear", unit: "bộ", basis: "pax", priceVnd: 80000, description: "Bộ kính lặn, ống thở chất lượng cao phục vụ ngắm san hô." },
  { slug: "thue-dung-cu-cau-ca-con-dao", name: "Thuê dụng cụ câu cá", category: "gear", unit: "bộ", basis: "group", priceVnd: 150000, description: "Cần câu máy, cần câu tay kèm mồi câu cho trải nghiệm câu cá ven bờ." },
  { slug: "do-boi-and-phu-kien-bien-con-dao", name: "Đồ bơi & phụ kiện biển", category: "gear", unit: "bộ", basis: "pax", priceVnd: 220000, description: "Đồ bơi nam nữ và phụ kiện biển: kính bơi, ống thở, túi chống nước." },
  { slug: "thue-huong-dan-vien-con-dao", name: "Thuê hướng dẫn viên (Việt · Anh · Đức)", category: "guide", unit: "ngày", basis: "group", priceVnd: 900000, description: "Hướng dẫn viên bản địa am hiểu văn hóa lịch sử, thông thạo tiếng Việt, Anh, Đức." },
  { slug: "cho-thue-khong-gian-to-chuc-tiec-con-dao", name: "Thuê không gian tổ chức tiệc", category: "event", unit: "buổi", basis: "group", priceVnd: 3500000, description: "Không gian lãng mạn tổ chức tiệc kỷ niệm, sinh nhật ngoài bãi biển." },
  { slug: "cooking-class-con-dao-trai-nghiem-am-thuc-viet-nam", name: "Cooking Class – Trải nghiệm ẩm thực Việt Nam", category: "meal", unit: "khách", basis: "pax", priceVnd: 650000, description: "Lớp học nấu ăn truyền thống thú vị và ý nghĩa tại Côn Đảo." },
  { slug: "team-building-and-gala-dinner-con-dao", name: "Team building & Gala dinner", category: "event", unit: "khách", basis: "pax", priceVnd: 480000, description: "Trọn gói trò chơi team building bãi biển và đêm gala dinner ấm cúng." },
  { slug: "chup-anh-du-lich-con-dao", name: "Chụp ảnh du lịch & flycam", category: "photo", unit: "buổi", basis: "group", priceVnd: 1600000, description: "Chụp ảnh ngoại cảnh và quay phim flycam lưu giữ khoảnh khắc đẹp tại Côn Đảo." },
];
