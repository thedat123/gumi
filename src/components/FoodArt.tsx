import { useId } from 'react';

/** Small illustrated food assets with consistent lighting across platforms. */
export function FoodArt({ kind }: { kind: string }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const paint = (name: string) => `url(#${id}-${name})`;
  return <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className="food-art">
    <defs>
      <linearGradient id={`${id}-apple`} x1="18" y1="18" x2="45" y2="56" gradientUnits="userSpaceOnUse"><stop stopColor="#ff8670" /><stop offset=".45" stopColor="#e74746" /><stop offset="1" stopColor="#ac253b" /></linearGradient>
      <linearGradient id={`${id}-leaf`} x1="25" y1="8" x2="45" y2="24" gradientUnits="userSpaceOnUse"><stop stopColor="#96c875" /><stop offset="1" stopColor="#397855" /></linearGradient>
      <linearGradient id={`${id}-salmon`} x2=".8" y2="1"><stop stopColor="#ffab83" /><stop offset="1" stopColor="#ee705c" /></linearGradient>
      <linearGradient id={`${id}-milk`} x2="1" y2=".3"><stop stopColor="#fffdf1" /><stop offset=".55" stopColor="#fff" /><stop offset="1" stopColor="#c4d9dc" /></linearGradient>
      <linearGradient id={`${id}-cookie`} x2=".7" y2="1"><stop stopColor="#f7cf8c" /><stop offset="1" stopColor="#c99051" /></linearGradient>
      <linearGradient id={`${id}-carrot`} x2="1" y2="1"><stop stopColor="#ffbe61" /><stop offset=".5" stopColor="#f28a35" /><stop offset="1" stopColor="#d65c28" /></linearGradient>
      <linearGradient id={`${id}-fish`} x2=".6" y2="1"><stop stopColor="#a8dbe6" /><stop offset=".5" stopColor="#72b4d1" /><stop offset="1" stopColor="#437d9f" /></linearGradient>
    </defs>
    <ellipse cx="32" cy="55" rx="19" ry="3" fill="#6c4930" opacity=".12" />
    {kind === 'apple' && <>
      <path d="M32 21C21 12 10 23 12 36c2 15 12 21 20 17 8 4 18-2 20-17 2-13-9-24-20-15Z" fill={paint('apple')} stroke="#b43440" strokeWidth="1.2" />
      <path d="M32 22q-3-9 1-14" stroke="#79513c" strokeWidth="3" strokeLinecap="round" /><path d="M33 17Q34 6 46 9q-2 11-13 8Z" fill={paint('leaf')} /><path d="M22 24q-7 4-6 12" stroke="#ffd0ae" strokeWidth="3" strokeLinecap="round" opacity=".75" /><path d="M29 48q4 2 8 0" stroke="#9e2b3c" strokeWidth="1.5" strokeLinecap="round" opacity=".5" />
    </>}
    {kind === 'sushi' && <>
      <path d="M10 36q21-13 44 0v9q-22 16-44 0Z" fill="#eee7d4" stroke="#d1c9b5" /><ellipse cx="32" cy="36" rx="22" ry="11" fill="#fffef5" />
      <path d="M9 33q4-15 21-17 18-2 26 13l-2 10q-24-11-44 2Z" fill={paint('salmon')} stroke="#d9715c" strokeWidth="1" />
      <path d="M19 22q2 9 10 14M29 18q1 8 11 16M40 20q1 6 11 12" stroke="#ffe0ba" strokeWidth="2.2" strokeLinecap="round" /><path d="M14 44l3 2m7-3 2 2m9-1 2 2m9-4 2 1" stroke="#d9d7c8" strokeWidth="1.4" strokeLinecap="round" />
    </>}
    {kind === 'milk' && <>
      <path d="M17 13h30l-4 38q-11 7-22 0Z" fill="#dceef1" fillOpacity=".7" stroke="#87a6b1" strokeWidth="1.2" /><path d="M20 25q12 4 24 0l-3 24q-9 5-18 0Z" fill={paint('milk')} /><ellipse cx="32" cy="25" rx="12" ry="3" fill="#fffdf5" /><ellipse cx="32" cy="13" rx="15" ry="4" fill="#f2faf8" stroke="#90abb2" strokeWidth="1.1" /><ellipse cx="32" cy="13" rx="11" ry="2" fill="#d4e6e7" /><path d="m21 19 2 22" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".9" /><path d="M25 51q8 3 14 0" stroke="#a9c1c6" strokeLinecap="round" />
    </>}
    {kind === 'cookie' && <>
      <path d="M34 10q8 1 14 8l3 9 1 10-6 11-10 6-12-2-10-7-4-11 3-12 8-9Z" fill="#aa713f" /><path d="M33 8q8 1 14 8l3 9 1 10-6 11-10 6-12-2-10-7-4-11 3-12 8-9Z" fill={paint('cookie')} stroke="#c28f53" />
      {[[23,19],[39,17],[18,33],[34,30],[43,39],[28,44]].map(([x,y],i)=><g key={i} transform={`translate(${x} ${y}) rotate(${i*29})`}><rect x="-2.5" y="-2.5" width="5" height="5" rx="1.4" fill="#744a37" /><path d="M-1-1h2" stroke="#a2724b" strokeWidth="1" /></g>)}
      <path d="M16 23l2-2m10 13 1-1m9 12h1M27 13h1" stroke="#b58347" strokeWidth="1.5" strokeLinecap="round" />
    </>}
    {kind === 'carrot' && <>
      <path d="M38 23Q31 9 37 8q5 0 5 14Q44 7 49 9q6 3-5 15Q55 14 57 20q1 5-14 8Z" fill={paint('leaf')} stroke="#4c8b55" strokeLinejoin="round" />
      <path d="M43 22q10 4 3 13Q31 50 13 56q5-20 19-32 6-5 11-2Z" fill={paint('carrot')} stroke="#d57634" strokeWidth="1.1" /><path d="m33 27 5 3m-13 5 5 3m-13 5 4 2m16-7 4 3" stroke="#c66b2b" strokeWidth="1.3" strokeLinecap="round" /><path d="M18 48q6-12 15-19" stroke="#ffd69a" strokeWidth="1.7" strokeLinecap="round" opacity=".65" />
    </>}
    {kind === 'fish' && <>
      <path d="M19 31 7 21v24l12-9" fill="#6f9fbe" stroke="#456e91" strokeWidth="1.1" strokeLinejoin="round" /><path d="m29 22 7-9 8 12M30 42l8 8 6-11" fill="#578eb0" stroke="#456e91" strokeWidth="1" />
      <path d="M16 33q16-24 38 0-21 23-38 0Z" fill={paint('fish')} stroke="#456e91" strokeWidth="1.2" /><path d="M41 23q-5 10 0 20" stroke="#578ca9" strokeWidth="1.2" /><circle cx="46" cy="31" r="2" fill="#253f53" /><circle cx="46.5" cy="30.5" r=".65" fill="#fff" /><path d="M25 31q5 2 7 6l-9-1Z" fill="#d7edf0" stroke="#6c9db5" strokeWidth=".8" /><path d="M24 27q7-5 13-2" stroke="#dcf3ee" strokeWidth="1.6" strokeLinecap="round" />
    </>}
  </svg>;
}
