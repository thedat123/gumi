import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useSession } from '../../app/session';
import { prepareUfoArt } from '../../lib/ufoArt';
import { playSfx } from '../../lib/sfx';
import { FlappyBird } from '../minigames/FlappyBird';
import { cases, gameNames, healthy, pairs, shuffle, sugary } from './data';
import { flushResults, pendingCount, queueResult, type EventResult } from './store';
import { EventResults } from './EventResults';
import gumiArt from '../../assets/gumi.png';
import './event.css';
function useClock(seconds: number, active: boolean, end: () => void) {
  const [left, setLeft] = useState(seconds); const callback = useRef(end); callback.current = end;
  useEffect(() => {
    setLeft(seconds); if (!active) return;
    let finished = false, previous = seconds;
    const deadline = Date.now() + seconds * 1000;
    const timer = window.setInterval(() => { const n = Math.max(0, Math.ceil((deadline-Date.now())/1000)); if (n !== previous) { previous = n; setLeft(n); } if (!n && !finished) { finished = true; clearInterval(timer); callback.current(); } }, 200);
    return () => clearInterval(timer);
  }, [seconds, active]);
  return left;
}
export function EventGame() {
  const { signOut, session } = useSession();
  const owner = session!.userId;
  const [assets, setAssets] = useState<'loading' | 'ready' | 'error'>('loading');
  const [assetAttempt, setAssetAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setAssets('loading');
    void prepareUfoArt().then(() => { if (!cancelled) setAssets('ready'); })
      .catch(() => { if (!cancelled) setAssets('error'); });
    return () => { cancelled = true; };
  }, [assetAttempt]);
  const [team, setTeam] = useState('');
  const [stage, setStage] = useState(-1);
  const [scores, setScores] = useState<number[]>([]);
  const [result, setResult] = useState<EventResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [queued, setQueued] = useState(() => pendingCount(owner));
  const [online, setOnline] = useState(navigator.onLine);
  const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement));
  const pendingKey = `gumi-event-pending:${owner}`;
  const completedStage = useRef(-1);
  const advance = useCallback((score: number) => {
    if (completedStage.current === stage) return;
    completedStage.current = stage;
    setScores(s => [...s, score]); setStage(s => s+1);
  }, [stage]);
  const persist = useCallback((r: EventResult) => {
    setError('');
    try {
      queueResult(r, owner); setSaved(true); sessionStorage.removeItem(pendingKey);
      // Server acknowledgement is never on the path to the next team.
      void flushResults(owner).catch(() => {});
    } catch { setError('Bộ nhớ máy đang đầy hoặc bị khóa. Hãy lưu lại điểm trước khi chuyển đội.'); }
  }, [owner, pendingKey]);
  useEffect(() => {
    const pending = sessionStorage.getItem(pendingKey);
    if (pending) { try { const r: EventResult = JSON.parse(pending); setResult(r); setTeam(r.team); setScores(r.scores); setStage(4); persist(r); } catch { setError('Không đọc được kết quả đang chờ lưu.'); } }
  }, [pendingKey, persist]);
  useEffect(() => {
    if (stage !== 4 || result) return;
    const r = { id: crypto.randomUUID(), team: team.trim(), scores, total: scores.reduce((a,b) => a+b,0) };
    setResult(r);
    try { sessionStorage.setItem(pendingKey, JSON.stringify(r)); } catch { /* durable outbox below is authoritative */ }
    persist(r);
  }, [stage, result, scores, team, persist, pendingKey]);
  useEffect(() => {
    const status = () => { setQueued(pendingCount(owner)); setOnline(navigator.onLine); };
    const reconnect = () => { status(); if (stage < 0 || stage >= 4) void flushResults(owner).catch(() => {}); };
    window.addEventListener('event-results', status); window.addEventListener('storage', status);
    window.addEventListener('online', reconnect); window.addEventListener('offline', status);
    const timer = setInterval(() => { if (!document.hidden && navigator.onLine) reconnect(); }, 30000);
    reconnect();
    return () => { clearInterval(timer); window.removeEventListener('event-results', status); window.removeEventListener('storage', status); window.removeEventListener('online', reconnect); window.removeEventListener('offline', status); };
  }, [owner, stage]);
  useEffect(() => {
    const update = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);
  const fullScreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  };
  const total = scores.reduce((a,b) => a+b, 0);
  const nextTeam = () => { setTeam(''); setScores([]); setResult(null); setSaved(false); completedStage.current = -1; setStage(-1); };
  return <main className="event-shell" data-game-active={stage >= 0 ? 'true' : undefined}>
    <header className="event-header">
      <div className="event-brand"><img className="event-brand-mark" src="/icons/icon-192.png?v=20261014" alt="" aria-hidden="true" draggable={false} decoding="async"/><div><b>MẬT ĐỘ</b><small>THE LESS SUGAR CHALLENGE</small></div></div>
      <nav aria-label="Tiến độ" style={{ '--ev-fill': stage < 0 ? 0 : Math.min(1, (stage + .5) / 5) } as CSSProperties}>{[...gameNames, 'Tổng kết'].map((name,i) => <span key={i} className={stage === i ? 'current' : stage > i ? 'lit' : ''} aria-current={stage === i ? 'step' : undefined}><b>{stage > i ? '✓' : `0${i+1}`}</b><small>{name}</small></span>)}</nav>
      <div className="event-controls">
        <span className={`event-connection ${!online || queued ? 'pending' : ''}`} role="status">{queued ? `${queued} kết quả chờ đồng bộ` : online ? 'SẴN SÀNG' : 'CHƠI NGOẠI TUYẾN'}</span>
        <button className="event-icon-btn" onClick={fullScreen} aria-label={fullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'} title="Toàn màn hình">⛶</button>
        <button className="event-signout" onClick={() => void signOut()}>Đăng xuất</button>
      </div>
    </header>
    <div className="event-content">
      <p className="event-eyebrow">{stage < 0 ? 'TRẠM THỬ THÁCH' : <><span className="event-team-chip">{team}</span>{stage < 4 ? `GAME 0${stage+1}` : 'HOÀN THÀNH CHẶNG'}</>}</p>
      {stage < 0 ? <>
        <div className="event-lobby">
          <div className="event-lobby-copy">
            <span className="event-live">LIVE ARCADE / 2026</span>
            <h1>HẠ MẬT ĐỘ.<br/><em>BẬT NĂNG LƯỢNG.</em></h1>
            <p>Phản xạ nhanh. Ghi nhớ chuẩn. Bóc trần cú lừa.<br/>Sẵn sàng đưa đội bạn lên đỉnh bảng xếp hạng?</p>
            <div className="event-lobby-stats"><span><b>04</b>THỬ THÁCH</span><span><b>01</b>ĐỘI CHƠI</span><span><b>∞</b>NĂNG LƯỢNG</span></div>
          </div>
          <div className="event-entry-wrap">
            <img className="event-gumi" src={gumiArt} alt="" aria-hidden="true" draggable={false} decoding="async"/>
            <form className="event-entry" onSubmit={e => { e.preventDefault(); if (team.trim() && assets === 'ready') setStage(0); }}>
              <span className="event-eyebrow">PLAYER CHECK-IN</span>
              <h2>Đội bạn tên gì?</h2>
              <label htmlFor="event-team">Tên xuất hiện trên bảng xếp hạng</label>
              <input id="event-team" maxLength={60} required autoComplete="off" value={team} onChange={e => setTeam(e.target.value)} placeholder="Nhập tên đội…"/>
              <button className="event-primary" disabled={!team.trim() || assets !== 'ready'} aria-busy={assets === 'loading'}>{assets === 'loading' ? 'Đang chuẩn bị hình ảnh…' : 'Bắt đầu thử thách'} <span aria-hidden="true">↗</span></button>
              {assets === 'error' ? <><small role="alert">Chưa tải được hình ảnh. Kiểm tra kết nối và thử lại.</small><button type="button" className="event-ghost" onClick={() => setAssetAttempt(n => n + 1)}>Tải lại hình ảnh</button></> : <small>Chỉ cần tên đội. Sẵn sàng là chơi.</small>}
            </form>
          </div>
        </div>
        <div className="event-game-roster">{gameNames.map((name,i) => <article key={name}><span>0{i+1}</span><div><b>{name}</b><small>{['30 giây · Kéo & thả', '45 giây · Ghép cặp', '5 hồ sơ · Đúng hay sai', '5 lượt · Bay qua 40 cột'][i]}</small></div><i aria-hidden="true">{['↔','▦','?','↗'][i]}</i></article>)}</div>
        <EventResults pageSizes={[10, 20, 50]} />
      </> : stage === 4 ? <>
        <section className="event-summary">
          <img className="event-summary-gumi" src={gumiArt} alt="" aria-hidden="true" draggable={false} decoding="async"/>
          <div className="event-summary-body">
            <h1>CHẶNG ĐƯỜNG RỰC RỠ!</h1>
            <p className="event-summary-team"><small>ĐỘI</small>{team}</p>
            <h2><b>{total}</b><small>điểm</small></h2>
            <div className="event-scorecards">{scores.map((s,i) => <article key={i}><span>0{i+1}</span><strong>{gameNames[i]}</strong><b>{s}</b>{i===3 && <small>{s>=40 ? 'Hoàn thành' : 'Đã hết 5 lượt'}</small>}</article>)}</div>
            <p role="status" className={`event-save-status ${saved && !queued ? 'ok' : ''}`}>{saved ? queued ? 'Đã lưu tại máy. Tự đồng bộ khi có mạng — đội tiếp theo có thể chơi ngay.' : 'Đã lưu lên bảng xếp hạng!' : 'Kết quả đang chờ lưu.'}</p>
            {error && <p role="alert" className="event-save-status bad">{error}</p>}
            <div className="event-summary-actions">
              {!saved && result && <button className="event-ghost" onClick={() => void persist(result)}>Lưu kết quả</button>}
              <button className="event-primary" disabled={!saved} onClick={nextTeam}>Đội tiếp theo →</button>
            </div>
          </div>
        </section>
        <EventResults pageSizes={[10, 20, 50]} />
      </> : <>
        <div className="event-stage-heading"><h1>{gameNames[stage]}</h1><span className="event-stage-tag">THỬ THÁCH 0{stage+1} / 04</span></div>
        {stage===0 ? <Sort onDone={advance}/> : stage===1 ? <Memory onDone={advance}/> : stage===2 ? <Truth onDone={advance}/> : <FlappyBird event={{ onFinish: advance }}/>}
      </>}
    </div>
  </main>;
}
/** Thanh thời gian còn lại (0–1). */
const TimeBar = ({ left, total }: { left: number; total: number }) =>
  <span className={`event-progress ${left <= 5 ? 'urgent' : ''}`} style={{ '--p': left / total } as CSSProperties} aria-hidden="true"/>;
const BinIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const FridgeIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10a1.5 1.5 0 0 1 1.5 1.5v15A1.5 1.5 0 0 1 17 21H7a1.5 1.5 0 0 1-1.5-1.5v-15A1.5 1.5 0 0 1 7 3ZM5.5 10h13M9 6v1.5M9 13v3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
function Sort({ onDone }: { onDone: (s:number) => void }) {
  const [deck, setDeck] = useState(() => shuffle([...healthy.map(name => ({ name, good:true })), ...sugary.map(name => ({ name, good:false }))]));
  const [score,setScore] = useState(0); const scoreRef=useRef(0); const [feedback,setFeedback]=useState(''); const locked=useRef(false);
  const left=useClock(30,true,() => onDone(scoreRef.current));
  const choose=(good:boolean) => { if (locked.current || left===0) return; locked.current=true; const correct=deck[0].good===good; if(correct) {scoreRef.current+=5;setScore(scoreRef.current);} setFeedback(correct?'correct':'wrong'); playSfx(correct?'sparkle':'sleep'); };
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.repeat) return; if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') { e.preventDefault(); choose(e.code === 'ArrowRight'); } };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  });
  useEffect(() => { if(!feedback) return; const t=setTimeout(() => {setDeck(d => d.length>1 ? d.slice(1) : shuffle([...healthy.map(name=>({name,good:true})),...sugary.map(name=>({name,good:false}))])); setFeedback('');locked.current=false;},250);return()=>clearTimeout(t); },[feedback]);
  return <div className={`event-game event-sort ${feedback}`}><div className="event-hud"><span className={left<=5 ? "event-timer urgent" : "event-timer"}>◷ {left}<small>GIÂY</small></span><b className="event-points">{score}<small>ĐIỂM</small></b></div><TimeBar left={left} total={30}/><p>Kéo thẻ vào đúng nơi hoặc chọn nút bên dưới. Đúng +5 điểm.</p><p className="event-note">Theo công thức trong bộ thẻ: nhóm ít đường không thêm đường; matcha và trà trái cây ở nhóm còn lại là phiên bản pha ngọt.</p><div className="drink-card" draggable onDragStart={e=>e.dataTransfer.setData('text/plain',deck[0].name)}><span className="event-drink-art" aria-hidden="true"><i/><i/><i/></span><small>PHÂN LOẠI ĐỒ UỐNG</small><strong>{deck[0].name}</strong></div><div className="event-answers">{[false,true].map(good=><button key={String(good)} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(e.dataTransfer.getData('text/plain')===deck[0].name)choose(good);}} onClick={()=>choose(good)}><span className="event-bin-icon">{good ? <FridgeIcon/> : <BinIcon/>}</span><span className="event-answer-text"><strong>{good?'Tủ lạnh':'Thùng rác'}</strong><small>{good ? 'ÍT ĐƯỜNG / HEALTHY' : 'NHIỀU ĐƯỜNG'}</small></span><kbd aria-hidden="true">{good ? '→' : '←'}</kbd></button>)}</div><p role="status" className={`event-feedback ${feedback}`}>{feedback==='correct'?'✓ Chính xác! +5':feedback==='wrong'?'✕ Chưa chính xác!':'Dùng phím ← Thùng rác · Tủ lạnh →'}</p></div>;
}
function Memory({onDone}:{onDone:(s:number)=>void}) {
  const [cards]=useState(()=>shuffle(pairs.flatMap((p,id)=>p.map(label=>({id,label}))))); const [preview,setPreview]=useState(true); const [open,setOpen]=useState<number[]>([]);const [matched,setMatched]=useState<number[]>([]);const points=useRef(0);
  useEffect(()=>{const t=setTimeout(()=>setPreview(false),3000);return()=>clearTimeout(t);},[]);
  const left=useClock(45,!preview,()=>onDone(points.current));
  useEffect(()=>{if(open.length!==2)return;const same=cards[open[0]].id===cards[open[1]].id;const t=setTimeout(()=>{ if(same){const next=[...matched,cards[open[0]].id]; points.current=next.length*5;setMatched(next);playSfx('sparkle');if(next.length===5)onDone(25);}setOpen([]);},same?300:800);return()=>clearTimeout(t);},[open,cards,matched,onDone]);
  return <div className="event-game"><div className="event-hud"><span className={preview ? 'event-hud-chip' : left<=5 ? 'event-timer urgent' : 'event-timer'}>{preview?'Ghi nhớ trong 3 giây':<>◷ {left}<small>GIÂY</small></>}</span><b className="event-points">{matched.length*5}<small>ĐIỂM · {matched.length}/5 CẶP</small></b></div><TimeBar left={preview ? 45 : left} total={45}/><p>Ghép đồ uống với lượng đường tương ứng. Đúng một cặp +5 điểm.</p><div className="memory-grid">{cards.map((c,i)=><button key={i} disabled={preview||open.length===2||matched.includes(c.id)||open.includes(i)} className={matched.includes(c.id)?'matched':preview||open.includes(i)?'revealed':''} onClick={()=>setOpen(o=>o.length < 2 && !o.includes(i) ? [...o,i] : o)}>{preview||open.includes(i)||matched.includes(c.id)?<><small>{matched.includes(c.id) ? '✓ ĐÃ TRUY VẾT' : 'MẬT ĐỘ / HỒ SƠ'}</small><strong>{c.label}</strong></>:<><span className="memory-emblem">M↓</span><small>CHẠM ĐỂ LẬT</small></>}</button>)}</div></div>;
}
function Truth({onDone}:{onDone:(s:number)=>void}) {
  const [questions]=useState(()=>shuffle(cases));const [index,setIndex]=useState(0);const [answer,setAnswer]=useState<boolean|null>(null);const score=useRef(0);const locked=useRef(false);
  const choose=(value:boolean|null)=>{if(locked.current)return;locked.current=true;const ok=value===questions[index].fact;if(ok)score.current+=5;setAnswer(ok);playSfx(ok?'sparkle':'sleep');};
  const left=useClock(15,answer===null,()=>choose(null));
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if(answer!==null||e.repeat)return;if(e.code==='ArrowLeft'){e.preventDefault();choose(false);}if(e.code==='ArrowRight'){e.preventDefault();choose(true);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);});
  return <div className="event-game event-truth"><div className="event-hud"><span className="event-hud-chip">HỒ SƠ #{String(index+1).padStart(2,'0')} · {questions[index].title}</span><b className={left<=5 ? "event-timer urgent" : "event-timer"}>◷ {left}<small>GIÂY</small></b></div><TimeBar left={answer===null ? left : 0} total={15}/><blockquote>{questions[index].statement}</blockquote><div className="event-answers"><button disabled={answer!==null} onClick={()=>choose(false)}><span className="event-answer-text"><strong>Cú lừa</strong><small>CAP / FAKE</small></span><kbd aria-hidden="true">←</kbd></button><button disabled={answer!==null} onClick={()=>choose(true)}><span className="event-answer-text"><strong>Sự thật</strong><small>FACT</small></span><kbd aria-hidden="true">→</kbd></button></div>{answer!==null&&<div className={`truth-reveal ${answer ? 'ok' : 'bad'}`} role="status"><h2>{answer?'✓ Chính xác · +5 điểm':'✕ Chưa chính xác / hết giờ'}</h2><b>Đáp án: {questions[index].fact?'SỰ THẬT':'CÚ LỪA'}</b><p>{questions[index].explanation}</p><button className="event-primary" onClick={()=>{if(index===4)onDone(score.current);else{setIndex(i=>i+1);setAnswer(null);locked.current=false;}}}>{index===4?'Qua Flappy Gumi →':'Hồ sơ tiếp theo →'}</button></div>}</div>;
}
