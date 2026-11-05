import { randomBytes } from "node:crypto";
import { MongoClient, type Collection, type Db, type Document } from "mongodb";

const g = globalThis as unknown as { _mongoClient?: Promise<MongoClient> };

function client(): Promise<MongoClient> {
  if (!g._mongoClient) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("Thiếu biến môi trường MONGODB_URI (xem .env.example)");
    g._mongoClient = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 }).connect();
  }
  return g._mongoClient;
}

export async function getDb(): Promise<Db> {
  return (await client()).db(process.env.MONGODB_DB || "condaotrip_noibo");
}

export async function col<T extends Document>(name: string): Promise<Collection<T>> {
  return (await getDb()).collection<T>(name);
}

export const newId = () => randomBytes(6).toString("hex");

/** Sinh mã tăng dần theo tháng: BG-2611-0007 */
export async function nextCode(prefix: string): Promise<string> {
  const d = new Date();
  const ym = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}`;
  const key = `${prefix}-${ym}`;
  const c = await col<{ _id: string; seq: number }>("counters");
  const r = await c.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" },
  );
  return `${key}-${String(r?.seq ?? 1).padStart(4, "0")}`;
}

/** Chuyển document Mongo -> object phẳng có `id` để gửi xuống client */
export function ser<T extends { _id: string }>(doc: T): Omit<T, "_id"> & { id: string } {
  const { _id, ...rest } = doc;
  return { id: _id, ...rest };
}

export const nowIso = () => new Date().toISOString();
