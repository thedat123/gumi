import { spawn } from 'node:child_process'; import path from 'node:path';
const BASE='http://localhost:5182';
async function w(u,ms=30000){const t=Date.now();while(Date.now()-t<ms){try{if((await fetch(u)).ok)return}catch{}await new Promise(r=>setTimeout(r,400))}throw 0}
const s=spawn('npx',['vite','preview','--port','5182','--strictPort'],{stdio:'ignore'});
try{await w(BASE);const{chromium}=await import('@playwright/test');
const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist']});
const c=await b.newContext({viewport:{width:1240,height:820},deviceScaleFactor:2,locale:'vi-VN'});const p=await c.newPage();
await p.goto(`${BASE}/login`);await p.getByLabel('Email').fill('sen@gumi.vn');await p.getByLabel('Mật khẩu').fill('gumi1234');
await p.getByRole('button',{name:'Đăng nhập'}).click();await p.waitForURL('**/onboarding',{timeout:8000});
await p.getByText('Hệ trung dung').click();await p.getByLabel('Tên hiển thị').fill('Sen');await p.getByRole('button',{name:'Nhận nuôi Gumi'}).click();
await p.waitForURL(u=>new URL(u).pathname==='/',{timeout:8000}); await p.waitForTimeout(2400);
await p.screenshot({path:path.resolve('shots','x-light.png')});
// mở picker
await p.getByRole('button',{name:/Thời tiết/}).click(); await p.waitForTimeout(400);
await p.screenshot({path:path.resolve('shots','x-picker.png')});
// chọn Mưa (1 bấm)
await p.getByRole('menuitemradio',{name:/Mưa/}).click(); await p.waitForTimeout(700);
await p.screenshot({path:path.resolve('shots','x-rain.png'),clip:{x:120,y:230,width:420,height:360}});
await b.close()}finally{s.kill()}
