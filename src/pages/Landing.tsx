import { Link, Navigate } from 'react-router-dom';
import { api } from '../api';
import { Banner } from '../components/Banner';
import { Card } from '../components/Card';
import { Gumi } from '../components/Gumi';
import { Icon, type IconName } from '../components/Icon';
import { AsyncView } from '../components/AsyncView';
import { vi } from '../content/vi';
import { useAsync } from '../app/useAsync';
import { useSession } from '../app/session';

const STATS: { icon: IconName; value: string; tint: string }[] = [
  { icon: 'star', value: vi.landing.stats.days, tint: 'text-primary' },
  { icon: 'map', value: vi.landing.stats.missions, tint: 'text-accent' },
  { icon: 'trophy', value: vi.landing.stats.players, tint: 'text-info' },
];

/** S01 — Trang giới thiệu công khai (trước đăng nhập). Đã đăng nhập thì về hành trình. */
export function Landing() {
  const { session, loading } = useSession();
  const state = useAsync(() => api.getCampaignState(), []);
  if (!loading && session) return <Navigate to="/" replace />;

  return (
    <AsyncView state={state}>
      {(c) => {
        const ended = c.phase === 'ended';
        return (
          <div className="pt-2 lg:grid lg:grid-cols-[1.05fr_1fr] lg:items-stretch lg:gap-8 lg:pt-8">
            {/* Cột trái: hero + CTA */}
            <section className="grad-brand relative flex flex-col items-center gap-4 overflow-hidden rounded-card p-7 text-center text-on-primary shadow-pop lg:p-9">
              <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10" />
              <span aria-hidden="true" className="pointer-events-none absolute -bottom-20 -left-16 h-52 w-52 rounded-full bg-black/5" />
              <span className="rounded-pill bg-white/20 px-3.5 py-1 text-caption font-semibold tracking-wide ring-1 ring-white/25">{vi.landing.kicker}</span>
              <Gumi state={ended ? 'tien_hoa' : 'bo_pho'} size={172} interactive />
              <h1 className="text-headline font-bold leading-tight lg:text-4xl">{vi.landing.title}</h1>
              <p className="max-w-sm text-small leading-relaxed opacity-95 lg:text-body">{vi.landing.subtitle}</p>
              <div className="mt-auto flex w-full flex-col gap-2.5 pt-2">
                {!ended && (
                  <Link to="/signup" className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-control bg-surface px-5 text-body font-bold text-primary shadow-soft transition-all hover:brightness-[0.98] active:scale-[0.98]">
                    {vi.landing.ctaPrimary}
                    <Icon name="arrow-right" size={18} className="transition-transform group-hover:translate-x-0.5" />
                  </Link>
                )}
                <Link to="/login" className="inline-flex min-h-12 items-center justify-center rounded-control border border-white/45 px-5 text-body font-semibold text-on-primary transition-colors hover:bg-white/10">
                  {vi.landing.ctaSecondary}
                </Link>
              </div>
            </section>

            {/* Cột phải: trạng thái + số liệu + điểm hấp dẫn */}
            <div className="mt-4 flex flex-col gap-3.5 lg:mt-0">
              {c.phase === 'before' && <Banner kind="info">{vi.landing.before('01/10')}</Banner>}
              {c.phase === 'running' && <Banner kind="success">{vi.landing.running(c.day)}</Banner>}
              {ended && <Banner kind="info">{vi.landing.ended}</Banner>}

              <div className="grid grid-cols-3 gap-3">
                {STATS.map((s) => (
                  <Card key={s.value} className="flex flex-col items-center gap-1.5 p-3! text-center">
                    <Icon name={s.icon} size={22} filled className={s.tint} />
                    <p className="text-small font-bold leading-tight text-text">{s.value}</p>
                  </Card>
                ))}
              </div>

              <ul className="flex flex-1 flex-col gap-3">
                {vi.landing.bullets.map((b, i) => (
                  <li key={b.text} className="flex-1">
                    <Card className="flex h-full items-center gap-3.5 p-4!">
                      <span aria-hidden="true" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-control ${['bg-primary/10 text-primary', 'bg-accent/15 text-accent', 'bg-info/12 text-info'][i % 3]}`}>
                        <Icon name={b.icon as IconName} size={22} />
                      </span>
                      <span className="text-small leading-relaxed">{b.text}</span>
                    </Card>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
      }}
    </AsyncView>
  );
}
