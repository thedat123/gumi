import { bossArt, driverArt, drawGumiCar } from './arcadeArt';
export const bossUrl = bossArt.src;
let ready: Promise<string> | undefined;
async function decode(img: HTMLImageElement) {
  if (typeof img.decode === 'function') await img.decode();
  else if (!img.complete) await new Promise<void>((resolve, reject) => {
    img.addEventListener('load', () => resolve(), { once: true });
    img.addEventListener('error', () => reject(new Error('Không tải được hình ảnh')), { once: true });
  });
  if (!img.naturalWidth) throw new Error('Không tải được hình ảnh');
}
/** Cache the original car artwork once, at high resolution; never redraw it in the game loop. */
export function prepareWaterArt(): Promise<string> {
  if (ready) return ready;
  ready = (async () => {
    await Promise.all([decode(bossArt), decode(driverArt)]);
    const canvas = document.createElement('canvas');
    const ratio = 4;
    canvas.width = 140 * ratio; canvas.height = 125 * ratio;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Không chuẩn bị được hình ảnh');
    ctx.scale(ratio, ratio); ctx.translate(70, 88);
    drawGumiCar(ctx, 0, 0, 110, 0, 0);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Không chuẩn bị được hình ảnh')), 'image/png'));
    const url = URL.createObjectURL(blob);
    try { const sprite = new Image(); sprite.src = url; await decode(sprite); }
    catch (error) { URL.revokeObjectURL(url); throw error; }
    return url;
  })().catch(error => { ready = undefined; throw error; });
  return ready;
}
