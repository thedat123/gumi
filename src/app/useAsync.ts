// Hook nạp dữ liệu bất đồng bộ: theo dõi loading/error/data và cho phép nạp lại. Huỷ cập nhật nếu component đã unmount.
import { useCallback, useEffect, useRef, useState } from 'react';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  reload: () => void;
}

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fn()
      .then((d) => { if (alive.current) { setData(d); setLoading(false); } })
      .catch((e) => { if (alive.current) { setError(e as Error); setLoading(false); } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, error, reload };
}
