import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { playSfx } from '../../lib/sfx';
import { cases, gameInfo, gameNames, healthy, pairs, shuffle, sugary } from './data';
import { flush, myPlay, pending, playerKey, resetDevice, savePlay, watch, type EventPlay } from './store';
import { EventResults } from './EventResults';
import gumiArt from '../../assets/gumi.png';
import './event.css';
import './event-player.css';
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
  const [step, setStep] = useState<'name' | 'pick' | 'ready' | 'play'>('name');
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
  const start = (g: number) => { finished.current = false; setGame(g); setStep('ready'); window.scrollTo({ top: 0 }); };
  const status = waiting ? 'Đang gửi điểm' : online ? 'Đã kết nối' : 'Đang ngoại tuyến';

  return <main className="event-shell event-mobile" data-game-active={step === 'play' && !done ? 'true' : undefined}>
    <header className="event-header">
      <div className="event-brand"><img className="event-brand-mark" src="/icons/icon-192.png?v=20261014" alt="" aria-hidden="true" draggable={false} decoding="async"/><div><b>MẬT ĐỘ</b><small>THE LESS SUGAR CHALLENGE</small></div></div>
      <div className="event-controls"><span className={`event-connection ${!online || waiting ? 'pending' : ''}`} role="status">{status}</span></div>
    </header>
    <div className="event-content">
      {!done && step !== 'play' && <ol className="player-steps" aria-label="Các bước tham gia">{['Nhập tên', 'Chọn thử thách', 'Ghi điểm'].map((label, i) => <li key={label} aria-current={(step === 'name' ? 0 : step === 'pick' ? 1 : 2) === i ? 'step' : undefined}><span>{i + 1}</span>{label}</li>)}</ol>}
      {done ? <>
        <section className="event-summary">
          <img className="event-summary-gumi" src={gumiArt} alt="" aria-hidden="true" draggable={false} decoding="async"/>
          <div className="event-summary-body">
            <h1>Bạn đã hoàn thành!</h1>
            <p className="event-summary-team"><small>Người chơi</small>{done.player}</p>
            <p className="event-eyebrow">{gameNames[done.game - 1]}</p>
            <h2><b>{done.score}</b><small>điểm</small></h2>
            <p role="status" className={`event-save-status ${waiting ? '' : 'ok'}`}>
              {waiting ? 'Đã lưu trên máy — điểm sẽ tự gửi lên khi có mạng.' : 'Điểm đã được gửi. Xem vị trí của bạn bên dưới nhé!'}
            </p>
          </div>
        </section>
        <EventResults />
      </> : step === 'ready' ? <section className="player-ready">
        <div className="player-ready-art" aria-hidden="true"><GamePreview game={game}/></div>
        <div><p className="event-eyebrow">Sẵn sàng chưa, {name.trim()}?</p><h1>{gameNames[game - 1]}</h1>
        <p>{['Đưa đồ uống ít đường vào tủ lạnh, đồ uống nhiều đường vào thùng rác. Chạm vào một trong hai nút để chọn.', 'Bạn có 3 giây xem trước các thẻ. Sau đó lật 2 thẻ để ghép đồ uống với lượng đường tương ứng.', 'Đọc từng nhận định và chọn “Cú lừa” hoặc “Sự thật”. Mỗi câu có 15 giây để trả lời.'][game - 1]}</p>
        <div className="player-rules"><span><b>{game === 1 ? '30 giây' : game === 2 ? '45 giây' : '5 câu hỏi'}</b>Thời lượng</span><span><b>+5 điểm</b>Mỗi đáp án đúng</span></div>
        <button className="event-primary" onClick={() => setStep('play')}>Bắt đầu chơi <span aria-hidden="true">→</span></button>
        <button className="event-ghost" onClick={() => setStep('pick')}>Chọn game khác</button>
        <small className="player-ready-note">Đồng hồ chỉ chạy khi bạn bắt đầu.</small></div>
      </section> : step === 'play' ? <>
        <p className="event-eyebrow"><span className="event-team-chip">{name.trim()}</span>Đang chơi</p>
        <div className="event-stage-heading"><h1>{gameNames[game - 1]}</h1></div>
        {game === 1 ? <Sort onDone={finish}/> : game === 2 ? <Memory onDone={finish}/> : <Truth onDone={finish}/>}
      </> : step === 'pick' ? <>
        <p className="event-eyebrow"><span className="event-team-chip">{name.trim()}</span>Chọn thử thách</p>
        <div className="event-stage-heading"><h1>Bạn muốn chơi gì?</h1><button className="event-ghost event-back" onClick={() => setStep('name')}>← Đổi tên</button></div>
        <p className="player-intro">Một lượt chơi, một cơ hội tỏa sáng. Bạn chọn thử thách nào?</p>
        <div className="event-game-roster event-game-pick">{gameNames.map((g, i) => <button key={g} onClick={() => start(i + 1)}><GamePreview game={i + 1}/><div className="player-pick-copy"><small>{i === 0 ? 'Nhanh tay' : i === 1 ? 'Tinh mắt' : 'Hiểu biết'} <span>· {i === 0 ? '30 giây' : i === 1 ? '45 giây' : '5 câu hỏi'}</span></small><b>{g}</b><p>{gameInfo[i]!.hint}</p><strong className="player-pick-action">Khám phá thử thách <span aria-hidden="true">↗</span></strong></div></button>)}</div>
        <p className="event-note">Mỗi điện thoại có 1 lượt chơi. Mỗi đáp án đúng được cộng 5 điểm.</p>
      </> : <>
        <div className="event-lobby">
          <div className="event-lobby-copy">
            <span className="event-live">Thử thách bớt ngọt</span>
            <h1 className="player-hero-title"><span>Hạ mật độ.</span><span>Bật năng lượng.</span></h1>
            <p>Chọn 1 trong 3 thử thách, ghi điểm thật cao và leo lên đỉnh bảng xếp hạng!</p>
          </div>
          <div className="event-entry-wrap">
            <img className="event-gumi" src={gumiArt} alt="" aria-hidden="true" draggable={false} decoding="async"/>
            <form className="event-entry" onSubmit={e => { e.preventDefault(); const n = name.trim(); if (!n) return; try { localStorage.setItem(nameKey, n); } catch { /* ignore */ } setStep('pick'); }}>
              <span className="event-eyebrow">Vé tham gia của bạn</span>
              <h2>Chào bạn mới!</h2>
              <label htmlFor="event-name">Tên xuất hiện trên bảng xếp hạng</label>
              <input id="event-name" maxLength={40} required autoComplete="nickname" enterKeyHint="go" value={name} onChange={e => setName(e.target.value)} placeholder="Nhập tên của bạn…"/>
              <button className="event-primary" disabled={!name.trim()}>Chọn thử thách <span aria-hidden="true">→</span></button>
              <small>Tên đã sẵn sàng? Cùng ghi điểm nào. Mỗi điện thoại có 1 lượt chơi.</small>
            </form>
          </div>
        </div>
      </>}
    </div>
    {!done && step !== 'play' && <footer className="player-footer">Mật Độ <span>Chơi vui · Hiểu đường · Sống khỏe</span></footer>}
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
  return <div className={`event-game event-sort ${feedback}`}><div className="event-hud"><span className={left<=5 ? "event-timer urgent" : "event-timer"}>◷ {left}<small>giây</small></span><b className="event-points">{score}<small>điểm</small></b></div><TimeBar left={left} total={30}/><p>Ít đường → Tủ lạnh. Nhiều đường → Thùng rác. Mỗi thẻ đúng +5 điểm.</p><p className="event-note">Theo công thức trong bộ thẻ: nhóm ít đường không thêm đường; matcha và trà trái cây ở nhóm còn lại là phiên bản pha ngọt.</p><div className="drink-card" draggable onDragStart={e=>e.dataTransfer.setData('text/plain',deck[0].name)}><span className="event-drink-art" aria-hidden="true"><i/><i/><i/></span><small>Đồ uống này nên để đâu?</small><strong>{deck[0].name}</strong></div><div className="event-answers">{[false,true].map(good=><button key={String(good)} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(e.dataTransfer.getData('text/plain')===deck[0].name)choose(good);}} onClick={()=>choose(good)}><span className="event-bin-icon">{good ? <FridgeIcon/> : <BinIcon/>}</span><span className="event-answer-text"><strong>{good?'Tủ lạnh':'Thùng rác'}</strong><small>{good ? 'Ít đường' : 'Nhiều đường'}</small></span><kbd aria-hidden="true">{good ? '→' : '←'}</kbd></button>)}</div><p role="status" className={`event-feedback ${feedback}`}>{feedback==='correct'?'✓ Chính xác! +5':feedback==='wrong'?'✕ Chưa chính xác!':(matchMedia('(pointer: coarse)').matches ? 'Chạm để chọn — càng nhanh càng nhiều điểm!' : 'Dùng phím ← Thùng rác · Tủ lạnh →')}</p></div>;
}
function Memory({onDone}:{onDone:(s:number)=>void}) {
  const [cards]=useState(()=>shuffle(pairs.flatMap((p,id)=>p.map(label=>({id,label}))))); const [preview,setPreview]=useState(true); const [open,setOpen]=useState<number[]>([]);const [matched,setMatched]=useState<number[]>([]);const points=useRef(0);
  useEffect(()=>{const t=setTimeout(()=>setPreview(false),3000);return()=>clearTimeout(t);},[]);
  const left=useClock(45,!preview,()=>onDone(points.current));
  useEffect(()=>{if(open.length!==2)return;const same=cards[open[0]].id===cards[open[1]].id;const t=setTimeout(()=>{ if(same){const next=[...matched,cards[open[0]].id]; points.current=next.length*5;setMatched(next);playSfx('sparkle');if(next.length===5)onDone(25);}setOpen([]);},same?300:800);return()=>clearTimeout(t);},[open,cards,matched,onDone]);
  return <div className="event-game"><div className="event-hud"><span className={preview ? 'event-hud-chip' : left<=5 ? 'event-timer urgent' : 'event-timer'}>{preview?'Ghi nhớ trong 3 giây':<>◷ {left}<small>giây</small></>}</span><b className="event-points">{matched.length*5}<small>điểm · {matched.length}/5 cặp</small></b></div><TimeBar left={preview ? 45 : left} total={45}/><p>Ghép đồ uống với lượng đường tương ứng. Đúng một cặp +5 điểm.</p><div className="memory-grid">{cards.map((c,i)=><button key={i} disabled={preview||open.length===2||matched.includes(c.id)||open.includes(i)} className={matched.includes(c.id)?'matched':preview||open.includes(i)?'revealed':''} onClick={()=>setOpen(o=>o.length < 2 && !o.includes(i) ? [...o,i] : o)}>{preview||open.includes(i)||matched.includes(c.id)?<><small>{matched.includes(c.id) ? '✓ Đã ghép' : 'Ghép cặp đồ uống'}</small><strong>{c.label}</strong></>:<><span className="memory-emblem">M↓</span><small>Chạm để lật</small></>}</button>)}</div></div>;
}
function Truth({onDone}:{onDone:(s:number)=>void}) {
  const [questions]=useState(()=>shuffle(cases));const [index,setIndex]=useState(0);const [answer,setAnswer]=useState<boolean|null>(null);const score=useRef(0);const locked=useRef(false);
  const choose=(value:boolean|null)=>{if(locked.current)return;locked.current=true;const ok=value===questions[index].fact;if(ok)score.current+=5;setAnswer(ok);playSfx(ok?'sparkle':'sleep');};
  const left=useClock(15,answer===null,()=>choose(null));
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if(answer!==null||e.repeat)return;if(e.code==='ArrowLeft'){e.preventDefault();choose(false);}if(e.code==='ArrowRight'){e.preventDefault();choose(true);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);});
  return <div className="event-game event-truth"><div className="event-hud"><span className="event-hud-chip">Câu {index + 1}/5 · {score.current} điểm</span><b className={left<=5 ? "event-timer urgent" : "event-timer"}>◷ {left}<small>giây</small></b></div><TimeBar left={answer===null ? left : 0} total={15}/><blockquote>{questions[index].statement}</blockquote><div className="event-answers"><button disabled={answer!==null} onClick={()=>choose(false)}><span className="event-answer-text"><strong>Cú lừa</strong><small>Không chính xác</small></span><kbd aria-hidden="true">←</kbd></button><button disabled={answer!==null} onClick={()=>choose(true)}><span className="event-answer-text"><strong>Sự thật</strong><small>Chính xác</small></span><kbd aria-hidden="true">→</kbd></button></div>{answer!==null&&<div className={`truth-reveal ${answer ? 'ok' : 'bad'}`} role="status"><h2>{answer?'✓ Chính xác · +5 điểm':'✕ Chưa chính xác / hết giờ'}</h2><b>Đáp án: {questions[index].fact?'Sự thật':'Cú lừa'}</b><p>{questions[index].explanation}</p><button className="event-primary" onClick={()=>{if(index===4)onDone(score.current);else{setIndex(i=>i+1);setAnswer(null);locked.current=false;}}}>{index===4?'Xem kết quả →':'Câu tiếp theo →'}</button></div>}</div>;
}

/** Lightweight CSS illustrations: no animation loop or external requests. */
function GamePreview({ game }: { game: number }) {
  return <div className={`player-preview preview-${game}`} aria-hidden="true">{game === 1 ? <><span className="preview-bin"><BinIcon/></span><span className="preview-drink">Trà thảo mộc<small>Ít đường</small></span><span className="preview-fridge"><FridgeIcon/></span></> : game === 2 ? <div className="preview-cards">{['?', 'Trà sữa', '?', '?', '30g đường', '?'].map((v, i) => <span key={i}>{v}</span>)}</div> : <div className="preview-question"><span>Thật hay đùa?</span><b>Không ngọt nghĩa là<br/>không có đường?</b><div><span>Cú lừa</span><span>Sự thật</span></div></div>}</div>;
}
