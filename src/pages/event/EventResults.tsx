import { useEffect, useState } from 'react';
import { fetchBoard, watch, type BoardPage } from './store';
import { gameNames } from './data';
import './event-results.css';

/** 1 trang bảng xếp hạng chung (phân trang phía máy chủ), tự làm mới định kỳ; mất mạng thì giữ bản đã tải. */
export function useBoardPage(offset: number, limit: number, every = 15000) {
  const [data, setData] = useState<BoardPage | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true, busy = false;
    const refresh = async () => {
      if (busy || !alive) return;
      busy = true;
      try { const r = await fetchBoard(offset, limit); if (alive) { setData(r); setError(''); } }
      catch { if (alive) { setData(d => d ?? { rows: [], total: 0, mine: null }); setError('Mất kết nối — bảng sẽ tự cập nhật khi có mạng lại.'); } }
      finally { busy = false; }
    };
    void refresh();
    const stop = watch(() => void refresh(), every);
    return () => { alive = false; stop(); };
  }, [offset, limit, every]);
  return { data, error };
}

export const GameTag = ({ game }: { game: number }) =>
  <small className={`event-game-tag g${game}`}>{gameNames[game - 1]}</small>;

const PAGE = 10;

/** Bảng xếp hạng chung trên điện thoại: 10 người/trang, ghim hạng của chính mình, nút tới trang của mình. */
export function EventResults() {
  const [page, setPage] = useState(0);
  const { data, error } = useBoardPage(page * PAGE, PAGE, 30000);
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const mine = data?.mine;
  const minePage = mine && mine.rank > 0 ? Math.floor((mine.rank - 1) / PAGE) : null;
  useEffect(() => { if (page > pages - 1) setPage(pages - 1); }, [page, pages]);
  return <section className="event-leaderboard">
    <div className="event-section-heading"><div><p className="event-eyebrow">Cùng tỏa sáng</p><h2>Bảng xếp hạng{data ? ` · ${total} người` : ''}</h2></div><span className="event-live">Tự cập nhật</span></div>
    {mine && <p className="event-my-rank"><span>{mine.pending ? 'Điểm của bạn đang được gửi…' : <>Bạn đang hạng <b>{mine.rank}</b> / {total}</>}</span>
      {minePage !== null && minePage !== page && <button onClick={() => setPage(minePage)}>Xem vị trí của bạn</button>}</p>}
    {error && <p className="event-note" role="status">{error}</p>}
    <ol className="event-board">
      {data === null && <li className="event-board-empty">Đang tải…</li>}
      {data?.rows.length === 0 && <li className="event-board-empty"><span aria-hidden="true">✦</span>Chưa có ai chơi. Bạn là người đầu tiên?</li>}
      {data?.rows.map(r => <li key={r.id} className={`${r.rank <= 3 ? `top top-${r.rank}` : ''} ${r.me ? 'mine' : ''}`}>
        <span className={`event-rank rank-${r.rank}`}>{String(r.rank).padStart(2, '0')}</span>
        <span className="event-board-name">{r.player}{r.me && <small className="event-you">Bạn</small>}<GameTag game={r.game} /></span>
        <b>{r.score}</b>
      </li>)}
    </ol>
    {pages > 1 && <nav className="event-pager" aria-label="Phân trang bảng xếp hạng">
      <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>← Trước</button>
      <span>Trang <b>{page + 1}</b> / {pages}</span>
      <button onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1}>Sau →</button>
    </nav>}
  </section>;
}
