import { chromium } from '@playwright/test';
const browser = await chromium.launch({headless:true});
const context = await browser.newContext({viewport:{width:1440,height:900}});
const owner='11111111-1111-4111-8111-111111111111';
const page=await context.newPage();

await page.addInitScript(({owner})=>{
 const token = btoa(JSON.stringify({alg:'HS256',typ:'JWT'}))+'.'+btoa(JSON.stringify({sub:owner,exp:Math.floor(Date.now()/1000)+3600,aud:'authenticated',role:'authenticated'}))+'.synthetic';
 localStorage.setItem('gumi-auth',JSON.stringify({access_token:token,refresh_token:'fake-refresh-token',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,user:{id:owner,email:'operator@local.test',aud:'authenticated',role:'authenticated'}}));
}, {owner});
const control=async(failure)=>{
 const r=await fetch('http://127.0.0.1:4917/supabase/__test/control',{method:'POST',body:JSON.stringify({failure})});
 if(!r.ok)throw Error('Control failed '+await r.text());
};
await control('error');
await page.goto('http://127.0.0.1:5198/event');
await page.getByLabel('Tên xuất hiện trên bảng xếp hạng').waitFor();
const result={id:crypto.randomUUID(),team:'Đội mạng yếu',scores:[15,10,5,4],total:34};
await page.evaluate(async({owner,result})=>{
 const store=await import('/src/pages/event/store.ts');
 store.queueResult(result,owner);
 try{await store.flushResults(owner);throw Error('503 should reject');}catch(e){if(e.message==='503 should reject')throw e;}
 if(store.pendingCount(owner)!==1)throw Error('503 lost queued result');
 sessionStorage.setItem(`gumi-event-pending:${owner}`,JSON.stringify(result));
}, {owner,result});
await page.reload();
await page.getByText('Đã lưu tại máy.',{exact:false}).waitFor();
await page.getByText('ĐANG ĐỒNG BỘ',{exact:true}).waitFor();
await page.getByRole('button',{name:'Đội tiếp theo'}).click();
await page.getByLabel('Tên xuất hiện trên bảng xếp hạng').waitFor();
console.log('PASS: HTTP 503 retains durable queue, reload restores summary, next team is immediately playable.');
await control('hang');
const timeout=await page.evaluate(async(owner)=>{
 const store=await import('/src/pages/event/store.ts');
 const start=performance.now();
 try{await store.flushResults(owner);}catch{}
 return {elapsed:performance.now()-start,pending:store.pendingCount(owner)};
}, owner);
if(timeout.pending!==1||timeout.elapsed<5000||timeout.elapsed>8500)throw Error('Timeout guard failed '+JSON.stringify(timeout));
console.log('PASS: hanging HTTP request aborted after '+Math.round(timeout.elapsed)+'ms, score retained.');
await context.setOffline(true);
await page.evaluate(async(owner)=>{const store=await import('/src/pages/event/store.ts');await store.flushResults(owner);if(store.pendingCount(owner)!==1)throw Error('Offline lost score');},owner);
await control('none');
await context.setOffline(false);
await page.evaluate(async(owner)=>{const store=await import('/src/pages/event/store.ts');await store.flushResults(owner);if(store.pendingCount(owner)!==0)throw Error('Reconnect did not drain queue');},owner);
await page.evaluate(async({owner,result})=>{const store=await import('/src/pages/event/store.ts');store.queueResult(result,owner);await store.flushResults(owner);}, {owner,result});
const rows=await page.evaluate(async()=>{const store=await import('/src/pages/event/store.ts');return store.listResults();});
if(rows.filter(r=>r.id===result.id).length!==1)throw Error('Retry duplicated result');
await page.evaluate(async({owner,result})=>{
 const store=await import('/src/pages/event/store.ts');
 const other='22222222-2222-4222-8222-222222222222';
 store.queueResult({...result,id:crypto.randomUUID()},other);
 await store.flushResults(owner);await store.flushResults(other);
 if(store.pendingCount(other)!==1)throw Error('Another operator queue was sent');
}, {owner,result});
console.log('PASS: queued scores stay isolated by operator.');
console.log('PASS: reconnect drains queue through real Supabase HTTP client; retry leaves exactly one server record.');
await page.screenshot({path:'/private/tmp/gumi-event-lobby-new.png'});
await page.setViewportSize({width:390,height:844});
await page.screenshot({path:'/private/tmp/gumi-event-mobile-new.png',fullPage:true});
if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile horizontal overflow');
console.log('PASS: mobile 390px has no horizontal page overflow.');
await browser.close();
