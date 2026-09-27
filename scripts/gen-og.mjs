// Tạo ảnh banner Open Graph 1200x630 -> public/og-image.png (vẽ canvas trong headless Chromium).
import fs from 'node:fs'; import path from 'node:path';
const { chromium } = await import('@playwright/test');
const b = await chromium.launch(); const p = await (await b.newContext({ deviceScaleFactor: 1 })).newPage();
const dataUrl = await p.evaluate(() => {
  const W = 1200, H = 630; const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#C2416A'); bg.addColorStop(0.5, '#A32C4B'); bg.addColorStop(1, '#7E2E2A');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,0.06)'; g.beginPath(); g.arc(1050, 120, 260, 0, 7); g.fill(); g.beginPath(); g.arc(120, 560, 220, 0, 7); g.fill();
  const font = 'system-ui, sans-serif'; g.fillStyle = '#fff';
  g.font = `800 76px ${font}`; g.fillText('Level Down', 90, 250);
  g.fillStyle = '#FFD27A'; g.fillText('Challenge', 90, 340);
  g.fillStyle = '#fff'; g.globalAlpha = .92; g.font = `600 34px ${font}`; g.fillText('Nuôi mèo Gumi · 21 ngày bớt ngọt', 92, 410);
  g.font = `600 26px ${font}`; g.globalAlpha = .8; g.fillText('Mỗi ngày một nhiệm vụ · tích điểm · leo bảng Sugar Slayer', 92, 460); g.globalAlpha = 1;
  // mèo Chiến Thần Vàng
  const cx = 940, cy = 330, s = 3.2; g.save(); g.translate(cx, cy); g.scale(s, s);
  g.strokeStyle = '#FFE08A'; g.lineWidth = 6; g.beginPath(); g.ellipse(0, -74, 40, 11, 0, 0, 7); g.stroke();
  g.fillStyle = '#F2C879';
  g.beginPath(); g.moveTo(-32, -32); g.lineTo(-44, -70); g.lineTo(-15, -44); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(32, -32); g.lineTo(44, -70); g.lineTo(15, -44); g.closePath(); g.fill();
  g.beginPath(); g.ellipse(0, 40, 55, 58, 0, 0, 7); g.fill(); g.beginPath(); g.arc(0, -6, 46, 0, 7); g.fill();
  g.fillStyle = '#FFF6DD'; g.beginPath(); g.ellipse(0, 50, 32, 38, 0, 0, 7); g.fill();
  g.fillStyle = '#2A2320'; const rr=(x,y,w,h,r)=>{g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();};
  rr(-38,-14,29,19,9);g.fill(); rr(9,-14,29,19,9);g.fill(); g.lineWidth=4;g.strokeStyle='#2A2320';g.beginPath();g.moveTo(-9,-6);g.lineTo(9,-6);g.stroke();
  g.strokeStyle='#8A6A2A';g.lineWidth=4;g.beginPath();g.arc(0,16,11,0.15*Math.PI,0.85*Math.PI);g.stroke();
  g.restore();
  g.globalAlpha=.85; g.font=`700 24px ${font}`; g.fillText('🐱 leveldown.challenge', 92, 560); g.globalAlpha=1;
  return c.toDataURL('image/png');
});
await b.close();
const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
const out = path.resolve('public', 'og-image.png'); fs.writeFileSync(out, buf);
console.log('wrote', out, buf.length, 'bytes');
