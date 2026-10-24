import { chromium } from '@playwright/test';
// Run against VITE_DATA_SOURCE=mock dev server on port 5197.
const browser = await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
await page.goto('http://127.0.0.1:5197/event');
await page.waitForURL('**/login');
await page.evaluate(()=>localStorage.setItem('ld_mock_v3',JSON.stringify({session:{userId:'event-test',email:'operator@example.com'},users:{},profile:{id:'event-test',name:'Operator',avatar:'🐱',level:100,drinksPerWeek:7,role:'gamer',sugarPassAvailable:true},completed:[],passed:[],rejected:[],levels:{},wall:[],campaignDay:1,passesLeft:2,playStreak:0,storyBonus:0,earnedPoints:{}})));
await page.goto('http://127.0.0.1:5197/');
await page.waitForURL('**/event');
await page.getByLabel('Tên xuất hiện trên bảng xếp hạng').fill('Đội kiểm tra');
await page.getByRole('button',{name:'Bắt đầu thử thách'}).click();
await page.getByRole('heading',{name:'Phân loại nhanh',exact:true}).waitFor();
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
await page.screenshot({path:'/private/tmp/gumi-event-flappy.png'});
for(let i=0;i<5;i++){ await page.locator('.game-shell').getByRole('button',{name:i===0?'Bắt đầu':'Chơi lại',exact:true}).click(); await page.clock.runFor(4000); }
await page.getByRole('heading',{name:'CHẶNG ĐƯỜNG RỰC RỠ!'}).waitFor();
await page.getByText('Đã lưu lên bảng xếp hạng!',{exact:true}).waitFor();
const rows = await page.evaluate(()=>JSON.parse(localStorage.getItem('gumi-event-results')));
if(rows.length!==1 || rows[0].scores.length!==4 || rows[0].team!=='Đội kiểm tra') throw Error('Invalid saved result');
console.log('PASS: summary, four scores, persisted leaderboard; guest guard, gamer redirect, team entry, sort timeout, memory preview/timeout, five truth timeouts, event Flappy target.');
await browser.close();
