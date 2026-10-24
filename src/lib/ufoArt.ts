import ufoUrl from '../assets/arcade/gumi-ufo.webp';
export const ufoArt = new Image();
ufoArt.decoding = 'async';
ufoArt.src = ufoUrl;

let preparation: Promise<void> | undefined;
/** Decode before the first flight, never during a frame or input callback. */
export function prepareUfoArt(): Promise<void> {
  if (preparation) return preparation;
  preparation = (async () => {
    if (typeof ufoArt.decode === 'function') await ufoArt.decode();
    else if (!ufoArt.complete) await new Promise<void>((resolve, reject) => {
      ufoArt.addEventListener('load', () => resolve(), { once: true });
      ufoArt.addEventListener('error', () => reject(new Error('UFO image unavailable')), { once: true });
    });
    if (!ufoArt.naturalWidth) throw new Error('UFO image unavailable');
  })().catch(error => {
    preparation = undefined;
    ufoArt.src = ufoUrl;
    throw error;
  });
  return preparation;
}
