import { useEffect, useState, type ChangeEvent } from 'react';
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
import { copyText, shareStory } from '../lib/shareCard';
import type { VisionResult } from '../lib/vision';
import type { VlmResult } from '../lib/vlm';
import type { SugarLevel } from '../lib/sugar';

// Mục tiêu mức đường theo ngày DRINK (khớp needs_level trong SQL). Mức THỰC TẾ lấy từ AI đọc tem ly;
// nếu AI không đọc được % thì coi như người chơi đạt đúng mục tiêu của ngày. Không còn để người chơi tự chọn.
const TARGET_LEVEL: Partial<Record<number, SugarLevel>> = { 1: 70, 5: 50, 15: 30, 20: 0 };
const SNAP: SugarLevel[] = [0, 30, 50, 70];
const snapLevel = (p: number | null | undefined): SugarLevel | null =>
  p == null ? null : SNAP.reduce((a, b) => (Math.abs(b - p) < Math.abs(a - p) ? b : a));

type Ocr = 'idle' | 'reading' | 'ok' | 'fail' | 'unavailable';

/** S06 — Nhiệm vụ có ảnh: ngày DRINK cần tem ly nước (AI kiểm + tự đọc mức đường); ngày SHARE chỉ ảnh + nút chia sẻ. */
export function CheckIn() {
  const { day: dayParam } = useParams();
  const day = Number(dayParam) || 1;
  const m = vi.missions[day - 1];
  const needsStamp = m?.kind === 'DRINK'; // ngày uống → bắt buộc thấy tem ly nước
  const [fileName, setFileName] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [retryable, setRetryable] = useState(false);
  const [ocr, setOcr] = useState<Ocr>('idle');
  const [detail, setDetail] = useState('');
  const [prog, setProg] = useState(0);
  const [manualConfirm, setManualConfirm] = useState(false);
  const [vlm, setVlm] = useState<VlmResult | null>(null);

  const needsLevel = TARGET_LEVEL[day] !== undefined;
  const isShare = m?.kind === 'SHARE';

  const doShare = async () => {
    const r = await shareStory({ caption: vi.checkin.share.caption, url: window.location.origin, file });
    if (r === 'copied') setCopied(true);
  };
  const doCopy = async () => { if (await copyText(vi.checkin.share.caption)) setCopied(true); };

  // Nạp SẴN model on-device CHỈ KHI không có API đám mây (GCV/VLM) → lúc chụp nhận diện chạy nhanh.
  useEffect(() => {
    if (!needsStamp) return;
    let cancel = false;
    (async () => {
      const [{ gcvAvailable }, { vlmAvailable }] = await Promise.all([import('../lib/gcv'), import('../lib/vlm')]);
      if (!cancel && !gcvAvailable && !vlmAvailable) { const { warm } = await import('../lib/vision'); warm(); }
    })();
    return () => { cancel = true; };
  }, [needsStamp]);

  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFileName(f?.name ?? null);
    setFile(f);
    setError(null);
    setManualConfirm(false);
    setVlm(null);
    setPreview((old) => { if (old) URL.revokeObjectURL(old); return f ? URL.createObjectURL(f) : null; });
    if (!f) { setOcr('idle'); return; }
    if (!needsStamp) { setOcr('ok'); return; } // ngày SHARE không cần tem
    setOcr('reading'); setProg(0); setDetail('');

    // 1) GOOGLE CLOUD VISION (ưu tiên cao nhất): nhanh <1s, rẻ, scale — nhận đồ uống + đọc % đường trên tem.
    const gcv = await import('../lib/gcv');
    if (gcv.gcvAvailable) {
      const r = await gcv.verifyDrink(f);
      setVlm(r);
      if (r.ran) { if (r.ok) { setDetail(vi.checkin.ocr.okVlm(r.drink || 'đồ uống')); setOcr('ok'); } else { setDetail(r.reason); setOcr('fail'); } }
      else { setDetail(vi.checkin.ocr.vlmError); setOcr('fail'); }
      return;
    }

    // 2) Gemini VLM (nếu có key): NGUỒN SỰ THẬT — đọc được cả % đường; lỗi thì báo để thử lại (không rơi về CLIP).
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

    // 3) On-device: CLIP nhận diện đồ uống TRƯỚC (đã nạp sẵn → nhanh, dưới ~2s).
    const { detectDrink, fileToImage } = await import('../lib/vision');
    let img: HTMLImageElement | null = null;
    try { img = await fileToImage(f); } catch { /* ảnh lỗi */ }
    const vis: VisionResult = img ? await detectDrink(img) : { ok: false, labels: [], score: 0, ran: false, unavailable: true };
    if (vis.ok) { setDetail(vi.checkin.ocr.okDrink(vis.labels.join(', '))); setOcr('ok'); return; }

    // CLIP chưa chắc → mới đọc TEM bằng OCR (Tesseract chậm hơn, chỉ dùng như phương án 2).
    const { readStamp } = await import('../lib/ocr');
    const stamp = await readStamp(f, setProg);
    if (stamp.ok) { setDetail(vi.checkin.ocr.okStamp); setOcr('ok'); }
    else if (vis.unavailable && stamp.unavailable) setOcr('unavailable');
    else setOcr('fail');
  };

  // Chặt: chỉ nộp khi ĐÃ nhận diện được (ok). Nếu máy không chạy được AI thì phải tự cam kết (manualConfirm).
  const canSubmit = !!fileName && (!needsStamp || ocr === 'ok' || (ocr === 'unavailable' && manualConfirm));

  const submit = async () => {
    setPhase('uploading');
    setError(null);
    try {
      // Mức đường = AI đọc được (snap về 0/30/50/70); AI không đọc ra thì lấy mục tiêu của ngày.
      const level = needsLevel ? (snapLevel(vlm?.sugarPercent) ?? TARGET_LEVEL[day]!) : 0;
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
        <div className="flex w-full max-w-xs flex-col items-stretch gap-2 sm:max-w-md sm:flex-row">
          <Link to="/journey" className="inline-flex min-h-11 flex-1 items-center justify-center rounded-control bg-primary px-5 font-semibold text-on-primary shadow-pop">{vi.minigames.common.backHome}</Link>
          <Link to="/" className="inline-flex min-h-11 items-center justify-center rounded-control border border-border-strong/50 bg-surface px-5 font-semibold text-muted">{vi.minigames.common.backToRoom}</Link>
        </div>
      </div>
    );
  }

  const sugarSeen = vlm?.sugarPercent ?? null;

  return (
    <GameShell act={actOfDay(day)} title={`Ngày ${m.day}: ${m.title}`} intro={m.description}
      footer={<Button onClick={submit} loading={phase === 'uploading'} disabled={!canSubmit} block>{phase === 'uploading' ? vi.checkin.uploading : vi.checkin.submit}</Button>}>
      {error && <div className="mb-2"><Banner kind="error" action={retryable ? <Button variant="secondary" onClick={submit}>{vi.checkin.retry}</Button> : undefined}>{error}</Banner></div>}

      <Card className="flex flex-col gap-3">
        {/* Ngày SHARE: chia sẻ Story kèm caption (Web Share / copy), rồi upload ảnh chụp làm bằng chứng */}
        {isShare && (
          <div className="flex flex-col gap-2 rounded-control border border-info/30 bg-info/5 p-3">
            <p className="flex items-center gap-1.5 text-small font-bold text-info"><Icon name="sparkle" size={16} filled /> {vi.checkin.share.heading}</p>
            <p className="text-caption leading-relaxed text-muted">{vi.checkin.share.hint}</p>
            <p className="whitespace-pre-line rounded-control border border-border bg-surface px-3 py-2 text-caption leading-relaxed text-text">{vi.checkin.share.caption}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={doShare} block>{vi.checkin.share.shareBtn}</Button>
              <Button variant="secondary" onClick={doCopy} block>{vi.checkin.share.copyBtn}</Button>
            </div>
            {copied && <p className="text-caption font-semibold text-success">{vi.checkin.share.copied}</p>}
          </div>
        )}

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

            {/* Mức đường AI đọc được từ tem ly (chỉ hiển thị, không cần chọn tay) */}
            {ocr === 'ok' && needsLevel && vlm?.ran && sugarSeen !== null && (
              <div className="flex items-center gap-1.5 rounded-control border border-info/30 bg-info/8 px-3 py-2 text-small font-semibold text-info">
                <Icon name="drop" size={15} filled /> {vi.checkin.ocr.sugarSeen(sugarSeen)}
              </div>
            )}

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
      </Card>
    </GameShell>
  );
}
