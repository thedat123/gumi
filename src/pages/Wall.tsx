import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { AsyncView } from '../components/AsyncView';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { GameShell } from '../components/GameShell';
import { CompletionPanel } from '../components/CompletionPanel';
import { Icon } from '../components/Icon';
import { vi } from '../content/vi';
import { playSfx } from '../lib/sfx';
import { useAsync } from '../app/useAsync';
import { messageFor } from '../lib/errors';

/** S10 — Day 21: lời nhắn tốt nghiệp + bức tường cộng đồng. */
export function Wall() {
  const posts = useAsync(() => api.getWallPosts(), []);
  const [text, setText] = useState('');
  const [touched, setTouched] = useState(false);
  const [posted, setPosted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [storyProof, setStoryProof] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ok = text.trim().length >= 10;

  const submit = async () => {
    setTouched(true);
    if (!ok) return;
    setBusy(true);
    try { await api.submitWallPost(text.trim(), storyProof ?? undefined); playSfx('win'); setPosted(true); posts.reload(); }
    catch (cause) { setError(messageFor(cause)); }
    finally { setBusy(false); }
  };

  if (posted) {
    return <CompletionPanel day={21} points={storyProof ? 25 : 15} note={vi.wall.postedSub}
      action={<Link to="/summary" className="inline-flex min-h-12 w-full items-center justify-center rounded-control bg-primary px-5 font-bold text-on-primary shadow-pop">{vi.wall.viewCard}</Link>} />;
  }

  return (
    <GameShell act={3} title={vi.wall.title} intro={vi.wall.formPrompt}>
      <div className="flex flex-col gap-3">
        <Card className="flex flex-col gap-2">
          <div className="rounded-control bg-primary/8 p-3 text-left">
            <p className="text-xs font-black uppercase tracking-widest text-primary">BƯỚC CUỐI · +15 ĐIỂM</p>
            <p className="mt-1 text-small font-semibold">{vi.wall.formPrompt}</p>
          </div>
          <label htmlFor="wall-msg" className="sr-only">{vi.wall.formPrompt}</label>
          <textarea id="wall-msg" value={text} maxLength={200} rows={4} placeholder={vi.wall.placeholder}
            onChange={(e) => setText(e.target.value)}
            className="min-h-24 rounded-control border-2 border-border-strong/50 bg-surface p-3 text-body focus:border-primary" />
          <div className="flex items-center justify-between text-caption text-muted">
            <span>{vi.wall.hint}</span><span>{text.trim().length}/200</span>
          </div>
          {touched && !ok && <p className="flex items-center gap-1 text-caption text-danger"><Icon name="x" size={13} strokeWidth={2.4} /> {vi.wall.tooShort}</p>}
          <label className="flex cursor-pointer items-center gap-3 rounded-control border-2 border-dashed border-accent/50 bg-accent/8 p-3 text-left transition-colors hover:bg-accent/15">
            <Icon name="camera" size={22} className="shrink-0 text-accent" />
            <span className="min-w-0 flex-1"><strong className="block text-small">Ảnh chụp Story · +10 điểm</strong><span className="block truncate text-caption text-muted">{storyProof?.name ?? 'Tuỳ chọn: tải ảnh minh chứng đã chia sẻ'}</span></span>
            <input type="file" accept="image/*" className="sr-only" onChange={(event) => setStoryProof(event.target.files?.[0] ?? null)} />
          </label>
          {error && <Banner kind="error">{error}</Banner>}
          <Button onClick={submit} loading={busy} block>{vi.wall.submit}</Button>
        </Card>

        <h2 className="mt-1 flex items-center gap-1.5 text-title font-bold"><Icon name="sparkle" size={18} filled className="text-accent" />{vi.wall.wallTitle}</h2>
        <AsyncView state={posts} empty={<Banner kind="info">{vi.wall.empty}</Banner>}>
          {(list) =>
            list.length === 0 ? (
              <Banner kind="info">{vi.wall.empty}</Banner>
            ) : (
              <ul className="flex flex-col gap-2">
                {list.map((pp) => (
                  <li key={pp.id}>
                    <Card className="flex flex-col gap-1 bg-surface/95 backdrop-blur">
                      <span className="text-small font-bold text-primary">{pp.name}</span>
                      <span className="text-small text-muted">{pp.text}</span>
                    </Card>
                  </li>
                ))}
              </ul>
            )
          }
        </AsyncView>
      </div>
    </GameShell>
  );
}
