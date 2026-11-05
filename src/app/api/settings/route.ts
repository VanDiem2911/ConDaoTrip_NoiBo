import { apiUser, body, num, route } from "@/lib/api";
import { BACKOFFICE } from "@/lib/access";
import { col } from "@/lib/db";
import { getSettings } from "@/lib/data";
import type { Settings } from "@/lib/types";

/** Tỷ giá (VND cho 1 đơn vị ngoại tệ), % hoa hồng mặc định, tỷ lệ giá trẻ em */
export const PUT = route(async (req) => {
  await apiUser(BACKOFFICE);
  const b = await body<{ rates?: Record<string, unknown>; defaultCommissionRate?: unknown; childRatio?: unknown }>(req);
  const cur = await getSettings();
  const rates = { ...cur.rates };
  for (const [k, v] of Object.entries(b.rates ?? {})) {
    const n = num(v);
    if (n > 0 && /^[A-Z]{3}$/.test(k) && k !== "VND") rates[k] = n;
  }
  const next: Partial<Settings> = {
    rates,
    defaultCommissionRate: Math.min(100, Math.max(0, num(b.defaultCommissionRate, cur.defaultCommissionRate))),
    childRatio: Math.min(1, Math.max(0, num(b.childRatio, cur.childRatio))),
  };
  await (await col<Settings>("settings")).updateOne({ _id: "main" }, { $set: next }, { upsert: true });
  return { ok: true };
});
