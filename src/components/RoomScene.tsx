import { memo, useId } from 'react';
import { P } from './FurnitureSvg';
import type { RoomVariant } from '../lib/furniture';
import type { Weather } from './RoomScene3D';
export type { RoomVariant } from '../lib/furniture';

/** Vector architecture: the same crisp room on every device, with no WebGL/assets to load. */
// memo: chỉ vẽ lại khi act/variant/weather/lights đổi → chạm nút khác không redraw phòng.
export const RoomScene = memo(RoomSceneBase);
function RoomSceneBase({ act = 1, variant = 'living', weather = 'day', lights = true }: {
  act?: 1 | 2 | 3; variant?: RoomVariant; weather?: Weather; lights?: boolean;
}) {
  const id = useId().replace(/:/g, '');
  const p = P[act];
  const garden = variant === 'garden';
  const night = weather === 'night';
  const sky = night ? ['#7775b8', '#b8a3ce'] : weather === 'sunset' ? ['#f0abc0', '#ffe3b5'] : weather === 'rain' || weather === 'fog' || weather === 'cloudy' ? ['#adcbd9', '#e4e9ed'] : p.sky;
  const url = (name: string) => `url(#${id}-${name})`;
  if (garden) return <BalconyScene id={id} weather={weather} lights={lights} />;
  const kitchen = variant === 'kitchen';
  return <div className="room-vector absolute inset-0 overflow-hidden" aria-hidden="true" data-room-scene data-room-variant={variant}>
    <svg viewBox="0 0 800 600" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
      <defs>
        <linearGradient id={`${id}-wall`} x2="0" y2="1"><stop stopColor={kitchen ? '#f9f7ed' : act === 2 ? '#edf3e7' : '#fff5ec'} /><stop offset="1" stopColor={kitchen ? '#d9e1d3' : act === 3 ? '#dfe5f3' : '#efd5d8'} /></linearGradient>
        <linearGradient id={`${id}-floor`} x2="0" y2="1"><stop stopColor="#e8c4a6" /><stop offset="1" stopColor="#f4ddc5" /></linearGradient>
        <linearGradient id={`${id}-sky`} x2="0" y2="1"><stop stopColor={sky[0]} /><stop offset="1" stopColor={sky[1]} /></linearGradient>
        <radialGradient id={`${id}-light`}><stop stopColor="#fffaf1" stopOpacity=".8" /><stop offset="1" stopColor="#fffaf1" stopOpacity="0" /></radialGradient>
        <pattern id={`${id}-paper`} width="40" height="40" patternUnits="userSpaceOnUse"><path d="M20 16v8m-4-4h8" stroke="#bd8f9e" strokeWidth="1" opacity=".16" /></pattern>
      </defs>
      <rect width="800" height="600" fill={url('wall')} />
      <rect width="800" height="330" fill={url('paper')} />
      <path d="M0 0L65 42H735L800 0Z" fill="#fff7f0" />
      <path d="M0 0L65 42V330L0 390Z" fill="#dfbdc6" opacity=".5" />
      <path d="M800 0L735 42V330L800 390Z" fill="#c3b3d0" opacity=".3" />
      <path d="M65 42H735" stroke="#fffaf6" strokeWidth="10" />
      <path d="M65 52H735" stroke="#d9b8c2" strokeWidth="2" />
      <rect x="65" y="230" width="670" height="100" fill={kitchen ? '#d4dbca' : '#ead0d1'} />
      {Array.from({length: 12}, (_, i) => <rect key={i} x={78 + i * 55} y="244" width="40" height="73" rx="4" fill="none" stroke="#fff4ed" strokeWidth="2" opacity=".65" />)}
      {variant === 'kitchen' && <g opacity=".6">
        <rect x="65" y="230" width="670" height="100" fill="#fff4df" />
        {[255,280,305].map(y => <path key={y} d={`M65 ${y}H735`} stroke="#dbc6b2" />)}
        {Array.from({length: 14},(_,i) => <path key={i} d={`M${70+i*50} 230V330`} stroke="#dbc6b2" />)}
      </g>}
      {garden && <g>
        <path d="M65 265H735" stroke="#fff9eb" strokeWidth="11" />
        {Array.from({length: 17},(_,i) => <path key={i} d={`M${80+i*40} 270V325`} stroke="#fff8eb" strokeWidth="7" />)}
      </g>}
      <path d="M65 230H735" stroke="#fff7ed" strokeWidth="8" />
      <path d="M65 237H735" stroke="#c4a0ae" strokeWidth="2" opacity=".4" />
      <path d="M0 390L65 330H735L800 390V600H0Z" fill={url('floor')} />
      {Array.from({length: 13}, (_, i) => <path key={i} d={`M${65 + i * 56} 330L${-170 + i * 95} 600`} stroke="#b58c79" strokeWidth="1.5" opacity=".25" />)}
      {[412, 451, 498, 550].map(y => <path key={y} d={`M0 ${y}H800`} stroke="#c19b85" strokeWidth="1.5" opacity=".23" />)}
      <path d="M65 327H735" stroke="#bd9299" strokeWidth="8" />
      <path d="M65 324H735" stroke="#fff8ef" strokeWidth="5" />
      <ellipse cx="400" cy="415" rx="340" ry="190" fill={url('light')} />
    </svg>
    <div className={`room-architecture ${kitchen ? 'room-architecture-kitchen' : ''}`}>
      <svg viewBox="0 0 440 250" className="room-window-art">
        <defs><clipPath id={`${id}-glass`}><rect x="95" y="35" width="250" height="164" rx={kitchen ? 8 : 54} /></clipPath></defs>
        <rect x="85" y="28" width="270" height="185" rx={kitchen ? 12 : 62} fill="#bd969d" opacity=".22" />
        <rect x="85" y="18" width="270" height="185" rx={kitchen ? 12 : 62} fill="#fffbf3" />
        <g clipPath={url('glass')}>
          <rect x="95" y="35" width="250" height="164" fill={url('sky')} />
          <circle cx="284" cy="73" r="19" fill={night ? '#fff6d5' : '#fff2b7'} />
          <path d="M85 170Q150 110 230 163T360 137V215H85Z" fill="#a5c7aa" />
          <path d="M85 190Q190 143 268 180T360 168V215H85Z" fill="#78a995" />
          <path d="M130 30L155 30L110 200H95Z" fill="#fff" opacity=".22" />
          {night && [[135,65],[204,52],[242,92]].map(([x,y]) => <path key={x} d={`M${x} ${y-4}v8m-4-4h8`} stroke="#fff7e9" strokeWidth="2" />)}
        </g>
        <path d="M220 34V199M95 120H345" stroke="#fffaf2" strokeWidth="7" />
        <rect x="74" y="200" width="292" height="12" rx="6" fill="#c39180" />
        <rect x="74" y="198" width="292" height="6" rx="3" fill="#ffe2c6" />
        {!kitchen && <>
          <path d="M54 30Q77 12 115 24L91 180Q66 199 42 184Z" fill="#dca3bf" />
          <path d="M386 30Q363 12 325 24L349 180Q374 199 398 184Z" fill="#dca3bf" />
          <path d="M76 32L60 172M94 30L77 176M364 32L380 172M346 30L363 176" stroke="#f1c4d4" strokeWidth="5" />
          <path d="M50 24H390" stroke="#af817f" strokeWidth="7" strokeLinecap="round" />
          <path d="M46 156L97 163M343 163L394 156" stroke="#ffdda7" strokeWidth="7" />
        </>}
      </svg>
    </div>
    <div className="room-shaft" />
    <div className="room-scene-tint" style={{ opacity: lights ? night ? .12 : 0 : .3 }} />
  </div>;
}
/** An open-air terrace, with a distant skyline, glass balustrade and stone tiles.
 * The deck uses the same floor baseline as indoor rooms so furnishings stay grounded. */
function BalconyScene({ id, weather, lights }: { id: string; weather: Weather; lights: boolean }) {
  const night = weather === 'night';
  const sunset = weather === 'sunset';
  const rain = weather === 'rain';
  const sky = night ? ['#253b58','#8193af'] : sunset ? ['#b9a6ca','#f5c7aa'] : rain || weather === 'cloudy' || weather === 'fog' ? ['#afc5cb','#e3e7de'] : ['#9ac8e0','#edf3e5'];
  const url = (name: string) => `url(#${id}-out-${name})`;
  const buildings = [[0,236,63,94],[69,258,47,72],[128,215,64,115],[201,250,41,80],[256,231,75,99],[340,267,52,63],[405,239,55,91],[475,216,69,114],[554,250,52,80],[619,231,64,99],[698,209,70,121],[776,249, 40,81]];
  return <div className="room-vector room-outdoor absolute inset-0 overflow-hidden" aria-hidden="true" data-room-scene data-room-variant="garden">
    <svg viewBox="0 0 800 600" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
      <defs>
        <linearGradient id={`${id}-out-sky`} x2="0" y2="1"><stop stopColor={sky[0]} /><stop offset="1" stopColor={sky[1]} /></linearGradient>
        <linearGradient id={`${id}-out-deck`} x2="0" y2="1"><stop stopColor={night ? '#c0c7c2' : '#e7dccb'} /><stop offset="1" stopColor={night ? '#d0d1bf' : '#f1e9d8'} /></linearGradient>
        <linearGradient id={`${id}-out-steel`}><stop stopColor="#c8d2cd" /><stop offset=".4" stopColor="#edf2e9" /><stop offset="1" stopColor="#8b9c9b" /></linearGradient>
        <linearGradient id={`${id}-out-glass`} x2="1" y2="1"><stop stopColor="#f4fbff" stopOpacity=".27" /><stop offset="1" stopColor="#bfdbe0" stopOpacity=".13" /></linearGradient>
        <radialGradient id={`${id}-out-sun`}><stop stopColor="#ffeebf" stopOpacity=".38" /><stop offset="1" stopColor="#ffeebf" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="800" height="600" fill={url('sky')} />

      {night ? [[120,105],[230,176],[450,98],[556,182],[ 70,203],[727,176]].map(([x,y]) => <circle key={x} cx={x} cy={y} r="1.4" fill="#fff6dc" opacity=".6" />) : <g fill="#fff9e8" opacity=".6"><path d="M 60 151Q 90 121 121 143Q148 116 173 146Q194 143 205 158H60Z" /><path d="M380 188Q408 163 438 179Q470 151 499 181Q527 172 550 193H380Z" /></g>}
      <path d="M0 281Q130 197 244 251T470 230T800 249V350H0Z" fill={night ? '#6e8895' : '#a9c1b6'} />
      <path d="M0 300Q138 249 294 294T550 271T800 288V360H0Z" fill={night ? '#617d86' : '#91aea0'} />
      {buildings.map(([x,y,w,h],i) => <g key={x}>
        <rect x={x} y={y} width={w} height={h} fill={night ? ['#637b8a','#78909b','#506a7b'][i%3] : ['#d2d2c3','#c4ccbf','#b5c4be'][i%3]} />
        <rect x={x-2} y={y} width={w+4} height="4" fill={night ? '#526879' : '#b2bdb1'} />
        {Array.from({length:Math.floor(h/18)},(_,r) => Array.from({length:Math.floor(w/15)},(_,c) => <rect key={`${r}-${c}`} x={x+6+c*15} y={y+12+r*18} width="6" height="8" fill={night && (r+c+i)%3===0 ? '#f5d6a0' : night ? '#899eaa' : '#a3b5b1'} opacity={night ? .75 : .55} />))}
      </g>)}
      <path d="M0 323Q125 280 225 317T460 303T800 316V361H0Z" fill={night ? '#51706b' : '#759887'} />
      <path d="M0 350L 40 330H760L800 350V600H0Z" fill={url('deck')} />
      {Array.from({length:13},(_,i) => <path key={i} d={`M${i*67} 330L${-180+i*97} 600`} stroke="#aeb4a5" strokeWidth="1.3" opacity=".5" />)}
      {[370,422,487,565].map(y => <path key={y} d={`M0 ${y}H800`} stroke="#b7b9a9" strokeWidth="1.3" opacity=".5" />)}
      {/* The rails cast long diagonal shadows onto the patio, all from one sun direction. */}
      {Array.from({length:9},(_,i) => <path key={i} d={`M${i*100} 331L${i*100+75} 429L${i*100+84} 429L${i*100+7} 331Z`} fill="#526870" opacity={night ? .07 : .08} />)}
      <rect x="0" y="249" width="800" height="80" fill={url('glass')} />
      {Array.from({length:9},(_,i) => <g key={i}>
        <rect x={i*100} y="244" width="7" height=" 90" fill={url('steel')} />
        <path d={`M${i*100+16} 255L${i*100+48} 255L${i*100+30} 323H${i*100+12}Z`} fill="#fff" opacity=".1" />
        <rect x={i*100-4} y="326" width="15" height="5" rx="1" fill="#859b9b" />
      </g>)}
      <rect x="0" y="240" width="800" height="10" rx="3" fill={url('steel')} />
      <path d="M0 241H800" stroke="#f6fcf6" strokeWidth="2" />
      {/* Exterior wall edges and little lanterns make this a terrace, not a window. */}
      <path d="M0 0H24V332L0 350Z" fill={night ? '#9eaba9' : '#e7dfcc'} /><path d="M800 0H776V332L800 350Z" fill={night ? '#a7b2ab' : '#d7d6c5'} />
      {[34,766].map(x => <g key={x}><path d={`M${x} 168V209`} stroke="#6b817d" strokeWidth="2" /><rect x={x-10} y="193" width="20" height="32" rx="3" fill="#70817a" /><rect x={x-6} y="198" width="12" height="21" rx="2" fill={lights ? '#ffe3a4' : '#c5cbb2'} /><path d={`M${x} 198v21`} stroke="#849181" strokeWidth="2" /></g>)}
      {rain && Array.from({length:18},(_,i) => <path key={i} d={`M${i*47+20} ${120+(i%4)*30}l-5 19`} stroke="#e6f0ed" opacity=".32" />)}
      {weather === 'snow' && Array.from({length:16},(_,i) => <circle key={i} cx={i*51+18} cy={100+(i%5)* 30} r="2" fill="#fff" opacity=".6" />)}
    </svg>
    <div className={`outdoor-orb ${night ? 'outdoor-moon' : 'outdoor-sun'}`} />
    <div className="room-scene-tint" style={{ opacity: lights ? 0 : .12 }} />
  </div>;
}
