import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { GameShell } from '../components/GameShell';
import { CompletionPanel } from '../components/CompletionPanel';
import { FeatureModal } from '../components/FeatureModal';
import { Icon } from '../components/Icon';
import { actOfDay } from '../lib/scoring';
import { playSfx } from '../lib/sfx';
import { vi } from '../content/vi';
import { errorCode, messageFor } from '../lib/errors';
import { copyText, shareStory } from '../lib/shareCard';
import type { VisionResult } from '../lib/vision';
import type { VlmResult } from '../lib/vlm';
import type { SugarLevel } from '../lib/sugar';
import { drinkTarget, judgeDrink, readSugarPercent, storedSugarLevel, type DrinkVerdict } from '../lib/drinkChallenge';
import { useSession } from '../app/session';

type Ocr = 'idle' | 'reading' | 'ok' | 'fail' | 'unknown';

/** S06 — Nhiệm vụ có ảnh: ngày DRINK cần tem ly nước (AI kiểm + tự đọc mức đường); ngày SHARE chỉ ảnh + nút chia sẻ. */
export function CheckIn() {
  const { day: dayParam } = useParams();
  const day = Number(dayParam) || 1;
  const m = vi.missions[day - 1];
  const { profile } = useSession();
  const baseline = profile?.level ?? 100;
  const needsStamp = m?.kind === 'DRINK'; // ngày uống → bắt buộc thấy tem ly nước
  const [fileName, setFileName] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'reviewing' | 'success'>('idle');
  const [pending, setPending] = useState(false); // ảnh gửi admin duyệt tay (chờ duyệt)
  const [error, setError] = useState<string | null>(null);
  const [retryable, setRetryable] = useState(false);
  const [ocr, setOcr] = useState<Ocr>('idle');
  const [detail, setDetail] = useState('');
  const [prog, setProg] = useState(0);
  const [vlm, setVlm] = useState<VlmResult | null>(null);
  const [verdict, setVerdict] = useState<DrinkVerdict | null>(null);
  const [showVerdict, setShowVerdict] = useState(false);
  const pickRequest = useRef(0);

  const target = drinkTarget(day, baseline);
  const needsLevel = target !== null;
  const isShare = m?.kind === 'SHARE';

  const doShare = async () => {
    const r = await shareStory({ caption: vi.checkin.share.caption, url: window.location.origin, file });
    if (r === 'copied') setCopied(true);
  };
  const doCopy = async () => { if (await copyText(vi.checkin.share.caption)) setCopied(true); };

  const applyEvidence = (result: VlmResult) => {
    setVlm(result);
    const decision = judgeDrink(day, baseline, result);
    setVerdict(decision);
    setDetail(decision.detail);
    setOcr(decision.kind === 'pass' ? 'ok' : decision.kind);
    setShowVerdict(true);
  };

  // Nạp SẴN model on-device CHỈ KHI không có API đám mây (GCV/VLM) → lúc chụp nhận diện chạy nhanh.
  // BỎ pre-warm khi mạng chậm / bật "tiết kiệm dữ liệu": model ~21MB vẫn tải THEO YÊU CẦU khi user chọn ảnh,
  // tránh ngốn data & làm khựng máy yếu ngay khi mở màn check-in.
  useEffect(() => {
    if (!needsStamp) return;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    const stingy = !!conn && (conn.saveData === true || /(^|-)2g$/.test(conn.effectiveType ?? ''));
    if (stingy) return;
    let cancel = false;
    (async () => {
      const [{ gcvAvailable }, { vlmAvailable }] = await Promise.all([import('../lib/gcv'), import('../lib/vlm')]);
      if (!cancel && !gcvAvailable && !vlmAvailable) { const { warm } = await import('../lib/vision'); warm(); }
    })();
    return () => { cancel = true; };
  }, [needsStamp]);

  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const request = ++pickRequest.current;
    const f = e.target.files?.[0] ?? null;
    setFileName(f?.name ?? null);
    setFile(f);
    setError(null);
    setVlm(null);
    setVerdict(null);
    setShowVerdict(false);
    setPreview((old) => { if (old) URL.revokeObjectURL(old); return f ? URL.createObjectURL(f) : null; });
    if (!f) { setOcr('idle'); return; }
    if (!needsStamp) { setOcr('ok'); return; } // ngày SHARE không cần tem
    setOcr('reading'); setProg(0); setDetail('');

    // 1) GOOGLE CLOUD VISION (ưu tiên cao nhất): nhanh <1s, rẻ, scale — nhận đồ uống + đọc % đường trên tem.
    const gcv = await import('../lib/gcv');
    if (gcv.gcvAvailable && day !== 10 && day !== 20) {
      const r = await gcv.verifyDrink(f);
      if (request !== pickRequest.current) return;
      applyEvidence(r);
      return;
    }

    // 2) Gemini VLM (nếu có key): NGUỒN SỰ THẬT — đọc được cả % đường; lỗi thì báo để thử lại (không rơi về CLIP).
    const { vlmAvailable, verifyDrink } = await import('../lib/vlm');
    if (vlmAvailable) {
      const r = await verifyDrink(f);
      if (request !== pickRequest.current) return;
      applyEvidence(r);
      return;
    }

    // 3) On-device: CLIP nhận diện đồ uống TRƯỚC (đã nạp sẵn → nhanh, dưới ~2s).
    const { detectDrink, fileToImage } = await import('../lib/vision');
    let img: HTMLImageElement | null = null;
    try { img = await fileToImage(f); } catch { /* ảnh lỗi */ }
    const vis: VisionResult = img ? await detectDrink(img) : { ok: false, labels: [], score: 0, ran: false, unavailable: true };
    // CLIP nhận diện ly; OCR vẫn phải đọc tem để biết MỨC ĐƯỜNG thật.
    const { readStamp } = await import('../lib/ocr');
    const stamp = await readStamp(f, setProg);
    if (request !== pickRequest.current) return;
    const percent = readSugarPercent(stamp.text);
    const confirmed = vis.ok || stamp.ok;
    // On-device (CLIP/OCR) KÉM tin cậy hơn GCV: nếu KHÔNG chắc thì để 'unknown' (gửi duyệt tay),
    // KHÔNG phán 'Ảnh chưa hợp lệ' — tránh oan cho ảnh đồ uống thật. ran:false ⇒ judgeDrink trả 'unknown'.
    applyEvidence({ available: true, ran: confirmed,
      ok: confirmed, isDrink: confirmed, drink: vis.labels.join(', '),
      sugarPercent: percent, isUnsweetened: percent === 0, confidence: vis.score,
      reason: confirmed ? '' : 'Thiết bị này nhận diện hạn chế hoặc ảnh chưa đủ rõ. Nếu đúng là đồ uống thật, gửi ban tổ chức duyệt tay.' });
  };

  const canSubmit = !!file && (!needsStamp || verdict?.kind === 'pass');
  // AI chưa pass (ảnh sai hoặc AI lỗi/bận) nhưng đã có ảnh → cho phép gửi admin duyệt tay.
  const canReview = needsStamp && !!file && !!verdict && verdict.kind !== 'pass';

  const submit = async () => {
    setPhase('uploading');
    setError(null);
    try {
      if (needsStamp && verdict?.kind !== 'pass') { setPhase('idle'); setShowVerdict(true); return; }
      const level: SugarLevel = needsLevel ? storedSugarLevel(verdict!.percent!) : 0;
      await api.submitCheckin(day, level, file ?? '');
      playSfx('win');
      setPending(false);
      setPhase('success');
    } catch (err) {
      setPhase('idle');
      setError(messageFor(err));
      setRetryable(errorCode(err) === 'network');
    }
  };

  // Fallback: AI không nhận diện được → gửi ảnh cho admin duyệt tay (ghi nhận tạm thời, chờ duyệt).
  const submitForReview = async () => {
    if (!file) return;
    setShowVerdict(false);
    setPhase('reviewing');
    setError(null);
    try {
      const level: SugarLevel = needsLevel && verdict?.percent != null ? storedSugarLevel(verdict.percent) : 0;
      const r = await api.submitCheckin(day, level, file, true);
      playSfx('win');
      setPending(r.pending !== false);
      setPhase('success');
    } catch (err) {
      setPhase('idle');
      setError(messageFor(err));
      setRetryable(errorCode(err) === 'network');
    }
  };

  const retake = () => {
    setPreview((o) => { if (o) URL.revokeObjectURL(o); return null; });
    setFileName(null); setFile(null); setOcr('idle'); setVlm(null); setVerdict(null); setShowVerdict(false);
  };

  if (!m) return <Banner kind="error">Không có nhiệm vụ này.</Banner>;

  if (phase === 'success') {
    return <CompletionPanel day={day} points={m.points} note={pending ? vi.checkin.review.pendingNote : 'Ảnh check-in của bạn đã được ghi nhận.'} />;
  }

  const sugarSeen = vlm?.sugarPercent ?? null;

  return (
    <GameShell act={actOfDay(day)} title={`Ngày ${m.day}: ${m.title}`} intro={m.description}
      footer={canReview
        ? <Button onClick={submitForReview} loading={phase === 'reviewing'} block>{phase === 'reviewing' ? vi.checkin.review.sending : vi.checkin.review.cta}</Button>
        : <Button onClick={submit} loading={phase === 'uploading'} disabled={!canSubmit} block>{phase === 'uploading' ? vi.checkin.uploading : vi.checkin.submit}</Button>}>
      {error && <div className="mb-2"><Banner kind="error" action={retryable ? <Button variant="secondary" onClick={submit}>{vi.checkin.retry}</Button> : undefined}>{error}</Banner></div>}

      <Card className="flex flex-col gap-3">
        {needsStamp && <div className="rounded-card border border-primary/20 bg-gradient-to-r from-primary/10 to-accent/10 p-3">
          <p className="text-xs font-black uppercase tracking-widest text-primary">MỤC TIÊU NGÀY {day}</p>
          <p className="mt-1 text-small font-bold">{day === 10 ? 'Bình nước tự chuẩn bị, không thêm đường' : `Tối đa ${target}% đường${day === 1 ? ` · từ thói quen ${baseline}%` : ''}`}</p>
          <p className="mt-1 text-caption text-muted">AI sẽ đọc ảnh và đối chiếu trước khi bạn gửi check-in.</p>
        </div>}
        {/* Ngày SHARE: chia sẻ Story kèm caption (Web Share / copy), rồi upload ảnh chụp làm bằng chứng */}
        {isShare && (
          <div className="flex flex-col gap-2 rounded-control border border-info/30 bg-info/5 p-3">
            <p className="flex items-center gap-1.5 text-small font-bold text-info"><Icon name="sparkle" size={16} filled /> {vi.checkin.share.heading}</p>
            <p className="text-small font-semibold text-text">{m.description}</p>
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
              <input type="file" accept="image/*" capture={isShare ? undefined : 'environment'} className="sr-only" onChange={pick} />
            </label>
          </div>
        )}
        {!preview && (
          <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-control border-2 border-dashed border-border-strong/50 p-4 text-center font-semibold text-muted transition-colors hover:border-primary/60 hover:bg-primary/5 hover:text-primary">
            <Icon name="camera" size={28} />
            <span>{isShare ? 'Tải ảnh chụp Story' : vi.checkin.pick}</span>
            <input type="file" accept="image/*" capture={isShare ? undefined : 'environment'} className="sr-only" onChange={pick} />
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

            {ocr === 'unknown' && <Banner kind="info">{detail}</Banner>}
            {ocr === 'fail' && (
              <Banner kind="error" action={<Button variant="secondary" onClick={retake}>{vi.checkin.ocr.retake}</Button>}>
                {detail || vlm?.reason || vi.checkin.ocr.fail}
              </Banner>
            )}
            {/* AI chưa pass → hướng dẫn gửi admin duyệt tay (nút ở footer "Nhờ ban tổ chức duyệt tay"). */}
            {canReview && <p className="rounded-control border border-info/25 bg-info/5 px-3 py-2 text-caption leading-relaxed text-muted">{vi.checkin.review.hint}</p>}
          </div>
        )}
        {needsStamp && <p className="text-caption leading-relaxed text-muted">{vi.checkin.ocr.hint}</p>}
      </Card>
      {showVerdict && verdict && <FeatureModal title={verdict.title} eyebrow="Kết quả kiểm tra của Gumi" tone={verdict.kind === 'pass' ? 'success' : verdict.kind === 'fail' ? 'error' : 'info'} onClose={() => setShowVerdict(false)}
        action={verdict.kind === 'pass'
          ? <Button block variant="secondary" onClick={() => setShowVerdict(false)}>Tiếp tục gửi check-in</Button>
          : <div className="flex w-full flex-col gap-2">
              <Button block onClick={submitForReview}>{vi.checkin.review.cta}</Button>
              <Button block variant="secondary" onClick={retake}>{vi.checkin.ocr.retake}</Button>
            </div>}>
        <p>{verdict.detail}</p>
        {verdict.kind !== 'pass' && <p className="mt-2 text-caption leading-relaxed text-muted">{vi.checkin.review.hint}</p>}
      </FeatureModal>}
    </GameShell>
  );
}
