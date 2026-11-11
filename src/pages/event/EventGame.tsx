import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { playSfx } from '../../lib/sfx';
import { cases, gameInfo, gameNames, healthy, pairs, shuffle, sugary } from './data';
import { flush, myPlay, pending, playerKey, resetDevice, savePlay, watch, type EventPlay } from './store';
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
const nameKey = 'gumi-event-name';

/** Sự kiện bản QR: quét mã → nhập tên → chọn 1 trong 3 game → chơi xong lên bảng xếp hạng chung. Mỗi điện thoại 1 lượt.
 *  Ban tổ chức mở `/play?new=1` để xoá lượt đã chơi trên máy (máy dùng chung / thử nghiệm). */
export function EventGame() {
  const [done, setDone] = useState<EventPlay | null>(() => {
    if (new URLSearchParams(location.search).has('new')) { resetDevice(); history.replaceState(null, '', location.pathname); }
    return myPlay();
  });
  const [name, setName] = useState(() => { try { return localStorage.getItem(nameKey) ?? ''; } catch { return ''; } });
  const [step, setStep] = useState<'name' | 'pick' | 'play'>('name');
  const [game, setGame] = useState(1);
  const [waiting, setWaiting] = useState(() => pending().length);
  const [online, setOnline] = useState(navigator.onLine);
  const finished = useRef(false);

  useEffect(() => {
    const status = () => { setWaiting(pending().length); setOnline(navigator.onLine); };
    const off = () => setOnline(false);
    window.addEventListener('offline', off);
    const stop = watch(status);
    void flush().catch(() => {});
    return () => { stop(); window.removeEventListener('offline', off); };
  }, []);

  const finish = useCallback((score: number) => {
    if (finished.current) return;
    finished.current = true;
    const play: EventPlay = { id: crypto.randomUUID(), player_key: playerKey(), player: name.trim(), game, score };
    savePlay(play); setDone(myPlay() ?? play); playSfx('sparkle');
    window.scrollTo({ top: 0 });
  }, [name, game]);
  const start = (g: number) => { finished.current = false; setGame(g); setStep('play'); window.scrollTo({ top: 0 }); };
  const status = waiting ? 'ĐANG GỬI ĐIỂM…' : online ? 'SẴN SÀNG' : 'MẤT MẠNG';

  return <main className="event-shell event-mobile" data-game-active={step === 'play' && !done ? 'true' : undefined}>
    <header className="event-header">
      <div className="event-brand"><img className="event-brand-mark" src="/icons/icon-192.png?v=20261014" alt="" aria-hidden="true" draggable={false} decoding="async"/><div><b>MẬT ĐỘ</b><small>THE LESS SUGAR CHALLENGE</small></div></div>
      <div className="event-controls"><span className={`event-connection ${!online || waiting ? 'pending' : ''}`} role="status">{status}</span></div>
    </header>
    <div className="event-content">
      {done ? <>
        <section className="event-summary">
          <img className="event-summary-gumi" src={gumiArt} alt="" aria-hidden="true" draggable={false} decoding="async"/>
          <div className="event-summary-body">
            <h1>HOÀN THÀNH!</h1>
            <p className="event-summary-team"><small>NGƯỜI CHƠI</small>{done.player}</p>
            <p className="event-eyebrow">{gameNames[done.game - 1]}</p>
            <h2><b>{done.score}</b><small>điểm</small></h2>
            <p role="status" className={`event-save-status ${waiting ? '' : 'ok'}`}>
              {waiting ? 'Đã lưu trên máy — điểm sẽ tự gửi lên khi có mạng.' : 'Đã lên bảng xếp hạng! Nhìn lên màn hình lớn nhé 👀'}
            </p>
          </div>
        </section>
        <EventResults />
      </> : step === 'play' ? <>
        <p className="event-eyebrow"><span className="event-team-chip">{name.trim()}</span>THỬ THÁCH 0{game}</p>
        <div className="event-stage-heading"><h1>{gameNames[game - 1]}</h1></div>
        {game === 1 ? <Sort onDone={finish}/> : game === 2 ? <Memory onDone={finish}/> : <Truth onDone={finish}/>}
      </> : step === 'pick' ? <>
        <p className="event-eyebrow"><span className="event-team-chip">{name.trim()}</span>CHỌN THỬ THÁCH</p>
        <div className="event-stage-heading"><h1>Chọn 1 game</h1><button className="event-ghost event-back" onClick={() => setStep('name')}>← Đổi tên</button></div>
        <div className="event-game-roster event-game-pick">{gameNames.map((g, i) => <button key={g} onClick={() => start(i + 1)}><span>0{i+1}</span><div><b>{g}</b><small>{gameInfo[i]!.hint}</small></div><i aria-hidden="true">{gameInfo[i]!.icon}</i></button>)}</div>
        <p className="event-note">Mỗi người chơi 1 game — chơi xong điểm lên bảng xếp hạng chung ngay.</p>
      </> : <>
        <div className="event-lobby">
          <div className="event-lobby-copy">
            <span className="event-live">LIVE ARCADE / 2026</span>
            <h1>HẠ MẬT ĐỘ.<br/><em>BẬT NĂNG LƯỢNG.</em></h1>
            <p>Chọn 1 trong 3 thử thách, ghi điểm thật cao và leo lên đỉnh bảng xếp hạng!</p>
          </div>
          <div className="event-entry-wrap">
            <img className="event-gumi" src={gumiArt} alt="" aria-hidden="true" draggable={false} decoding="async"/>
            <form className="event-entry" onSubmit={e => { e.preventDefault(); const n = name.trim(); if (!n) return; try { localStorage.setItem(nameKey, n); } catch { /* ignore */ } setStep('pick'); }}>
              <span className="event-eyebrow">PLAYER CHECK-IN</span>
              <h2>Bạn tên gì?</h2>
              <label htmlFor="event-name">Tên xuất hiện trên bảng xếp hạng</label>
              <input id="event-name" maxLength={40} required autoComplete="nickname" enterKeyHint="go" value={name} onChange={e => setName(e.target.value)} placeholder="Nhập tên của bạn…"/>
              <button className="event-primary" disabled={!name.trim()}>Tiếp tục <span aria-hidden="true">→</span></button>
              <small>Mỗi điện thoại được chơi 1 lượt.</small>
            </form>
          </div>
        </div>
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
  return <div className={`event-game event-sort ${feedback}`}><div className="event-hud"><span className={left<=5 ? "event-timer urgent" : "event-timer"}>◷ {left}<small>GIÂY</small></span><b className="event-points">{score}<small>ĐIỂM</small></b></div><TimeBar left={left} total={30}/><p>Chạm Tủ lạnh (ít đường) hoặc Thùng rác (nhiều đường). Đúng +5 điểm.</p><p className="event-note">Theo công thức trong bộ thẻ: nhóm ít đường không thêm đường; matcha và trà trái cây ở nhóm còn lại là phiên bản pha ngọt.</p><div className="drink-card" draggable onDragStart={e=>e.dataTransfer.setData('text/plain',deck[0].name)}><span className="event-drink-art" aria-hidden="true"><i/><i/><i/></span><small>PHÂN LOẠI ĐỒ UỐNG</small><strong>{deck[0].name}</strong></div><div className="event-answers">{[false,true].map(good=><button key={String(good)} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(e.dataTransfer.getData('text/plain')===deck[0].name)choose(good);}} onClick={()=>choose(good)}><span className="event-bin-icon">{good ? <FridgeIcon/> : <BinIcon/>}</span><span className="event-answer-text"><strong>{good?'Tủ lạnh':'Thùng rác'}</strong><small>{good ? 'ÍT ĐƯỜNG / HEALTHY' : 'NHIỀU ĐƯỜNG'}</small></span><kbd aria-hidden="true">{good ? '→' : '←'}</kbd></button>)}</div><p role="status" className={`event-feedback ${feedback}`}>{feedback==='correct'?'✓ Chính xác! +5':feedback==='wrong'?'✕ Chưa chính xác!':(matchMedia('(pointer: coarse)').matches ? 'Chạm để chọn — càng nhanh càng nhiều điểm!' : 'Dùng phím ← Thùng rác · Tủ lạnh →')}</p></div>;
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
  return <div className="event-game event-truth"><div className="event-hud"><span className="event-hud-chip">HỒ SƠ #{String(index+1).padStart(2,'0')} · {questions[index].title}</span><b className={left<=5 ? "event-timer urgent" : "event-timer"}>◷ {left}<small>GIÂY</small></b></div><TimeBar left={answer===null ? left : 0} total={15}/><blockquote>{questions[index].statement}</blockquote><div className="event-answers"><button disabled={answer!==null} onClick={()=>choose(false)}><span className="event-answer-text"><strong>Cú lừa</strong><small>CAP / FAKE</small></span><kbd aria-hidden="true">←</kbd></button><button disabled={answer!==null} onClick={()=>choose(true)}><span className="event-answer-text"><strong>Sự thật</strong><small>FACT</small></span><kbd aria-hidden="true">→</kbd></button></div>{answer!==null&&<div className={`truth-reveal ${answer ? 'ok' : 'bad'}`} role="status"><h2>{answer?'✓ Chính xác · +5 điểm':'✕ Chưa chính xác / hết giờ'}</h2><b>Đáp án: {questions[index].fact?'SỰ THẬT':'CÚ LỪA'}</b><p>{questions[index].explanation}</p><button className="event-primary" onClick={()=>{if(index===4)onDone(score.current);else{setIndex(i=>i+1);setAnswer(null);locked.current=false;}}}>{index===4?'Xem kết quả →':'Hồ sơ tiếp theo →'}</button></div>}</div>;
}
