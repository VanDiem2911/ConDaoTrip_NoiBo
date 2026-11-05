/**
 * Cache bộ nhớ ngắn hạn (theo từng tiến trình server) cho dữ liệu đọc nhiều, ít đổi:
 * cài đặt/tỷ giá, danh mục tour, thông tin người dùng đang đăng nhập.
 * Gộp cả các yêu cầu đồng thời vào một truy vấn DB duy nhất.
 * Khi dữ liệu đổi trên cùng tiến trình, gọi invalidate() để cập nhật ngay; tiến trình khác chờ hết TTL.
 */
interface Entry<T> { at: number; value?: T; pending?: Promise<T> }

const g = globalThis as unknown as { _memo?: Map<string, Entry<unknown>> };
const store = (g._memo ??= new Map());

export async function memo<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = store.get(key) as Entry<T> | undefined;
  const now = Date.now();
  if (hit) {
    if (hit.pending) return hit.pending;
    if (now - hit.at < ttlMs) return hit.value as T;
  }
  const pending = load().then(
    (value) => { store.set(key, { at: Date.now(), value }); return value; },
    (err) => { store.delete(key); throw err; },
  );
  store.set(key, { at: now, pending });
  return pending;
}

export function invalidate(prefix: string) {
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k);
}
