import { useEffect, useRef, useState, type ReactNode } from 'react';
import { vi } from '../content/vi';

// Hướng dẫn cài app dạng VIDEO, 2 tab: iPhone (Safari) & Android (Chrome).
// - Có mp4 thật? Thả vào public/guides/ rồi gán GUIDE_VIDEO[...] → tự phát thay animation.
// - Chưa có: mô phỏng thao tác điện thoại, tự chạy lặp như clip; thanh tiến trình + ripple chạm;
//   nét ở mọi màn hình, tôn trọng prefers-reduced-motion.
const GUIDE_VIDEO: Record<Platform, string | null> = {
  ios: null,     // ví dụ: '/guides/add-to-home-ios.mp4'
  android: null, // ví dụ: '/guides/install-android.mp4'
};

type Platform = 'ios' | 'android';
const STEP_MS = 2800;
const STEPS = 3;

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'ios';
  if (/android/i.test(navigator.userAgent)) return 'android';
  return 'ios';
}

export function InstallGuide() {
  const [tab, setTab] = useState<Platform>(detectPlatform());

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Tab chuyển nền tảng */}
      <div className="inline-flex rounded-pill bg-border/40 p-1" role="tablist" aria-label="Chọn loại điện thoại">
        {(['ios', 'android'] as const).map((p) => (
          <button
            key={p} type="button" role="tab" aria-selected={tab === p} onClick={() => setTab(p)}
            className={`flex items-center gap-1.5 rounded-pill px-4 py-1.5 text-caption font-bold transition-all ${tab === p ? 'bg-surface text-primary shadow-soft' : 'text-muted'}`}
          >
            {p === 'ios' ? <AppleGlyph /> : <AndroidGlyph />}
            {p === 'ios' ? vi.pwa.tabIos : vi.pwa.tabAndroid}
          </button>
        ))}
      </div>

      {GUIDE_VIDEO[tab] ? (
        <video key={tab} className="w-full max-w-[200px] rounded-[1.8rem] border border-border shadow-soft" src={GUIDE_VIDEO[tab]!} autoPlay loop muted playsInline controls aria-label="Video hướng dẫn cài app" />
      ) : (
        <Walkthrough key={tab} platform={tab} />
      )}
    </div>
  );
}

/** Một walkthrough 3 cảnh cho một nền tảng — tự chạy + thanh tiến trình + chấm điều hướng. */
function Walkthrough({ platform }: { platform: Platform }) {
  const steps = platform === 'ios' ? vi.pwa.iosSteps : vi.pwa.androidSteps;
  const note = platform === 'ios' ? vi.pwa.iosNote : vi.pwa.androidNote;
  const [step, setStep] = useState(0);
  const reduce = useRef(false);

  useEffect(() => {
    reduce.current = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (reduce.current) return;
    const id = window.setInterval(() => setStep((s) => (s + 1) % STEPS), STEP_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="px-2 text-center text-caption text-muted">{note}</p>
      <Phone platform={platform} step={step} />

      {/* Thanh tiến trình chạy theo mỗi cảnh (như thanh tua video) */}
      <div className="h-1 w-[180px] overflow-hidden rounded-full bg-border/50">
        {!reduce.current && (
          <span key={step} className="block h-full rounded-full bg-primary" style={{ transformOrigin: 'left', animation: `ig-progress ${STEP_MS}ms linear forwards` }} />
        )}
      </div>

      <p className="min-h-[2.75rem] px-2 text-center text-small font-medium text-text">
        <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-caption font-bold text-on-primary align-[-2px]">{step + 1}</span>
        {steps[step]}
      </p>

      <div className="flex gap-1.5" role="tablist" aria-label="Các bước">
        {Array.from({ length: STEPS }).map((_, i) => (
          <button key={i} type="button" role="tab" aria-selected={i === step} aria-label={`Bước ${i + 1}`} onClick={() => setStep(i)}
            className={`h-2 rounded-full transition-all ${i === step ? 'w-5 bg-primary' : 'w-2 bg-border-strong/40'}`} />
        ))}
      </div>
    </div>
  );
}

/** Khung điện thoại (notch iOS / lỗ camera Android) + lớp bóng kính, nội dung đổi theo step. */
function Phone({ platform, step }: { platform: Platform; step: number }) {
  return (
    <div className="relative mx-auto h-[310px] w-[178px] rounded-[2.1rem] border-[6px] border-text/85 bg-black shadow-pop">
      {platform === 'ios'
        ? <div className="absolute left-1/2 top-0 z-30 h-4 w-20 -translate-x-1/2 rounded-b-xl bg-text/85" />
        : <div className="absolute left-1/2 top-1.5 z-30 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-text/85 ring-1 ring-white/20" />}

      <div className="relative h-full w-full overflow-hidden rounded-[1.6rem] bg-[#F3F4F6]">
        {platform === 'ios' ? <IosScenes step={step} /> : <AndroidScenes step={step} />}
        {/* bóng kính chéo cho cảm giác màn hình thật */}
        <div className="pointer-events-none absolute inset-0 z-40 rounded-[1.6rem] bg-gradient-to-br from-white/15 via-transparent to-transparent" />
      </div>
    </div>
  );
}

/* ======================= iOS (Safari) ======================= */
function IosScenes({ step }: { step: number }) {
  return (
    <>
      <div className={`absolute inset-0 flex flex-col transition-opacity duration-500 ${step <= 1 ? 'opacity-100' : 'opacity-0'}`}>
        <div className="mt-6 flex justify-center px-3">
          <div className="flex w-full items-center justify-center gap-1 rounded-lg bg-white px-2 py-1 text-[9px] text-gray-500 shadow-sm"><LockIcon /> leveldown.app</div>
        </div>
        <PageHero />
        {/* thanh công cụ Safari dưới */}
        <div className="relative flex items-center justify-around border-t border-gray-200 bg-[#F8F8F8] px-3 py-2.5">
          <ChevronGlyph flip /><ChevronGlyph />
          <Target active={step === 0}><ShareGlyph /></Target>
          <BookGlyph /><TabsGlyph />
        </div>
      </div>

      {/* Bước 2: bảng Chia sẻ trượt lên */}
      <Sheet open={step === 1} from="bottom">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-gray-300" />
        <div className="flex items-center gap-2 px-3 py-2">
          <img src="/icons/icon-192.png" alt="" className="h-8 w-8 rounded-lg" />
          <div className="text-left"><p className="text-[10px] font-bold text-gray-800">Level Down</p><p className="text-[8px] text-gray-400">leveldown.app</p></div>
        </div>
        <div className="flex flex-col gap-1 px-2.5 pb-3">
          <Row label="Sao chép" glyph="⧉" />
          <Row label="Thêm vào Màn hình chính" glyph="＋" highlight tap={step === 1} />
          <Row label="Thêm Bookmark" glyph="☆" dim />
        </div>
      </Sheet>

      <Home open={step === 2} wallpaper="from-[#8FB6E8] via-[#B9A7E0] to-[#E7B6CE]" />
    </>
  );
}

/* ======================= Android (Chrome) ======================= */
function AndroidScenes({ step }: { step: number }) {
  return (
    <>
      <div className={`absolute inset-0 flex flex-col transition-opacity duration-500 ${step <= 1 ? 'opacity-100' : 'opacity-0'}`}>
        {/* thanh Chrome trên: URL + menu ⋮ */}
        <div className="flex items-center gap-1.5 bg-white px-2.5 pb-1.5 pt-6 shadow-sm">
          <div className="flex flex-1 items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-[9px] text-gray-500"><LockIcon /> leveldown.app</div>
          <Target active={step === 0} round><DotsGlyph /></Target>
        </div>
        <PageHero />
      </div>

      {/* Bước 2: menu Chrome đổ xuống từ góc phải trên */}
      <div className={`absolute right-2 top-9 z-20 w-[122px] origin-top-right rounded-xl bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.22)] transition-all duration-300 ${step === 1 ? 'scale-100 opacity-100' : 'pointer-events-none scale-75 opacity-0'}`}>
        <MenuRow label="Tab mới" dim />
        <MenuRow label="Dấu trang" dim />
        <MenuRow label="Cài đặt ứng dụng" glyph="⤓" highlight tap={step === 1} />
        <MenuRow label="Cài đặt" dim />
      </div>

      <Home open={step === 2} wallpaper="from-[#2D6AE3] via-[#5AA0F2] to-[#7FE3D1]" badge />
    </>
  );
}

/* ======================= Mảnh dùng chung ======================= */
function PageHero() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2">
      <img src="/icons/icon-192.png" alt="" className="h-14 w-14 rounded-2xl shadow-soft" />
      <span className="text-[11px] font-extrabold text-gray-700">Level Down</span>
      <span className="text-[8px] text-gray-400">21 ngày bớt ngọt cùng Gumi</span>
    </div>
  );
}

/** Mục tiêu chạm: vòng ripple lan + chấm chạm nảy. */
function Target({ active, round, children }: { active: boolean; round?: boolean; children: ReactNode }) {
  return (
    <div className="relative">
      {active && <span className="absolute -inset-1.5 animate-ping rounded-full bg-primary/40" aria-hidden="true" />}
      <div className={`relative p-1 transition-all ${active ? (round ? 'rounded-full ring-2 ring-primary' : 'rounded-md ring-2 ring-primary') : ''}`}>{children}</div>
      {active && <TouchDot />}
    </div>
  );
}
function TouchDot() {
  return <span className="pointer-events-none absolute left-1/2 top-1/2 z-30 h-6 w-6 rounded-full bg-white/60 ring-2 ring-primary animate-tap" aria-hidden="true" />;
}

function Sheet({ open, children }: { open: boolean; from: 'bottom'; children: ReactNode }) {
  return (
    <div className={`absolute inset-x-0 bottom-0 z-20 rounded-t-2xl bg-white shadow-[0_-10px_28px_rgba(0,0,0,0.2)] transition-transform duration-500 ${open ? 'translate-y-0' : 'translate-y-full'}`}>{children}</div>
  );
}

function Row({ label, glyph, highlight, dim, tap }: { label: string; glyph: string; highlight?: boolean; dim?: boolean; tap?: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-[10px] transition-all ${highlight ? 'bg-primary/12 font-bold text-primary ring-1 ring-primary/40' : dim ? 'text-gray-400' : 'text-gray-700'}`}>
      <span>{label}</span>
      <span className={`relative flex h-5 w-5 items-center justify-center rounded-md text-xs ${highlight ? 'bg-primary text-on-primary' : 'bg-gray-100 text-gray-500'}`}>{glyph}{tap && <TouchDot />}</span>
    </div>
  );
}

function MenuRow({ label, glyph, highlight, dim, tap }: { label: string; glyph?: string; highlight?: boolean; dim?: boolean; tap?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-3 py-1.5 text-[9.5px] transition-all ${highlight ? 'bg-primary/12 font-bold text-primary' : dim ? 'text-gray-400' : 'text-gray-700'}`}>
      <span>{label}</span>
      <span className="relative text-xs">{glyph}{tap && <TouchDot />}</span>
    </div>
  );
}

/** Màn hình chính: wallpaper + lưới app; icon Level Down nảy vào kèm lấp lánh. */
function Home({ open, wallpaper, badge }: { open: boolean; wallpaper: string; badge?: boolean }) {
  return (
    <div className={`absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 bg-gradient-to-b ${wallpaper} transition-opacity duration-500 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
      <div className="grid grid-cols-4 gap-x-3 gap-y-3">
        {Array.from({ length: 11 }).map((_, i) => <div key={i} className="h-8 w-8 rounded-xl bg-white/35" />)}
        <div className="relative">
          <img src="/icons/icon-192.png" alt="" className={`h-8 w-8 rounded-xl shadow-soft ring-2 ring-white/70 ${open ? 'animate-pop-in' : ''}`} />
          {open && <Sparkles />}
        </div>
      </div>
      <div className="flex flex-col items-center">
        <div className="relative">
          <img src="/icons/icon-192.png" alt="" className={`h-12 w-12 rounded-2xl shadow-pop ${open ? 'animate-pop-in' : ''}`} />
          {badge && <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-success text-[8px] font-black text-white shadow-soft">✓</span>}
        </div>
        <span className="mt-1.5 rounded bg-black/25 px-1.5 py-0.5 text-[9px] font-semibold text-white">Level Down</span>
      </div>
    </div>
  );
}
function Sparkles() {
  return (
    <>
      {[[-6, -4, 0], [10, -2, 0.15], [2, 12, 0.3]].map(([x, y, d], i) => (
        <span key={i} className="pointer-events-none absolute text-[10px] ig-sparkle" style={{ left: `${50 + (x as number) * 4}%`, top: `${50 + (y as number) * 4}%`, animationDelay: `${d}s` }} aria-hidden="true">✦</span>
      ))}
    </>
  );
}

/* ======================= Glyph ======================= */
function ShareGlyph() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12" /><path d="m8 7 4-4 4 4" /><path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" /></svg>; }
function DotsGlyph() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="#4B5563" aria-hidden="true"><circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" /></svg>; }
function ChevronGlyph({ flip }: { flip?: boolean }) { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={flip ? undefined : { transform: 'scaleX(-1)' }}><path d="m15 18-6-6 6-6" /></svg>; }
function BookGlyph() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" aria-hidden="true"><path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z" /></svg>; }
function TabsGlyph() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" aria-hidden="true"><rect x="4" y="4" width="12" height="12" rx="2" /><rect x="8" y="8" width="12" height="12" rx="2" /></svg>; }
function LockIcon() { return <svg width="8" height="8" viewBox="0 0 24 24" fill="#9CA3AF" aria-hidden="true"><path d="M6 10V7a6 6 0 1 1 12 0v3h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zm2 0h8V7a4 4 0 1 0-8 0z" /></svg>; }
function AppleGlyph() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.3 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9s-1.8-.8-3-.8c-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2-.05 1.6-.75 3-.75s1.8.75 3 .72c1.2-.02 2-1.1 2.8-2.2.9-1.3 1.2-2.5 1.3-2.6-.03-.01-2.4-.9-2.2-3.7zM14.1 5.8c.6-.8 1.1-1.9.95-3-.95.04-2.1.65-2.8 1.44-.6.7-1.1 1.8-1 2.85 1.05.08 2.15-.5 2.85-1.29z" /></svg>; }
function AndroidGlyph() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 9v7a1 1 0 0 0 1 1h1v3a1 1 0 1 0 2 0v-3h4v3a1 1 0 1 0 2 0v-3h1a1 1 0 0 0 1-1V9zM4 9a1 1 0 0 0-1 1v5a1 1 0 1 0 2 0v-5a1 1 0 0 0-1-1zm16 0a1 1 0 0 0-1 1v5a1 1 0 1 0 2 0v-5a1 1 0 0 0-1-1zM15.5 4.3l1-1.6a.3.3 0 1 0-.5-.3l-1 1.7A6.3 6.3 0 0 0 12 3.6c-1.1 0-2 .2-2.9.6l-1-1.7a.3.3 0 1 0-.5.3l.9 1.6A5.3 5.3 0 0 0 6 8.2h12a5.3 5.3 0 0 0-2.5-3.9zM9.5 6.6a.6.6 0 1 1 0-1.2.6.6 0 0 1 0 1.2zm5 0a.6.6 0 1 1 0-1.2.6.6 0 0 1 0 1.2z" /></svg>; }
