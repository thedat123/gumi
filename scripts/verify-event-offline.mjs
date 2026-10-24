import { chromium } from '@playwright/test';
// Run against a VITE_DATA_SOURCE=mock server; all four rounds run with networking disabled.
const base=process.env.GAME_BASE_URL || 'http://127.0.0.1:5203';
const browser = await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
await page.goto(`${base}/event`);
await page.waitForURL('**/login');
await page.evaluate(()=>localStorage.setItem('ld_mock_v3',JSON.stringify({session:{userId:'event-test',email:'operator@example.com'},users:{},profile:{id:'event-test',name:'Operator',avatar:'🐱',level:100,drinksPerWeek:7,role:'gamer',sugarPassAvailable:true},completed:[],passed:[],rejected:[],levels:{},wall:[],campaignDay:1,passesLeft:2,playStreak:0,storyBonus:0,earnedPoints:{}})));
await page.goto(`${base}/`);
await page.waitForURL('**/event');
const controller=await page.waitForFunction(()=>!!navigator.serviceWorker?.controller,{},{timeout:2000}).catch(()=>null);
if(controller){
 await page.waitForTimeout(500);
 await page.reload().catch(error=>{if(!String(error).includes('ERR_ABORTED'))throw error;});
 await page.getByLabel('Tên xuất hiện trên bảng xếp hạng').waitFor();
 await page.waitForFunction(async()=>{
   for(const name of await caches.keys()){
     const cache=await caches.open(name);
     if((await cache.keys()).some(request=>request.url.includes('gumi-ufo')))return true;
   }
   return false;
 });
 await page.context().setOffline(true);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.getByLabel('Tên xuất hiện trên bảng xếp hạng').waitFor();
 console.log('PASS: cached event lobby and artwork reopen without a network connection.');
}

await page.getByLabel('Tên xuất hiện trên bảng xếp hạng').fill('Đội kiểm tra');
await page.getByRole('button',{name:'Bắt đầu thử thách'}).waitFor();
await page.context().setOffline(true);
await page.getByRole('button',{name:'Bắt đầu thử thách'}).click();
await page.getByRole('heading',{name:'Phân loại nhanh',exact:true}).waitFor();
if(controller)await page.evaluate(()=>{window.__gameUpdatePending=true;navigator.serviceWorker.dispatchEvent(new Event('controllerchange'));});

await page.screenshot({path:'/private/tmp/gumi-event-sort.png'});
await page.clock.install();
await page.clock.fastForward(31000);
await page.getByRole('heading',{name:'Truy vết Mật Độ',exact:true}).waitFor();
await page.clock.fastForward(4000);
await page.screenshot({path:'/private/tmp/gumi-event-memory.png'});
await page.clock.runFor(46000);
await page.screenshot({path:'/private/tmp/gumi-event-debug.png'}); await page.getByRole('heading',{name:'Truy tìm sự thật',exact:true}).waitFor();
for(let i=0;i<5;i++){
 await page.clock.runFor(16000);
 await page.getByRole('button',{name:i===4?'Qua Flappy Gumi':'Hồ sơ tiếp theo'}).click();
}
await page.getByText('5 lượt chơi · Đạt 40 cột').waitFor();
if(await page.locator('.event-shell canvas').count())throw Error('Event still uses canvas');
if(!(await page.locator('.flight-bird img').evaluate(img=>img.naturalWidth>0)))throw Error('UFO not decoded before offline flight');
await page.screenshot({path:'/private/tmp/gumi-event-flappy.png'});
// Measure real-time flight separately from the accelerated round-transition checks.
await page.clock.resume();
const cdp=await page.context().newCDPSession(page);
const cpu=Number(process.env.EVENT_CPU_SLOWDOWN || 6);
await cdp.send('Emulation.setCPUThrottlingRate',{rate:cpu});
await page.evaluate(()=>{Math.random=()=>.5;});
await page.locator('.game-shell').getByRole('button',{name:'Bắt đầu',exact:true}).click();
const metrics=await page.evaluate(async()=>{
 const bird=document.querySelector('.flight-bird');
 const scale=document.querySelector('.flight-field').clientHeight/600;
 const frameTimes=[];let previous=performance.now(),count=0;const end=previous+4000;
 const pilot=setInterval(()=>{
   const match=bird.style.transform.match(/translate3d\(-50%, ([\d.-]+)px/);
   if(match && Number(match[1])/scale+24>300)window.dispatchEvent(new KeyboardEvent('keydown',{code:'Space'}));
 },30);
 let updates=0;const observer=new MutationObserver(()=>updates++);observer.observe(bird,{attributes:true,attributeFilter:['style']});
 await new Promise(resolve=>{const tick=now=>{frameTimes.push(now-previous);previous=now;count++;if(now<end)requestAnimationFrame(tick);else resolve();};requestAnimationFrame(tick);});
 clearInterval(pilot);observer.disconnect();frameTimes.sort((a,b)=>a-b);
 return{count,updates,p95:frameTimes[Math.floor(frameTimes.length*.95)]};
});
if(metrics.updates<30)throw Error('Offline Flappy not animating');
console.log('Offline native-resolution Flappy performance',JSON.stringify({cpu,metrics}));
await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
// Finish the current attempt, then the remaining four attempts without input.
await page.clock.runFor(4000);

for(let i=0;i<4;i++){ await page.locator('.game-shell').getByRole('button',{name:'Chơi lại',exact:true}).click(); await page.clock.runFor(4000); }
await page.getByRole('heading',{name:'CHẶNG ĐƯỜNG RỰC RỠ!'}).waitFor();
await page.getByText('Đã lưu lên bảng xếp hạng!',{exact:true}).waitFor();
const rows = await page.evaluate(()=>JSON.parse(localStorage.getItem('gumi-event-results')));
if(rows.length!==1 || rows[0].scores.length!==4 || rows[0].team!=='Đội kiểm tra') throw Error('Invalid saved result');
if(controller){
 if(!(await page.evaluate(()=>window.__gameUpdatePending)))throw Error('PWA reloaded during the event');
 await page.getByRole('button',{name:'Đội tiếp theo'}).click();
 await page.waitForFunction(()=>!window.__gameUpdatePending);
 await page.getByLabel('Tên xuất hiện trên bảng xếp hạng').waitFor();
 console.log('PASS: SW update deferred through all rounds and saved summary, applied only between teams.');
}
console.log('PASS: four rounds entirely offline, no game canvas, decoded UFO; summary, four scores, persisted leaderboard; guest guard, gamer redirect, team entry, sort timeout, memory preview/timeout, five truth timeouts, event Flappy target.');
await browser.close();
