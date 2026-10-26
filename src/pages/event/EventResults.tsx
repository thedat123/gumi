import { useEffect, useState } from 'react';
import { useSession } from '../../app/session';
import { withPending, cachedResults, listResults, watchResults, type EventResult } from './store';
import { gameNames } from './data';
import './event-results.css';
import { Pagination, usePagination } from '../../components/Pagination';
/** Kết quả sự kiện trực tiếp: tải + tự cập nhật khi có đội mới (realtime), mất mạng thì dùng bản đã lưu.
 *  Đội vừa chơi xong mà chưa đồng bộ được hiện kèm cờ `pending`. */
export function useEventResults() {
  const { session } = useSession();
  const owner = session!.userId;
  const [rows, setRows] = useState<(EventResult & { pending?: boolean })[]>(() => withPending(cachedResults(), owner));
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true, busy = false;
    let debounce: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      if (busy || !alive) return;
      busy = true;
      try { const r = await listResults(); if (alive) { setRows(withPending(r, owner)); setError(''); } }
      catch { if (alive) { setRows(withPending(cachedResults(), owner)); setError('Đang hiển thị kết quả đã tải. Sẽ cập nhật khi kết nối trở lại.'); } }
      finally { busy = false; }
    };
    void refresh();
    const stop = watchResults(() => { clearTimeout(debounce); debounce = setTimeout(() => void refresh(), 300); });
    return () => { alive = false; clearTimeout(debounce); stop(); };
  }, [owner]);
  return { rows, error };
}

/** Bảng xếp hạng trong màn sự kiện (nền sáng hồng–vàng). */
export function EventResults({ tone = 'light', pageSizes }: { tone?: 'dark' | 'light'; pageSizes?: readonly number[] } = {}) {
  const { rows, error } = useEventResults();
  const pg = usePagination(rows, 20, null, { sizes: pageSizes, storageKey: pageSizes ? `event-results-${tone}` : undefined });
  return <section className="event-leaderboard"><div className="event-section-heading"><div><p className="event-eyebrow">HALL OF FAME</p><h2>Bảng xếp hạng sự kiện · {rows.length} đội</h2></div><span className="event-live">BẢNG ĐIỂM</span></div>{error && <p className="event-note" role="status">{error}</p>}<div className="event-table-wrap"><table><thead><tr>{['Hạng', 'Tên đội', ...gameNames, 'Tổng'].map(t => <th key={t}>{t}</th>)}</tr></thead><tbody>{pg.slice.map((r,j) => { const i = pg.from - 1 + j; return <tr key={r.id} className={i < 3 ? `top top-${i+1}` : undefined}><td><span className={`event-rank rank-${i+1}`}>{String(i+1).padStart(2,'0')}</span></td><td>{r.team}{r.pending && <small className="event-pending-label">ĐANG ĐỒNG BỘ</small>}</td>{r.scores.map((s,j) => <td key={j}>{s}</td>)}<td><b>{r.total}</b></td></tr>; })}</tbody></table></div><Pagination {...pg} unit="đội" tone={tone} className="event-pagination" />{!rows.length && <div className="event-empty"><span aria-hidden="true">✦</span><p>Sân chơi đang chờ nhà vô địch đầu tiên.</p></div>}</section>;
}
