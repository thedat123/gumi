import { useEffect, useState } from 'react';
import { useSession } from '../../app/session';
import { withPending, cachedResults, listResults, watchResults, type EventResult } from './store';
import { gameNames } from './data';
import './event-results.css';
import { Pagination, usePagination } from '../../components/Pagination';
/** `tone`: 'dark' trong màn sự kiện, 'light' trong trang admin (nền sáng). */
export function EventResults({ tone = 'dark' }: { tone?: 'dark' | 'light' } = {}) {
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
  const pg = usePagination(rows, 20);
  return <section className="event-leaderboard"><div className="event-section-heading"><div><p className="event-eyebrow">HALL OF FAME</p><h2>Bảng xếp hạng sự kiện · {rows.length} đội</h2></div><span className="event-live">BẢNG ĐIỂM</span></div>{error && <p className="event-note" role="status">{error}</p>}<div className="event-table-wrap"><table><thead><tr>{['Hạng', 'Tên đội', ...gameNames, 'Tổng'].map(t => <th key={t}>{t}</th>)}</tr></thead><tbody>{pg.slice.map((r,j) => { const i = pg.from - 1 + j; return <tr key={r.id}><td><span className={`event-rank rank-${i+1}`}>{String(i+1).padStart(2,'0')}</span></td><td>{r.team}{r.pending && <small className="event-pending-label">ĐANG ĐỒNG BỘ</small>}</td>{r.scores.map((s,j) => <td key={j}>{s}</td>)}<td><b>{r.total}</b></td></tr>; })}</tbody></table></div><Pagination {...pg} unit="đội" tone={tone} className="event-pagination" />{!rows.length && <div className="event-empty"><span>✦</span><p>Sân chơi đang chờ nhà vô địch đầu tiên.</p></div>}</section>;
}
