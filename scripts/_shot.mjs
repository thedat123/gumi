import pkg from '@playwright/test'; const { chromium } = pkg;
import { spawn } from 'node:child_process';
const PORT=5194, BASE=`http://127.0.0.1:${PORT}`;
const server=spawn('npx',['vite','--port',String(PORT),'--host','127.0.0.1'],{cwd:'/Users/mac/Desktop/gumi',env:{...process.env,VITE_DATA_SOURCE:'mock'},stdio:'ignore'});
process.on('exit',()=>{try{server.kill('SIGTERM')}catch{}});
for(let i=0;i<60;i++){try{if((await fetch(BASE)).ok)break}catch{}await new Promise(r=>setTimeout(r,500));}
const b=await chromium.launch(); const page=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:3});
try{
 await page.goto(`${BASE}/login`,{waitUntil:'networkidle'});
 await page.fill('input[type="email"]','test5@gumi.vn'); await page.fill('input[type="password"]','test1234');
 await Promise.all([page.waitForLoadState('networkidle'),page.click('button[type="submit"]')]); await page.waitForTimeout(1200);
 await page.evaluate(()=>localStorage.setItem('ld_gumi_outfit',JSON.stringify({hat:'none',glasses:'none',neck:'none',jersey:'hle',color:'default',background:'none'})));
 await page.goto(`${BASE}/`,{waitUntil:'networkidle'}); await page.waitForTimeout(2000);
 await page.locator('.gumi').first().screenshot({path:'/tmp/app.png'}); console.log('OK');
}catch(e){console.log('ERR',e.message)} await b.close(); process.exit(0);
