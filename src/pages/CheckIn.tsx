import { useState, type ChangeEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ChapterTease } from '../components/ChapterTease';
import { GameShell } from '../components/GameShell';
import { Gumi } from '../components/Gumi';
import { Icon } from '../components/Icon';
import { actOfDay } from '../lib/scoring';
import { playSfx } from '../lib/sfx';
import { vi } from '../content/vi';
import { errorCode, messageFor } from '../lib/errors';
import type { VisionResult } from '../lib/vision';
import type { VlmResult } from '../lib/vlm';
import type { SugarLevel } from '../lib/sugar';

const LEVELS: SugarLevel[] = [70, 50, 30, 0];
const LEVEL_DAYS = [1, 5, 15, 20]; // ngày DRINK có chọn mức đường

type Ocr = 'idle' | 'reading' | 'ok' | 'fail' | 'unavailable';

/** S06 — Nhiệm vụ có ảnh: ngày DRINK cần tem ly nước (AI kiểm) + chọn mức đường; ngày SHARE chỉ ảnh. */
export function CheckIn() {
  const { day: dayParam } = useParams();
  const day = Number(dayParam) || 1;
  const m = vi.missions[day - 1];
  const needsStamp = m?.kind === 'DRINK'; // ngày uống → bắt buộc thấy tem ly nước
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [level, setLevel] = useState<SugarLevel>(70);
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [retryable, setRetryable] = useState(false);
  const [ocr, setOcr] = useState<Ocr>('idle');
  const [detail, setDetail] = useState('');
  const [prog, setProg] = useState(0);
  const [manualConfirm, setManualConfirm] = useState(false);
  const [vlm, setVlm] = useState<VlmResult | null>(null);

  const needsLevel = LEVEL_DAYS.includes(day);

  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFileName(f?.name ?? null);
    setError(null);
    setManualConfirm(false);
    setVlm(null);
    setPreview((old) => { if (old) URL.revokeObjectURL(old); return f ? URL.createObjectURL(f) : null; });
    if (!f) { setOcr('idle'); return; }
    if (!needsStamp) { setOcr('ok'); return; } // ngày SHARE không cần tem
    setOcr('reading'); setProg(0); setDetail('');

    // 1) Có key VLM (Gemini) → VLM là NGUỒN SỰ THẬT: đọc được cả % đường, và KHÔNG rơi về CLIP khi lỗi
    //    (tránh ảnh giả lọt qua bộ nhận diện yếu). Lỗi thì báo để thử lại.
    const { vlmAvailable, verifyDrink } = await import('../lib/vlm');
    if (vlmAvailable) {
      const r = await verifyDrink(f);
      setVlm(r);
      if (r.ran) {
        if (r.ok) { setDetail(vi.checkin.ocr.okVlm(r.drink)); setOcr('ok'); }
        else setOcr('fail');
      } else {
        setDetail(vi.checkin.ocr.vlmError); setOcr('fail'); // lỗi mạng/key → không pass
      }
      return;
    }

    // 2) On-device: CLIP nhận diện đồ uống + OCR đọc tem.
    const [{ detectDrink, fileToImage }, { readStamp }] = await Promise.all([import('../lib/vision'), import('../lib/ocr')]);
    let img: HTMLImageElement | null = null;
    try { img = await fileToImage(f); } catch { /* ảnh lỗi */ }
    const [vis, stamp] = await Promise.all([
      img ? detectDrink(img) : Promise.resolve<VisionResult>({ ok: false, labels: [], score: 0, ran: false, unavailable: true }),
      readStamp(f, setProg),
    ]);
    if (vis.ok) { setDetail(vi.checkin.ocr.okDrink(vis.labels.join(', '))); setOcr('ok'); }
    else if (stamp.ok) { setDetail(vi.checkin.ocr.okStamp); setOcr('ok'); }
    else if (vis.unavailable && stamp.unavailable) setOcr('unavailable');
    else setOcr('fail');
  };

  // Chặt: chỉ nộp khi ĐÃ nhận diện được (ok). Nếu máy không chạy được AI thì phải tự cam kết (manualConfirm).
  const canSubmit = !!fileName && (!needsStamp || ocr === 'ok' || (ocr === 'unavailable' && manualConfirm));

  const submit = async () => {
    setPhase('uploading');
    setError(null);
    try {
      await api.submitCheckin(day, level, fileName ?? '');
      playSfx('win');
      setPhase('success');
    } catch (err) {
      setPhase('idle');
      setError(messageFor(err));
      setRetryable(errorCode(err) === 'network');
    }
  };

  if (!m) return <Banner kind="error">Không có nhiệm vụ này.</Banner>;

  if (phase === 'success') {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 pt-6 text-center">
        <Gumi state="bo_pho" size={150} progress={day / vi.journey.total} event="cheer" eventKey={1} />
        <Banner kind="success">{vi.checkin.success(m.points)}</Banner>
        <ChapterTease day={day} />
        <Link to="/" className="inline-flex min-h-11 items-center rounded-control bg-primary px-5 font-semibold text-on-primary">{vi.checkin.back}</Link>
      </div>
    );
  }

  const sugarSeen = vlm?.sugarPercent ?? null;
  const mismatch = needsLevel && sugarSeen !== null && sugarSeen > level + 5;

  return (
    <GameShell act={actOfDay(day)} title={`Ngày ${m.day}: ${m.title}`} intro={m.description}
      footer={<Button onClick={submit} loading={phase === 'uploading'} disabled={!canSubmit} block>{phase === 'uploading' ? vi.checkin.uploading : vi.checkin.submit}</Button>}>
      {error && <div className="mb-2"><Banner kind="error" action={retryable ? <Button variant="secondary" onClick={submit}>{vi.checkin.retry}</Button> : undefined}>{error}</Banner></div>}

      <Card className="flex flex-col gap-3">
        {/* Xem trước ảnh chụp */}
        {preview && (
          <div className="relative overflow-hidden rounded-control border border-border bg-black/5">
            <img src={preview} alt="Ảnh check-in" className="max-h-64 w-full object-contain" />
            <label className="absolute bottom-2 right-2 inline-flex cursor-pointer items-center gap-1.5 rounded-pill bg-surface/90 px-3 py-1.5 text-caption font-semibold text-text shadow-soft backdrop-blur">
              <Icon name="camera" size={15} /> {vi.checkin.change}
              <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={pick} />
            </label>
          </div>
        )}
        {!preview && (
          <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-control border-2 border-dashed border-border-strong/50 p-4 text-center font-semibold text-muted transition-colors hover:border-primary/60 hover:bg-primary/5 hover:text-primary">
            <Icon name="camera" size={28} />
            <span>{vi.checkin.pick}</span>
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={pick} />
          </label>
        )}

        {/* Kết quả AI nhận diện (chỉ ngày DRINK) */}
        {needsStamp && fileName && (
          <div className="flex flex-col gap-2">
            {ocr === 'reading' && <Banner kind="info">{vi.checkin.ocr.checking(prog)}</Banner>}
            {ocr === 'ok' && <Banner kind="success">{detail || vi.checkin.ocr.okStamp}</Banner>}

            {/* Đối chiếu % đường (khi VLM đọc được tem) */}
            {ocr === 'ok' && needsLevel && vlm?.ran && (
              <div className={`flex items-center justify-between gap-2 rounded-control border px-3 py-2 text-small font-semibold ${mismatch ? 'border-danger/40 bg-danger/8 text-danger' : 'border-info/30 bg-info/8 text-info'}`}>
                <span className="flex items-center gap-1.5"><Icon name="drop" size={15} filled /> {sugarSeen !== null ? vi.checkin.ocr.sugarSeen(sugarSeen) : vi.checkin.ocr.sugarNone}</span>
                <span className="rounded-pill bg-surface/80 px-2 py-0.5 text-caption">{vi.checkin.ocr.declared(level)}</span>
              </div>
            )}
            {mismatch && <p className="text-caption font-semibold text-danger">⚠ {vi.checkin.ocr.sugarMismatch}</p>}

            {ocr === 'unavailable' && (
              <>
                <Banner kind="info">{vi.checkin.ocr.unavailable}</Banner>
                <label className="flex cursor-pointer items-start gap-2 text-caption text-muted">
                  <input type="checkbox" checked={manualConfirm} onChange={(e) => setManualConfirm(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-primary" />
                  <span>{vi.checkin.ocr.manual}</span>
                </label>
              </>
            )}
            {ocr === 'fail' && (
              <Banner kind="error" action={<Button variant="secondary" onClick={() => { setPreview((o) => { if (o) URL.revokeObjectURL(o); return null; }); setFileName(null); setOcr('idle'); setVlm(null); }}>{vi.checkin.ocr.retake}</Button>}>
                {detail || vlm?.reason || vi.checkin.ocr.fail}
              </Banner>
            )}
          </div>
        )}
        {needsStamp && <p className="text-caption leading-relaxed text-muted">{vi.checkin.ocr.hint}</p>}

        {needsLevel && (
          <fieldset className="flex flex-col gap-2">
            <legend className="text-small font-semibold">{vi.checkin.level}</legend>
            <div className="grid grid-cols-4 gap-2">
              {LEVELS.map((l) => (
                <button key={l} type="button" onClick={() => setLevel(l)} aria-pressed={level === l}
                  className={`min-h-11 rounded-control border-2 font-semibold transition-colors ${level === l ? 'border-primary bg-primary text-on-primary' : 'border-border-strong/50 bg-surface hover:border-primary/50'}`}>{l}%</button>
              ))}
            </div>
          </fieldset>
        )}
      </Card>
    </GameShell>
  );
}
