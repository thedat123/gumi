import './streak-flame.css';

/** A layered flame for streak counters and the active day. */
export function StreakFlame({ size = 20 }: { size?: number }) {
  return (
    <svg className="streak-flame" width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false">
      <path className="streak-flame-ember streak-flame-ember-left" d="M4.5 14.5c-1-1.3-1.1-2.5-.3-4.2 1.3 1.1 2 2.3 2.1 3.8z" fill="#FF9B16" />
      <path className="streak-flame-ember streak-flame-ember-right" d="M26.5 9.1c.7-1.6 1.8-2.5 3.4-3 .1 2-.5 3.4-2 4.5z" fill="#FFB321" />
      <path className="streak-flame-body" d="M16.1 2.1c2.1 5.6-.7 7.2.1 10.4 1.6-1 2.8-3.4 2.9-5.6 6.4 5.9 9.1 11.3 7.4 16.7C24.5 28 21 30 16 30 9 30 4.4 26 4.4 19.6c0-4.4 2.6-8 5.2-10.8.2 3 1.3 4.6 2.5 5.3.1-5 2.5-8.4 4-12z" fill="#F4511E" stroke="#B82A17" strokeWidth="1.2" strokeLinejoin="round" />
      <path className="streak-flame-middle" d="M17.4 10.1c.7 4.1 4.1 5.4 4.1 10.1 0 4.4-2.6 7.1-6.2 7.1-4.5 0-7-3-7-7.3 0-3 1.3-5 3.2-7.2.1 2.5.7 3.7 1.8 4.3.4-3.2 2.6-5.5 4.1-7z" fill="#FF9C16" />
      <path className="streak-flame-core" d="M16.4 17.3c.1 2 2 3.4 2 5.4 0 2.4-1.3 4-3.4 4-2.4 0-3.6-1.7-3.6-3.9 0-1.6.7-3 2-4.2.1 1.2.5 1.9 1 2.3.2-1.3.9-2.5 2-3.6z" fill="#FFF2A4" />
      <path d="M10.2 10.9c-1.1 1.3-1.9 2.5-2.2 3.8" stroke="#FFD76D" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
