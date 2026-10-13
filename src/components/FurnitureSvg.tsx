import { useId, type FC, type ReactNode } from 'react';
import catGirlPearl from '../assets/cat-girl-pearl.webp';
import gumayusiWin from '../assets/gumayusi-win.webp';

export interface Palette {
  wall: [string, string]; floor: [string, string]; base: string; plank: string; molding: string;
  sky: [string, string]; curtain: [string, string]; pelmet: string; lampGlow: string;
  bottleA: string; bottleB: string; potPlant: string; beam: string;
  window: 'meadow' | 'forest' | 'snow'; bulbs: boolean; snow: boolean;
}

/** Bảng màu + không khí theo 3 vùng đất (phòng "đổi da" theo Hồi hiện tại). */
export const P: Record<1 | 2 | 3, Palette> = {
  1: { wall: ['#FCEFE7', '#F6DBCF'], floor: ['#EBC59C', '#D6A074'], base: '#C98F63', plank: '#B67C48', molding: '#EAC7B7',
       sky: ['#BFE6F5', '#EAF7EA'], curtain: ['#F7CEDA', '#EDA9BB'], pelmet: '#EDA9BB', lampGlow: '#FFE6A8',
       bottleA: '#7EC9E0', bottleB: '#BFE3B0', potPlant: '#5CB56B', beam: 'rgba(255,246,210,0.9)', window: 'meadow', bulbs: false, snow: false },
  2: { wall: ['#C9DAC6', '#A2BA9B'], floor: ['#D6AF80', '#AE7E52'], base: '#8F6338', plank: '#7A5330', molding: '#B2C3A7',
       sky: ['#F6C486', '#9C84B8'], curtain: ['#BBD1AF', '#89AB7D'], pelmet: '#89AB7D', lampGlow: '#FFCF77',
       bottleA: '#86C5A0', bottleB: '#CBE0A8', potPlant: '#3B8149', beam: 'rgba(255,205,140,0.7)', window: 'forest', bulbs: true, snow: false },
  3: { wall: ['#E8F0F7', '#CFDEEB'], floor: ['#DBC3A6', '#C0A382'], base: '#B0947A', plank: '#9C8168', molding: '#DBE6EF',
       sky: ['#CFE6FA', '#F1F8FE'], curtain: ['#D3E8F6', '#A9CBE0'], pelmet: '#A9CBE0', lampGlow: '#FFE1A0',
       bottleA: '#9AD0E6', bottleB: '#CFE7F2', potPlant: '#6FB6A0', beam: 'rgba(224,240,252,0.9)', window: 'snow', bulbs: false, snow: true },
};


/* Every item shares the same light direction and material palette. SVG gradients and
 * engraved details stay crisp without raster textures, GPU filters or animation loops. */
function FurnitureArt({ kind, p }: { kind: string; p: Palette }) {
  const id = useId().replace(/:/g, '');
  const mat = (name: string) => `url(#${id}-${name})`;
  const wood = mat('wood'), woodDark = mat('wood-dark'), fabric = mat('fabric'), metal = mat('metal'), ceramic = mat('ceramic');
  const shadow = (cx: number, cy: number, rx: number, ry = 9) => <><ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={mat('shadow')} /><ellipse cx={cx} cy={cy} rx={rx * .65} ry={ry * .36} fill="#493728" opacity=".09" /></>;
  const grain = (x: number, y: number, w: number, h: number) => <rect x={x} y={y} width={w} height={h} fill={mat('grain')} opacity=".5" />;
  let viewBox = '0 0 240 200';
  let art: ReactNode;
  switch (kind) {
    case 'sofa':
      viewBox = '0 0 240 180';
      art = <>
        {shadow(122,166,107,10)}
        <path d="M47 133L43 164M191 134L196 164" stroke={woodDark} strokeWidth="9" strokeLinecap="round" />
        <path d="M37 42Q39 21 61 21H182Q202 22 207 43L212 111H29Z" fill={mat('fabric-dark')} stroke="#b77999" strokeWidth="1.4" />
        <rect x="42" y="26" width="77" height="83" rx="18" fill={fabric} />
        <rect x="121" y="26" width="77" height="83" rx="18" fill={fabric} />
        <path d="M52 43Q59 34 108 36M133 36Q185 34 190 43" fill="none" stroke="#ffdde9" strokeWidth="1.3" opacity=".8" />
        {[76,159].map(x => <g key={x}><circle cx={x} cy="58" r="3.2" fill="#bd7e9d" /><path d={`M${x-5} 54l10 8m-10 0l10-8`} stroke="#eab8cf" strokeWidth=".7" /></g>)}
        <rect x="26" y="106" width="189" height="36" rx="12" fill={mat('fabric-dark')} />
        <rect x="34" y="96" width="85" height="30" rx="11" fill={fabric} stroke="#c68aa7" />
        <rect x="122" y="96" width="85" height="30" rx="11" fill={fabric} stroke="#c68aa7" />
        <path d="M43 104H111M131 104H199M38 132H204" stroke="#fbd5e4" strokeWidth="1" fill="none" opacity=".6" />
        <path d="M16 90Q16 75 31 75Q47 75 48 90V135H17Z" fill={fabric} stroke="#c185a2" />
        <path d="M193 90Q193 75 208 75Q224 75 224 90V135H194Z" fill={mat('fabric-dark')} stroke="#b77999" />
        <path d="M23 90Q30 82 39 90M199 87Q208 80 216 88" fill="none" stroke="#ffd5e5" />
        <g transform="rotate(-10 70 86)"><rect x="51" y="65" width="38" height="36" rx="9" fill={mat('linen')} stroke="#d0b595" /><rect x="55" y="69" width="30" height="28" rx="6" fill="none" stroke="#fff4db" strokeDasharray="2 2" /><path d="M61 82h17m-8-8v17" stroke="#bd9d73" /></g>
        <g transform="rotate(9 172 83)"><rect x="153" y="67" width="32" height="30" rx="8" fill="#b5cbb8" stroke="#91af9b" /><path d="M160 74l18 16m0-16l-18 16" stroke="#dce7d4" opacity=".7" /></g>
      </>;
      break;
    case 'chair':
      viewBox = '32 0 176 214';
      art = <>
        {shadow(121,201,66,9)}
        <path d="M83 132L 70 195M156 135L167 197M99 138L103 184M141 138L136 184" stroke={woodDark} strokeWidth="8" strokeLinecap="round" />
        <path d="M74 36Q76 15 96 14H146Q165 15 167 35L159 125H81Z" fill={wood} stroke="#a88061" strokeWidth="1.3" />
        <path d="M85 38Q84 27 97 26H145Q155 27 155 38L150 99H91Z" fill="#f2ddbc" />
        {[98,111,124,137,149].map((x,i) => <path key={x} d={`M${x} 34L${x-i*.7} 94`} stroke="#c19c74" strokeWidth="3.2" strokeLinecap="round" />)}
        <path d="M81 111L158 111L180 141L61 141Z" fill={woodDark} />
        <path d="M77 110H163L181 135Q121 159 60 135Z" fill={wood} stroke="#b58d6b" />
        <ellipse cx="120" cy="126" rx="50" ry="15" fill={mat('sage')} stroke="#91a996" />
        <path d="M77 125Q119 109 163 125" stroke="#dde9d7" fill="none" strokeWidth="1.4" />
        <path d="M79 147L76 181M161 147L165 182" stroke="#e2bc92" strokeWidth="1.2" />
      </>;
      break;
    case 'coffeeTable':
    case 'bistroTable': {
      const bistro = kind === 'bistroTable';
      viewBox = '0 0 240 170';
      art = <>
        {shadow(120,156,98,10)}
        {bistro ? <><path d="M120 70V143" stroke="#8d9f98" strokeWidth="10" /><ellipse cx="120" cy="146" rx="38" ry="8" fill={mat('metal-dark')} /><ellipse cx="120" cy="143" rx="34" ry="6" fill={metal} /></> : <><path d="M58 77L43 151M181 77L197 151M93 84L 90 139M150 83L153 140" stroke={woodDark} strokeWidth="10" strokeLinecap="round" /><path d="M57 86L48 143M182 86L192 143" stroke="#e7c299" strokeWidth="1.5" /></>}
        <ellipse cx="120" cy=" 70" rx="102" ry="30" fill={woodDark} />
        <ellipse cx="120" cy="64" rx="102" ry="30" fill={bistro ? ceramic : wood} stroke="#b99174" strokeWidth="1.2" />
        <path d="M31 61Q118 26 206 59" stroke="#fff1d9" strokeWidth="2" fill="none" opacity=".65" />
        {!bistro && <path d="M 40 66Q110 40 195 66M 50 73Q111 54 192 73" stroke="#a9815c" strokeWidth=".7" fill="none" opacity=".25" />}
        <ellipse cx="91" cy="67" rx="23" ry="8" fill="#9e73572b" /><ellipse cx="89" cy="64" rx="22" ry="7" fill="#fdf4e3" stroke="#cfbca7" />
        <path d="M75 46V61Q88 73 103 61V46Z" fill={ceramic} stroke="#d6c6b5" strokeWidth=".8" /><ellipse cx="89" cy="46" rx="14" ry="5" fill="#79523d" stroke="#fff7e6" strokeWidth="3" /><path d="M104 47Q122  40 116 57Q112 61 104 57" fill="none" stroke="#f4e9d6" strokeWidth="5" />
        <rect x="139" y="52" width="35" height="18" rx="3" fill="#8b6f82" transform="rotate(10 157 61)" /><rect x="140" y="49" width="35" height="17" rx="3" fill="#ddaebe" transform="rotate(10 157 61)" /><path d="M149 51l-2 12" stroke="#f8d4dc" />
        {bistro && <><ellipse cx="157" cy="43" rx="12" ry="4" fill="#a88a7529" /><path d="M148 25H168L165 43H151Z" fill={ceramic} /><path d="M158 25V13M158 19Q143 12 147 5Q158 5 158 19M158 17Q173 10 169 3Q158 4 158 17" fill="#779e82" stroke="#547b5d" strokeWidth="1" /></>}
      </>;
      break;
    }
    case 'plant':
      viewBox = '30 0 180 242';
      art = <>
        {shadow(120,231,66,8)}
        <path d="M120 169V49M119 123L80 85M121 114L162 65M120 148L164 112M119 151L78 131" stroke="#648564" strokeWidth="4" fill="none" />
        {[[91,67,-35],[149,48,30],[70,112,-48],[161,96,42],[102,40,-13],[135,134,28]].map(([x,y,a]) => <g key={`${x}-${y}`} transform={`rotate(${a} ${x} ${y})`}><ellipse cx={x} cy={y} rx="17" ry="34" fill={mat('leaf')} /><path d={`M${x} ${y+28}V${y-25}m0 13l-10-9m10 24l11-13m-11 25l-11-10`} stroke="#e1efd04d" strokeWidth="1.2" fill="none" /></g>)}
        <path d="M 70 160H170L160 222Q120 236 80 222Z" fill={mat('terracotta')} stroke="#b98267" strokeWidth="1" />
        <ellipse cx="120" cy="162" rx="50" ry="13" fill="#dba084" /><ellipse cx="120" cy="162" rx="43" ry="9" fill="#775a45" /><path d="M119 163V146" stroke="#5f825d" strokeWidth="4" />
        <path d="M79 177Q120 188 162 177M81 199Q122 210 160 199" fill="none" stroke="#e8baa0" strokeWidth="2" opacity=".5" />
        <path d="M85 179L89 215" stroke="#f0c9ac" strokeWidth="3" strokeLinecap="round" opacity=".65" />
      </>;
      break;
    case 'lamp':
      viewBox = '32 0 176 230';
      art = <>
        {shadow(120,215,64,8)}
        <ellipse cx="120" cy="137" rx="84" ry="72" fill={mat('glow')} />
        <ellipse cx="120" cy="208" rx="37" ry="9" fill={mat('metal-dark')} /><ellipse cx="120" cy="204" rx="37" ry="8" fill={metal} />
        <path d="M120 89V201" stroke="#b49b6e" strokeWidth="7" /><path d="M118 95V197" stroke="#ffe4ac" strokeWidth="1" />
        <path d="M88 26H152L179 96Q121 115  60 96Z" fill={mat('linen')} stroke="#c9b18a" strokeWidth="1.2" />
        {[82,97,112,127,142,157].map(x => <path key={x} d={`M${101+(x-101)*.45} 28L${x} 98`} stroke="#c5ac82" opacity=".35" />)}
        <ellipse cx="120" cy="96" rx="58" ry="13" fill="#ad936e" /><ellipse cx="120" cy="94" rx="54" ry="11" fill="#ffe5aa" />
        <path d="M153 99v20" stroke="#9d8565" /><circle cx="153" cy="121" r="3" fill="#b99864" />
      </>;
      break;
    case 'rug':
      viewBox = '0 0 400 150';
      art = <>
        <ellipse cx="200" cy="87" rx="193" ry="58" fill="#694c5822" />
        <ellipse cx="200" cy="81" rx="193" ry="57" fill={fabric} stroke="#b87f97" strokeWidth="2" />
        {[177,164,148,132].map((r,i) => <ellipse key={r} cx="200" cy="81" rx={r} ry={r*.28} fill="none" stroke={i%2 ? '#f7dbe1' : '#bb849b'} strokeWidth={i===0?3:1} strokeDasharray={i===2?'2 3':undefined} />)}
        <path d="M130 80Q161 59 200 69Q239 59 270 80Q239 101 200 91Q161 101 130 80Z" fill="#f1d5d4" opacity=".7" />
        <path d="M180 79L200  70 L220 79L200 90Z" fill="#b8839c" opacity=".6" />
      </>;
      break;
    case 'shelf':
      viewBox = '0 0 280 170';
      art = <>
        <path d="M18 124H266L256 136H28Z" fill={woodDark} /><rect x="18" y="112" width="248" height="16" rx="2" fill={wood} />{grain(19,115,245,11)}
        <path d="M45 133v21h9v-21m171 0v21h9v-21" stroke={mat('metal-dark')} strokeWidth="4" fill="none" />
        <path d="M42  70 Q40 60 51 56H64Q74 60 73 70V112H42Z" fill={ceramic} /><rect x="52" y="43" width="11" height="16" rx="2" fill="#c3a681" /><path d="M58 43V24Q38 21 43 10Q59 11 58 31Q73 14 81 21Q75 38 58 43" fill={mat('leaf')} />
        {[['#b891a3',94,72],['#a4b7a5',112, 60],['#dbbd91',131,67]].map(([color,x,y]) => <g key={String(x)}><rect x={Number(x)} y={Number(y)} width="16" height={112-Number(y)} rx="1" fill={String(color)} /><path d={`M${Number(x)+3} ${Number(y)+6}h10m-10 4h10`} stroke="#fff0d8" opacity=".65" /></g>)}
        <rect x="175" y="63" width="42" height="49" rx="4" fill={woodDark} /><rect x="180" y="68" width="32" height="39" rx="2" fill="#ece4d7" /><path d="M184 100l9-13 7 7 8-16v25Z" fill="#a8b9a1" />
        <path d="M230 91V103Q239 117 250 103V91Z" fill={ceramic} /><path d="M250 94q14-6 12 5q-2 7-12 3" stroke="#e4dccb" strokeWidth="3" fill="none" />
      </>;
      break;
    case 'clock':
      viewBox = '0 0 120 130';
      art = <>
        <ellipse cx="62" cy=" 70" rx="51" ry="52" fill="#593e4320" />
        <circle cx="60" cy=" 60" r="51" fill={woodDark} /><circle cx="60" cy="58" r="48" fill={wood} /><circle cx="60" cy="58" r=" 40" fill={ceramic} stroke="#bd9f79" />
        {Array.from({length:12},(_,i) => <path key={i} d="M60 23v5" transform={`rotate(${i*30} 60 58)`} stroke="#8d7b67" strokeWidth={i%3?1:2} />)}
        <path d="M60 58L43 48M60 58L66 31" stroke="#746150" strokeWidth="3" strokeLinecap="round" /><path d="M60 65V28" stroke="#b27681" /><circle cx="60" cy="58" r="3" fill="#ab7d77" />
        <path d="M29  30 Q58 13 88 35" fill="none" stroke="#fff8e6" strokeWidth="2" opacity=".65" />
      </>;
      break;
    case 'portrait':
    case 'heartframe': {
      const heart = kind === 'heartframe';
      viewBox = '0 0 140 160';
      art = <>
        <rect x="15" y="17" width="114" height="136" rx="5" fill="#65463022" /><rect x="10" y="10" width="114" height="136" rx="5" fill={woodDark} /><rect x="13" y="12" width="108" height="128" rx="4" fill={wood} />
        <rect x="21" y="21" width="92" height="109" fill="#fff7e6" /><rect x="29" y="29" width="76" height="93" fill={heart ? '#ead4d4' : '#dadfd7'} stroke="#c9bca9" />
        <defs><clipPath id={`${id}-photo`}><rect x="29" y="29" width="76" height="93" /></clipPath></defs>
        <image href={heart ? gumayusiWin : catGirlPearl} x="29" y="29" width="76" height="93" preserveAspectRatio="xMidYMid slice" clipPath={`url(#${id}-photo)`} />
        <path d="M14 14h105v124" stroke="#f6d7ad" strokeWidth="1.5" fill="none" /><path d="M32 33L98 116" stroke="#fff" strokeWidth="9" opacity=".08" />
      </>;
      break;
    }
    case 'cabinet':
      viewBox = '0 0 180 145';
      art = <>
        <path d="M15 18H157L172  30 V134H30Z" fill={woodDark} /><rect x="10" y="14" width="148" height="113" rx="3" fill={wood} />{grain(12,16,144,109)}
        {[18,88].map(x => <g key={x}><rect x={x} y="22" width="63" height="95" rx="3" fill="#efe3ca" stroke="#bba589" /><rect x={x+7} y="29" width="49" height="81" rx="2" fill={mat('linen')} stroke="#d2bea0" /><path d={`M${x+50}  60 v18`} stroke="#7a8173" strokeWidth="4" strokeLinecap="round" /><path d={`M${x+48} 61v15`} stroke="#e4cf9d" strokeWidth="1" /></g>)}
        <path d="M12 16H156" stroke="#fff0d5" strokeWidth="2" />
      </>;
      break;
    case 'counter':
      viewBox = '0 0 400 205';
      art = <>
        {shadow(202,194,187,10)}
        <path d="M23 55H383V188H23Z" fill={woodDark} /><path d="M17 49H367V179H17Z" fill={wood} />{grain(18,50,348,128)}
        {[24,106,188,270].map(x => <g key={x}><rect x={x} y="62" width="76" height="106" rx="3" fill="#e4d5bb" stroke="#bca385" /><rect x={x+6} y="68" width="64" height="92" rx="2" fill={mat('linen')} /><path d={`M${x+55} 80h12`} stroke="#8e806c" strokeWidth="3" strokeLinecap="round" /></g>)}
        <path d="M9 37L27 19H379L391 39L369 57H9Z" fill={ceramic} stroke="#c9bca9" /><path d="M9 42H369V56H9Z" fill="#cdbba1" />
        <path d="M25 24H363M25 29Q135 43 247 27T371 33" stroke="#b7aa98" strokeWidth=".9" fill="none" opacity=".6" />
        <path d="M46 28H137L131 43H 40 Z" fill={metal} stroke="#9ea9a8" /><path d="M57 31H125L121 39H51Z" fill="#9caaa9" /><path d="M123 31V15Q123 3 110 3H102" fill="none" stroke={metal} strokeWidth="5" /><path d="M104 4v9" stroke="#a4aaa3" strokeWidth="3" />
        <path d="M235 25H338L348 43H227Z" fill="#4d5657" />{[257,310].map(x => <g key={x}><ellipse cx={x} cy="33" rx="15" ry="6" fill="#262f30" /><ellipse cx={x} cy="33" rx="10" ry="4" fill="none" stroke="#a6a9a1" strokeWidth="1" /></g>)}
        <path d="M282 19H309V30Q298 40 283 30Z" fill={metal} /><ellipse cx="296" cy="19" rx="14" ry="5" fill="#dce0d5" /><path d="M280 22h-9m 40 0h9" stroke="#686f69" strokeWidth="3" />
        <path d="M24 179H360" stroke="#947b60" strokeWidth="4" />
      </>;
      break;
    case 'fridge':
      viewBox = '0 0 145 245';
      art = <>
        {shadow(75,232,63,8)}
        <path d="M17 12H117L135 22V223H30Z" fill="#a4b0ae" /><rect x="9" y="9" width="113" height="215" rx="12" fill={metal} stroke="#b2bebb" strokeWidth="1.5" />
        <rect x="15" y="16" width="99" height=" 70" rx="7" fill={ceramic} /><rect x="15" y="91" width="99" height="125" rx="7" fill={ceramic} />
        <path d="M16 87H113" stroke="#a5aaa2" strokeWidth="3" /><path d="M101  30 V 70 M101 105V167" stroke="#8a9993" strokeWidth="5" strokeLinecap="round" /><path d="M99 31V69M99 106V164" stroke="#f5f6e8" strokeWidth="1.3" />
        <rect x="25" y="31" width="28" height="21" rx="2" fill="#e7b6c2" transform="rotate(-8 39 42)" /><rect x="29" y="37" width="19" height="2" fill="#fff2e3" /><circle cx=" 40" cy="31" r="3" fill="#b87788" />
        <rect x=" 30" y="215" width="67" height="4" rx="2" fill="#a7b2a7" /><path d="M21 25V202" stroke="#fff" strokeWidth="2" opacity=".6" />
      </>;
      break;
    case 'garland':
      viewBox = '0 0 800  80';
      art = <>
        <path d="M15 11Q400 73 785 11" stroke="#8f7d68" strokeWidth="2" fill="none" />
        {Array.from({length:13},(_,i) => {
          const x= 40+i*60,y=13+Math.sin((i/12)*Math.PI)*30;
          return <g key={i}><path d={`M${x-17} ${y+2}L${x+17} ${y+2}L${x+3} ${y+ 30}Z`} fill="#77524e" opacity=".12" /><path d={`M${x-17} ${y}L${x+17} ${y}L${x} ${y+29}Z`} fill={['#d7aab9','#b2c8bc','#ddc69c','#b4b4cf'][i%4]} /><path d={`M${x-13} ${y+3}l13 21 13-21`} fill="none" stroke="#fff4df" opacity=".4" /><circle cx={x} cy={y+36} r="3" fill={p.bulbs ? '#ffe8b3' : '#b9a58b'} /></g>;
        })}
      </>;
      break;
    default:
      art = null;
  }
  return <svg viewBox={viewBox} className="furniture-art h-auto w-full" aria-hidden="true">
    <defs>
      {[
        ['wood','#eed4ad','#c39163'],['wood-dark','#ba906e','#825f43'],['fabric','#f3ccda','#c893af'],['fabric-dark','#c78faa','#9f6687'],
        ['sage','#d0dec9','#8fa994'],['linen','#fff2d6','#cfb991'],['metal','#edf0e8','#9faeaa'],['metal-dark','#a1ada5','#5d706b'],
        ['ceramic','#fffcf0','#d3cbb7'],['terracotta','#e4b293','#b9785a'],['leaf','#b7cdaa',p.potPlant],
      ].map(([name,a,b]) => <linearGradient key={name} id={`${id}-${name}`} x1="0" y1="0" x2="1" y2=".75"><stop stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient>)}
      <radialGradient id={`${id}-shadow`}><stop stopColor="#4f4238" stopOpacity=".23" /><stop offset="1" stopColor="#4f4238" stopOpacity="0" /></radialGradient>
      <radialGradient id={`${id}-glow`}><stop stopColor={p.lampGlow} stopOpacity=".38" /><stop offset="1" stopColor={p.lampGlow} stopOpacity="0" /></radialGradient>
      <pattern id={`${id}-grain`} width="35" height="13" patternUnits="userSpaceOnUse"><path d="M0 4Q9 1 19 4T35 4M5 9Q18 7  30 9" fill="none" stroke="#886044" strokeWidth=".5" opacity=".25" /></pattern>
    </defs>
    {art}
  </svg>;
}

const kinds = ['sofa','chair','coffeeTable','garland','clock','portrait','heartframe','shelf','plant','lamp','rug','cabinet','counter','fridge','bistroTable'];
export const FURNITURE_SVG: Record<string, FC<{ p: Palette }>> = Object.fromEntries(kinds.map(kind => [kind, function ItemArt({p}: {p: Palette}) { return <FurnitureArt kind={kind} p={p} />; }]));
