import ufoUrl from '../assets/arcade/gumi-ufo.webp';
import bossUrl from '../assets/arcade/sugar-boss.webp';
import gumiUrl from '../assets/gumi-gold.webp';
const load = (url: string) => { const img = new Image(); img.src = url; return img; };
export const ufoArt = load(ufoUrl);
export const bossArt = load(bossUrl);
const driverArt = load(gumiUrl);

/** Driver sits behind the bodywork and windshield; wheels follow actual travel. */
export function drawGumiCar(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, time: number, steering: number) {
  ctx.save(); ctx.translate(x, y); ctx.scale(width / 110, width / 110);
  ctx.fillStyle = '#20384c25'; ctx.beginPath(); ctx.ellipse(0, 30, 57, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.translate(0, Math.sin(time * (Math.abs(steering) > .01 ? 22 : 3)) * .8);
  for (const wx of [-35, 35]) {
    ctx.fillStyle = '#172735'; ctx.beginPath(); ctx.ellipse(wx, 21, 13, 15, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#9cb6c8'; ctx.beginPath(); ctx.arc(wx, 21, 8, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(wx, 21); ctx.rotate(x / 13); ctx.strokeStyle = '#eaf7ff'; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.stroke(); } ctx.restore();
  }
  ctx.fillStyle = '#24445a'; ctx.beginPath(); ctx.roundRect(-34, -23, 65, 37, 12); ctx.fill();
  if (driverArt.complete && driverArt.naturalWidth) ctx.drawImage(driverArt, -28, -71, 57, 81);
  ctx.strokeStyle = '#183b51'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(12, -7, 12, 8, -.3, 0, 7); ctx.stroke();
  ctx.fillStyle = '#f5c854'; for (const dx of [2, 21]) { ctx.beginPath(); ctx.ellipse(dx, -9, 5, 3, -.3, 0, 7); ctx.fill(); }
  const paint = ctx.createLinearGradient(0, -5, 0, 28); paint.addColorStop(0, '#69d9ef'); paint.addColorStop(.45, '#268fb9'); paint.addColorStop(1, '#165779');
  ctx.fillStyle = paint; ctx.beginPath(); ctx.moveTo(-54, 0); ctx.quadraticCurveTo(-28, -14, 1, -1); ctx.lineTo(38, -7); ctx.quadraticCurveTo(57, -5, 57, 13); ctx.lineTo(48, 24); ctx.lineTo(-45, 24); ctx.quadraticCurveTo(-58, 18, -54, 0); ctx.fill();
  ctx.strokeStyle = '#b6f5ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-47, 1); ctx.quadraticCurveTo(-22, -8, 0, 3); ctx.lineTo(34, -3); ctx.stroke();
  ctx.fillStyle = '#d3f6ff55'; ctx.beginPath(); ctx.moveTo(17, -8); ctx.lineTo(25, -35); ctx.quadraticCurveTo(43, -35, 45, -10); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#c3f5ff'; ctx.stroke();
  ctx.fillStyle = '#fff1b5'; ctx.beginPath(); ctx.roundRect(43, 1, 11, 7, 3); ctx.fill();
  ctx.fillStyle = '#ff856a'; ctx.fillRect(-53, 6, 5, 7);
  ctx.fillStyle = '#102e45'; ctx.beginPath(); ctx.roundRect(24, 16, 27, 4, 2); ctx.fill();
  ctx.strokeStyle = '#f4bd4e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-39, 14); ctx.lineTo(14, 14); ctx.stroke();
  ctx.restore();
}
