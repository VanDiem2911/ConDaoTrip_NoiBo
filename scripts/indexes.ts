/* Tạo chỉ mục MongoDB:  npm run db:indexes */
import { config } from "dotenv";
config({ path: ".env.local" });

import { getDb } from "../src/lib/db";
import { ensureIndexes } from "../src/lib/indexes";

async function main() {
  const db = await getDb();
  await ensureIndexes(db);
  console.log("✔ Đã tạo/kiểm tra chỉ mục cho users, customers, suppliers, bookings, quotes, transactions");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
