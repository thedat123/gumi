import type { ReactNode } from 'react';
import { messageFor } from '../lib/errors';
import { vi } from '../content/vi';
import type { AsyncState } from '../app/useAsync';
import { Banner } from './Banner';
import { Button } from './Button';
import { Loading } from './Loading';

/** Trạng thái lỗi có nút thử lại. */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="py-8">
      <Banner kind="error" action={onRetry ? <Button variant="secondary" onClick={onRetry}>{vi.common.retry}</Button> : undefined}>
        {messageFor(error)}
      </Banner>
    </div>
  );
}

/** Bọc kết quả useAsync: hiển thị loading / lỗi / rỗng / dữ liệu. */
export function AsyncView<T>({ state, children, empty }: { state: AsyncState<T>; children: (data: T) => ReactNode; empty?: ReactNode }) {
  if (state.loading && state.data == null) return <Loading />;
  if (state.error) return <ErrorState error={state.error} onRetry={state.reload} />;
  if (state.data == null) return <>{empty ?? <Loading />}</>;
  return <>{children(state.data)}</>;
}
