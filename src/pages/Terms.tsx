import { Link } from 'react-router-dom';
import { Banner } from '../components/Banner';
import { Card } from '../components/Card';
import { vi } from '../content/vi';

/** S15 — Điều khoản và đồng ý xử lý ảnh (bản đầy đủ + lưu ý ảnh có mặt bạn bè ở Day 8). */
export function Terms() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 pt-2">
      <h1 className="text-headline font-bold">{vi.terms.title}</h1>
      <Banner kind="info">{vi.terms.consentAtSignup}</Banner>
      {vi.terms.sections.map((s) => (
        <Card key={s.h} className="flex flex-col gap-1">
          <h2 className="text-title font-bold">{s.h}</h2>
          <p className="text-small text-muted">{s.p}</p>
        </Card>
      ))}
      <Banner kind="info">{vi.terms.friendFaceNotice}</Banner>
      <Link to="/signup" className="inline-flex min-h-11 items-center justify-center rounded-control border-2 border-border-strong bg-surface px-5 font-semibold">{vi.terms.back}</Link>
    </div>
  );
}
