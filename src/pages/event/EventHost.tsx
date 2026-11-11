import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useSession } from '../../app/session';
import { cases, gameNames, healthy, sugary } from './data';
import { useBoardPage } from './EventResults';
import { PLAY_URL, useQr } from './qr';
import type { BoardRow } from './store';
import gumiArt from '../../assets/gumi-event.webp';
import './event-host.css';

/** Đếm nhịp cho mô phỏng (đứng yên khi tab ẩn hoặc người xem tắt chuyển động). */
function useTicker(ms: number) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = window.setInterval(() => { if (!document.hidden) setN(x => x + 1); }, ms);
    return () => clearInterval(t);
  }, [ms]);
  return n;
}

const clock = (d: Date) => d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });

/** Màn hình máy trạm (tài khoản gamer) để chiếu TV: QR cho người chơi quét, bảng xếp hạng chung, mô phỏng 3 game. */
export function EventHost() {
  const { signOut } = useSession();
  const qr = useQr(PLAY_URL, 900);
  const { data: top } = useBoardPage(0, 3, 60000);
  const total = top?.total ?? null;
  const [updated, setUpdated] = useState<Date | null>(null);
  useEffect(() => { if (top) setUpdated(new Date()); }, [top]);
  const [full, setFull] = useState(Boolean(document.fullscreenElement));
  useEffect(() => {
    const u = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', u); return () => document.removeEventListener('fullscreenchange', u);
  }, []);
  const toggleFull = () => document.fullscreenElement ? void document.exitFullscreen().catch(() => {}) : void document.documentElement.requestFullscreen?.().catch(() => {});

  return <main className="event-host">
    <aside className="eh-side" aria-label="Quét mã để chơi">
      <div className="eh-brand"><img src="/icons/icon-192.png?v=20261014" alt="" aria-hidden="true" draggable={false}/><span>Mật Độ<small>The Less Sugar Challenge</small></span></div>
      <div className="eh-invite"><p className="eh-kicker">Thử thách bớt ngọt</p><h1>Chơi một ván.<br/>Tỏa sáng trên bảng.</h1><p>Quét mã bằng điện thoại để tham gia.</p></div>
      <div className="eh-code">{qr ? <img src={qr} alt={`Mã QR mở ${PLAY_URL}`}/> : <span>Đang tạo mã…</span>}</div>
      <p className="eh-scan-note">Mở camera · Quét mã · Bắt đầu</p><p className="eh-url">{PLAY_URL.replace(/^https?:\/\//, '')}</p>
      <ol className="eh-steps">
        <li><b>1</b><span>Nhập tên của bạn</span></li>
        <li><b>2</b><span>Chọn 1 thử thách</span></li>
        <li><b>3</b><span>Lên bảng xếp hạng</span></li>
      </ol>
      <img className="eh-gumi" src={gumiArt} alt="" aria-hidden="true" draggable={false}/>
    </aside>

    <div className="eh-main">
      <header className="eh-head">
        <div>
          <span className="eh-live-label">Sự kiện đang diễn ra</span><h2>Bảng xếp hạng</h2>
          <p>{total !== null ? `${total} người đã chơi` : 'Đang tải…'}{updated && <> · cập nhật {clock(updated)}</>}</p>
        </div>
        <div className="eh-tools">
          <button onClick={toggleFull}>{full ? 'Thoát toàn màn hình' : 'Toàn màn hình'}</button>
          <button onClick={() => void signOut()}>Đăng xuất</button>
        </div>
      </header>

      <Leaderboard top={top?.rows ?? null} total={total ?? 0}/>

      <section className="eh-games" aria-label="Ba thử thách">
        <div className="eh-games-label"><b>Chọn thế mạnh của bạn</b><span>3 thử thách · 1 lượt chơi · Cùng một bảng xếp hạng</span></div>
        <DemoCard n={1} title={gameNames[0]!} rule="30 giây · Mỗi thẻ đúng +5 điểm"><SortDemo/></DemoCard>
        <DemoCard n={2} title={gameNames[1]!} rule="45 giây · Mỗi cặp đúng +5 điểm"><MemoryDemo/></DemoCard>
        <DemoCard n={3} title={gameNames[2]!} rule="5 câu hỏi · Mỗi câu đúng +5 điểm"><TruthDemo/></DemoCard>
      </section>
    </div>
  </main>;
}

function DemoCard({ n, title, rule, children }: { n: number; title: string; rule: string; children: ReactNode }) {
  return <article className={`eh-game g${n}`}>
    <div className="eh-game-stage" aria-hidden="true">{children}</div>
    <div className="eh-game-copy"><span className="eh-game-skill">{n === 1 ? "Nhanh tay" : n === 2 ? "Tinh mắt" : "Hiểu biết"}</span><b>{title}</b><small>{rule}</small></div>
  </article>;
}

/* ---------- Mô phỏng game 1: thẻ đồ uống trượt vào Tủ lạnh / Thùng rác ---------- */
const SORT_SAMPLES = [healthy[0], sugary[0], healthy[8], sugary[7], healthy[3], sugary[1]].map(name => ({ name: name!, good: healthy.includes(name!) }));
const BinIcon = () => <svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const FridgeIcon = () => <svg viewBox="0 0 24 24"><path d="M7 3h10a1.5 1.5 0 0 1 1.5 1.5v15A1.5 1.5 0 0 1 17 21H7a1.5 1.5 0 0 1-1.5-1.5v-15A1.5 1.5 0 0 1 7 3ZM5.5 10h13M9 6v1.5M9 13v3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
function SortDemo() {
  const n = useTicker(2000);
  const s = SORT_SAMPLES[n % SORT_SAMPLES.length]!;
  return <div className="sd">
    <span className={`sd-zone ${!s.good ? 'hit' : ''}`} key={`b${n}`}><BinIcon/>Thùng rác</span>
    <span className={`sd-card ${s.good ? 'to-right' : 'to-left'}`} key={`c${n}`}>{s.name}</span>
    <span className={`sd-zone ${s.good ? 'hit' : ''}`} key={`f${n}`}><FridgeIcon/>Tủ lạnh</span>
    <b className={`sd-plus ${s.good ? 'r' : 'l'}`} key={`p${n}`}>+5</b>
  </div>;
}

/* ---------- Mô phỏng game 2: lật 2 thẻ → ghép cặp ---------- */
const MEM = [['Trà sữa', '11–12 muỗng'], ['Nước ngọt', '8–9 muỗng'], ['Trà đào 30%', '2–3 muỗng']] as const;
const MEM_CARDS = [MEM[0][0], MEM[1][1], MEM[2][0], MEM[0][1], MEM[2][1], MEM[1][0]];
// Từng nhịp: thẻ đang lật. Cặp mở đủ 2 thẻ ở nhịp trước → đã ghép.
const MEM_STEPS: number[][] = [[], [0], [0, 3], [0, 3], [1], [1, 5], [1, 5], [2], [2, 4], [2, 4], [2, 4], [2, 4]];
function MemoryDemo() {
  const step = useTicker(750) % MEM_STEPS.length;
  const open = MEM_STEPS[step]!;
  const matched = new Set(MEM_STEPS.slice(0, step).filter(s => s.length === 2).flatMap(s => s));
  return <div className="md">{MEM_CARDS.map((label, i) => {
    const up = open.includes(i) || matched.has(i);
    return <span key={i} className={`md-card ${up ? 'up' : ''} ${matched.has(i) ? 'ok' : ''}`}>{up ? label : ''}</span>;
  })}</div>;
}

/* ---------- Mô phỏng game 3: câu hỏi → chọn đáp án → đáp án đúng ---------- */
const SHORT_CASES = cases.map(c => ({ fact: c.fact, q: c.statement.length > 84 ? c.statement.slice(0, c.statement.lastIndexOf(' ', 82)) + '…' : c.statement }));
function TruthDemo() {
  const n = useTicker(3000);
  const c = SHORT_CASES[n % SHORT_CASES.length]!;
  return <div className="td" key={n}>
    <p className="td-q">{c.q}</p>
    <div className="td-btns"><span className={!c.fact ? 'pick' : ''}>Cú lừa</span><span className={c.fact ? 'pick' : ''}>Sự thật</span></div>
  </div>;
}

/* ---------- Bảng xếp hạng chung: top 3 nổi bật + danh sách ---------- */
/** Id các dòng vừa xuất hiện (để tô nhẹ vài giây). */
function useFresh(rows: BoardRow[] | null) {
  const seen = useRef<Set<string> | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!rows) return;
    if (!seen.current) { seen.current = new Set(rows.map(r => r.id)); return; }
    const added = rows.filter(r => !seen.current!.has(r.id)).map(r => r.id);
    rows.forEach(r => seen.current!.add(r.id));
    if (!added.length) return;
    setFresh(new Set(added));
    const t = setTimeout(() => setFresh(new Set()), 6000);
    return () => clearTimeout(t);
  }, [rows]);
  return fresh;
}

const PAGE = 10, FLIP_MS = 60000;
function Leaderboard({ top, total }: { top: BoardRow[] | null; total: number }) {
  const fresh = useFresh(top);
  if (!top) return <section className="eh-board"><p className="eh-empty">Đang tải bảng xếp hạng…</p></section>;
  if (!top.length) return <section className="eh-board eh-board-waiting"><div className="eh-welcome"><span className="eh-trophy" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 5h12v8a6 6 0 0 1-12 0V5ZM10 8H5v3a6 6 0 0 0 6 6M22 8h5v3a6 6 0 0 1-6 6M16 19v7M11 27h10"/></svg></span><p>Bảng xếp hạng đang chờ bạn</p><h3>Vị trí đầu tiên<br/>có thể là của bạn.</h3><span>Quét mã, chọn thử thách và ghi điểm ngay.</span></div><div className="eh-podium" aria-hidden="true">{[2, 1, 3].map(rank => <div key={rank} className={`eh-seat seat-${rank}`}><span>{rank === 1 ? 'Ngôi đầu' : `Top ${rank}`}</span><b>{rank}</b><small>Chờ người chơi</small></div>)}</div></section>;
  return <section className="eh-board" aria-label="Bảng xếp hạng chung">
    <ol className="eh-top3">{top.map(r => <li key={r.id} className={`p${r.rank} ${fresh.has(r.id) ? 'fresh' : ''}`}>
      <span className="eh-pos">{r.rank}</span>
      <span className="eh-who">{r.rank === 1 && <span className="eh-leader-label">Đang dẫn đầu</span>}<b title={r.player}>{r.player}</b><small>{gameNames[r.game - 1]}</small></span>
      <strong>{r.score}<small>điểm</small></strong>
    </li>)}</ol>
    {total > 3 ? <RestBoard total={total}/> : <div className="eh-next-invite"><span>Cuộc đua mới bắt đầu</span><b>Bạn sẽ là người tiếp theo?</b><p>Quét mã bên trái để ghi tên mình lên bảng.</p></div>}
  </section>;
}
function RestBoard({ total }: { total: number }) {
  const pages = Math.max(1, Math.ceil(Math.max(0, total - 3) / PAGE));
  const [page, setPage] = useState(0);
  // Màn chiếu không ai bấm: tự lật trang hạng 4+ mỗi 60 giây.
  useEffect(() => {
    if (pages <= 1 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = window.setInterval(() => { if (!document.hidden) setPage(p => (p + 1) % pages); }, FLIP_MS);
    return () => clearInterval(t);
  }, [pages]);
  useEffect(() => { if (page > pages - 1) setPage(0); }, [page, pages]);
  const { data: rest } = useBoardPage(3 + page * PAGE, PAGE, 60000);
  return <div className="eh-rest-wrap">
      <div className="eh-rest-heading"><span>Những người chơi nổi bật</span><span>Điểm</span></div>

      {rest && rest.rows.length > 0 && <ol className="eh-rest" key={page}>{rest.rows.map(r => <li key={r.id}>
        <span className="eh-pos">{r.rank}</span>
        <span className="eh-who"><b title={r.player}>{r.player}</b><small>{gameNames[r.game - 1]}</small></span>
        <strong>{r.score}</strong>
      </li>)}</ol>}
      {pages > 1 && <nav className="eh-pager" aria-label="Phân trang bảng xếp hạng">
        <button onClick={() => setPage(p => (p - 1 + pages) % pages)} aria-label="Trang trước">‹</button>
        <span>Hạng {4 + page * PAGE}–{Math.min(total, 3 + (page + 1) * PAGE)} · trang {page + 1}/{pages}</span>
        <span className="eh-dots" aria-hidden="true">{Array.from({ length: Math.min(pages, 12) }, (_, i) => <i key={i} className={i === page % 12 ? 'on' : ''}/>)}</span>
        <button onClick={() => setPage(p => (p + 1) % pages)} aria-label="Trang sau">›</button>
      </nav>}
    </div>;
}
