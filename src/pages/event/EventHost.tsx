import { useEffect, useState } from 'react';
import { useSession } from '../../app/session';
import { gameNames } from './data';
import { BoardList, useBoard } from './EventResults';
import { PLAY_URL, useQr } from './qr';
import './event.css';
import './event-results.css';
import './event-host.css';

/** Màn hình máy trạm (tài khoản gamer): QR to cho người chơi quét + bảng xếp hạng 3 game tự cập nhật. */
export function EventHost() {
  const { signOut } = useSession();
  const qr = useQr(PLAY_URL, 900);
  const [full, setFull] = useState(Boolean(document.fullscreenElement));
  useEffect(() => {
    const u = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', u); return () => document.removeEventListener('fullscreenchange', u);
  }, []);
  const toggleFull = () => document.fullscreenElement ? void document.exitFullscreen().catch(() => {}) : void document.documentElement.requestFullscreen?.().catch(() => {});
  return <main className="event-shell event-host">
    <header className="event-header">
      <div className="event-brand"><img className="event-brand-mark" src="/icons/icon-192.png?v=20261014" alt="" aria-hidden="true" draggable={false} decoding="async"/><div><b>MẬT ĐỘ</b><small>THE LESS SUGAR CHALLENGE</small></div></div>
      <div className="event-controls">
        <span className="event-connection" role="status">TRỰC TIẾP</span>
        <button className="event-icon-btn" onClick={toggleFull} aria-label={full ? 'Thoát toàn màn hình' : 'Toàn màn hình'} title="Toàn màn hình">⛶</button>
        <button className="event-signout" onClick={() => void signOut()}>Đăng xuất</button>
      </div>
    </header>
    <div className="event-host-grid">
      <section className="event-host-qr">
        <p className="event-eyebrow">QUÉT ĐỂ CHƠI</p>
        <h1>Mở camera điện thoại<br/><em>quét mã này!</em></h1>
        <div className="event-host-code">{qr ? <img src={qr} alt={`Mã QR mở ${PLAY_URL}`}/> : <span>Đang tạo mã…</span>}</div>
        <p className="event-host-url">{PLAY_URL.replace(/^https?:\/\//, '')}</p>
        <ol className="event-host-steps"><li><b>1</b>Nhập tên của bạn</li><li><b>2</b>Chơi cả 3 game</li><li><b>3</b>Chơi càng nhiều, hạng càng cao!</li></ol>
      </section>
      <section className="event-host-boards">
        <HostBoard game={0} name="Tổng hợp" note="Chơi nhiều game xếp trên, rồi tới tổng điểm" />
        {gameNames.map((name, i) => <HostBoard key={name} game={i + 1} name={name} />)}
      </section>
    </div>
  </main>;
}

function HostBoard({ game, name, note }: { game: number; name: string; note?: string }) {
  const { rows, error } = useBoard(game, 10);
  return <article className={`event-leaderboard event-host-board ${game === 0 ? 'event-host-total' : ''}`}>
    <div className="event-section-heading"><div><p className="event-eyebrow">{game ? `GAME 0${game}` : 'BẢNG CHÍNH'}</p><h2>{name}</h2>{note && <p className="event-host-note">{note}</p>}</div></div>
    {error && <p className="event-note" role="status">{error}</p>}
    <BoardList rows={rows} total={game === 0} compact />
  </article>;
}
