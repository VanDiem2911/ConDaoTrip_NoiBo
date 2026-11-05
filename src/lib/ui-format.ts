import { todayIso } from "./money";

/** Số ngày từ hôm nay đến ngày đi, dạng chữ: "còn 5 ngày", "hôm nay", "đã đi 3 ngày" */
export function daysLabel(dateIso: string): string {
  const a = new Date(todayIso() + "T00:00:00Z").getTime();
  const b = new Date(dateIso + "T00:00:00Z").getTime();
  const d = Math.round((b - a) / 86400000);
  if (d === 0) return "hôm nay";
  return d > 0 ? `còn ${d} ngày` : `đã đi ${-d} ngày`;
}
