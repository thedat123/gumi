import { useEffect, useState } from 'react';
import { fetchBoard, watch, type BoardRow } from './store';
import { gameNames } from './data';
import './event-results.css';

/** Tab bảng xếp hạng: 0 = Tổng hợp, 1–3 = từng game. */
export const boardTabs = ['Tổng hợp', ...gameNames];

/** Bảng xếp hạng 1 tab, tự làm mới mỗi 10 giây; mất mạng thì giữ bản đã tải. */
export function useBoard(game: number, limit = 200) {
  const [rows, setRows] = useState<BoardRow[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true, busy = false;
    setRows(null);
    const refresh = async () => {
      if (busy || !alive) return;
      busy = true;
      try { const r = await fetchBoard(game, limit); if (alive) { setRows(r); setError(''); } }
      catch { if (alive) { setRows(r => r ?? []); setError('Mất kết nối — bảng sẽ tự cập nhật khi có mạng lại.'); } }
      finally { busy = false; }
    };
    void refresh();
    const stop = watch(() => void refresh());
    return () => { alive = false; stop(); };
  }, [game, limit]);
  return { rows, error };
}

export function BoardList({ rows, total, compact }: { rows: BoardRow[] | null; total: boolean; compact?: boolean }) {
  return <ol className="event-board">
    {rows === null && <li className="event-board-empty">Đang tải…</li>}
    {rows?.length === 0 && <li className="event-board-empty"><span aria-hidden="true">✦</span>{compact ? 'Chưa có ai — quét mã để mở màn!' : 'Chưa có ai ở bảng này. Bạn là người đầu tiên?'}</li>}
    {rows?.map(r => <li key={r.id} className={`${r.rank <= 3 ? `top top-${r.rank}` : ''} ${r.me && !compact ? 'mine' : ''}`}>
      <span className={`event-rank rank-${r.rank}`}>{String(r.rank).padStart(2, '0')}</span>
      <span className="event-board-name">{r.player}{r.me && !compact && <small className="event-you">BẠN</small>}{r.pending && <small className="event-pending-label">ĐANG GỬI</small>}
        {total && <small className="event-board-games">{r.games}/3 game</small>}</span>
      <b>{r.score}</b>
    </li>)}
  </ol>;
}

/** Bảng xếp hạng trên điện thoại: 4 tab (Tổng hợp + 3 game), tô sáng dòng của chính mình. */
export function EventResults({ initialGame = 0 }: { initialGame?: number }) {
  const [game, setGame] = useState(initialGame);
  useEffect(() => setGame(initialGame), [initialGame]);
  const { rows, error } = useBoard(game);
  return <section className="event-leaderboard">
    <div className="event-section-heading"><div><p className="event-eyebrow">HALL OF FAME</p><h2>Bảng xếp hạng{rows ? ` · ${rows.length} người` : ''}</h2></div><span className="event-live">TRỰC TIẾP</span></div>
    <div className="event-board-tabs" role="tablist" aria-label="Chọn bảng xếp hạng">
      {boardTabs.map((name, i) => <button key={name} role="tab" aria-selected={game === i} className={game === i ? 'active' : ''} onClick={() => setGame(i)}>{name}</button>)}
    </div>
    {game === 0 && <p className="event-board-rule">Chơi càng nhiều game càng lợi: xếp theo <b>số game đã chơi</b>, rồi tới <b>tổng điểm</b>.</p>}
    {error && <p className="event-note" role="status">{error}</p>}
    <BoardList rows={rows} total={game === 0} />
  </section>;
}
