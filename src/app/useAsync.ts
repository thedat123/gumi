// Hook nạp dữ liệu bất đồng bộ: theo dõi loading/error/data và cho phép nạp lại. Huỷ cập nhật nếu component đã unmount.
//
// Có `cacheKey` → kiểu stale-while-revalidate: quay lại màn đã xem thì HIỆN NGAY dữ liệu cũ (không spinner,
// không nháy trắng), đồng thời nạp mới ngầm; dữ liệu mới GIỐNG HỆT thì không render lại.
// Nhiều màn cùng key gọi cùng lúc (guard + trang) chỉ bắn 1 request.
import { useCallback, useEffect, useRef, useState } from 'react';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  reload: () => void;
}

const cache = new Map<string, { data: unknown; json: string }>();
const inflight = new Map<string, Promise<unknown>>();

function fetchShared<T>(key: string | undefined, fn: () => Promise<T>): Promise<T> {
  if (!key) return fn();
  const running = inflight.get(key);
  if (running) return running as Promise<T>;
  const p = fn().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

/** Nạp sẵn vào cache ở nền (lúc máy rảnh) → lần đầu mở màn cũng hiện ngay, không spinner. */
export function prefetchAsync<T>(key: string, fn: () => Promise<T>): Promise<void> {
  if (cache.has(key)) return Promise.resolve();
  return fetchShared(key, fn).then((d) => {
    let json = '';
    try { json = JSON.stringify(d); } catch { /* bỏ qua */ }
    if (!cache.has(key)) cache.set(key, { data: d, json });
  }).catch(() => { /* chưa đăng nhập / mạng lỗi: màn sẽ tự nạp */ });
}

/** Xoá cache (vd: đăng xuất) để người khác đăng nhập không thấy dữ liệu cũ. */
export function clearAsyncCache() { cache.clear(); inflight.clear(); }

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = [], cacheKey?: string): AsyncState<T> {
  const hit = cacheKey ? cache.get(cacheKey) : undefined;
  const [data, setData] = useState<T | null>(() => (hit ? (hit.data as T) : null));
  const [loading, setLoading] = useState(!hit);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  useEffect(() => {
    // Đã có dữ liệu (cache) → nạp ngầm, KHÔNG bật loading để màn không nháy spinner.
    if (!(cacheKey && cache.has(cacheKey))) setLoading(true);
    setError(null);
    fetchShared(cacheKey, fn)
      .then((d) => {
        let same = false;
        if (cacheKey) {
          let json = '';
          try { json = JSON.stringify(d); } catch { /* không serialize được → coi như khác */ }
          same = json !== '' && cache.get(cacheKey)?.json === json;
          if (!same) cache.set(cacheKey, { data: d, json });
        }
        if (!alive.current) return;
        // Giống hệt → giữ nguyên object cũ (memo/con không render lại); chỉ điền nếu màn chưa có gì.
        setData((cur) => (same && cur !== null ? cur : d));
        setLoading(false);
      })
      // Mạng lỗi nhưng đã có dữ liệu cũ → cứ hiện dữ liệu cũ, không đổi cả màn thành lỗi.
      .catch((e) => { if (alive.current) { if (!(cacheKey && cache.has(cacheKey))) setError(e as Error); setLoading(false); } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick, cacheKey]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, error, reload };
}

/** Gọi ở màn "trung tâm" (Phòng, Bản đồ): lúc máy rảnh nạp sẵn dữ liệu các màn hay mở tiếp theo. */
export function useIdlePrefetch(jobs: Array<[key: string, fn: () => Promise<unknown>]>) {
  useEffect(() => {
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void });
    const run = () => { for (const [k, f] of jobs) void prefetchAsync(k, f); };
    if (ric.requestIdleCallback) { const id = ric.requestIdleCallback(run, { timeout: 3000 }); return () => ric.cancelIdleCallback?.(id); }
    const t = setTimeout(run, 800); return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
