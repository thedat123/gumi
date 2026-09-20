import { Link, Navigate } from 'react-router-dom';
import { api } from '../api';
import { Banner } from '../components/Banner';
import { Card } from '../components/Card';
import { Gumi } from '../components/Gumi';
import { AsyncView } from '../components/AsyncView';
import { vi } from '../content/vi';
import { useAsync } from '../app/useAsync';
import { useSession } from '../app/session';

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
          <div className="pt-2 lg:grid lg:grid-cols-2 lg:items-center lg:gap-10 lg:pt-6">
            {/* Cột trái: hero + CTA */}
            <section className="grad-brand flex flex-col items-center gap-3 rounded-card p-6 text-center text-on-primary shadow-pop lg:p-10">
              <Gumi state={ended ? 'tien_hoa' : 'bo_pho'} size={168} interactive />
              <span className="rounded-pill bg-white/25 px-3 py-1 text-caption font-semibold">{vi.landing.kicker}</span>
              <h1 className="text-headline font-bold leading-tight lg:text-4xl">{vi.landing.title}</h1>
              <p className="text-small opacity-95 lg:text-body">{vi.landing.subtitle}</p>
              <div className="mt-2 flex w-full flex-col gap-2">
                {!ended && (
                  <Link to="/signup" className="inline-flex min-h-11 items-center justify-center rounded-control bg-white px-5 text-body font-bold text-primary shadow-soft transition-transform active:scale-95">
                    {vi.landing.ctaPrimary}
                  </Link>
                )}
                <Link to="/login" className="inline-flex min-h-11 items-center justify-center rounded-control border-2 border-white/60 px-5 text-body font-semibold text-on-primary">
                  {vi.landing.ctaSecondary}
                </Link>
              </div>
            </section>

            {/* Cột phải: trạng thái + số liệu + điểm hấp dẫn */}
            <div className="mt-5 flex flex-col gap-4 lg:mt-0">
              {c.phase === 'before' && <Banner kind="info">{vi.landing.before('01/10')}</Banner>}
              {c.phase === 'running' && <Banner kind="success">{vi.landing.running(c.day)}</Banner>}
              {ended && <Banner kind="info">{vi.landing.ended}</Banner>}

              <div className="grid grid-cols-3 gap-2 text-center">
                <Card className="border-pink! bg-pink/15 p-3!"><p className="text-title font-bold text-primary">{vi.landing.stats.days}</p></Card>
                <Card className="border-accent! bg-accent/15 p-3!"><p className="text-title font-bold text-primary">{vi.landing.stats.missions}</p></Card>
                <Card className="border-info! bg-info/12 p-3!"><p className="text-title font-bold text-info">{vi.landing.stats.players}</p></Card>
              </div>

              <ul className="flex flex-col gap-2">
                {vi.landing.bullets.map((b, i) => (
                  <li key={b.text}>
                    <Card className="flex items-center gap-3 p-3!">
                      <span aria-hidden="true" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-title ${['bg-accent/20', 'bg-pink/25', 'bg-info/15'][i % 3]}`}>{b.icon}</span>
                      <span className="text-small">{b.text}</span>
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
