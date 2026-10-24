import { chromium } from '@playwright/test';
const base = process.env.GAME_BASE_URL || 'http://127.0.0.1:5202';
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const seed = () => {
    if (localStorage.getItem('ld_mock_v3')) return;
    localStorage.setItem('ld_mock_v3', JSON.stringify({
      session: { userId: 'flight-qa', email: 'test5@gumi.vn' }, users: {},
      profile: { id: 'flight-qa', name: 'Flight QA', avatar: '🐱', level: 100, drinksPerWeek: 7, role: 'player', sugarPassAvailable: true },
      completed: [], passed: [], rejected: [], levels: {}, wall: [], campaignDay: 7,
      passesLeft: 2, playStreak: 0, storyBonus: 0, earnedPoints: {},
    }));
  };
  await page.addInitScript(seed);
  await page.goto(`${base}/mission/14?gfx=low`);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  // Initial SW activation can reload once; stabilize under the active controller.
  await page.waitForTimeout(500);
  await page.reload().catch(error => { if (!String(error).includes('ERR_ABORTED')) throw error; });
  await page.getByRole('button', { name: 'Bắt đầu', exact: true }).waitFor();
  await page.waitForFunction(async () => {
    const image = document.querySelector('.water-boss img');
    return image && image.naturalWidth > 0 && !!(await caches.match(image.src));
  });
  // Only SW-originated fetches imply a background network revalidation.
  const workerRequests = [];
  context.on('request', request => { if (request.serviceWorker()) workerRequests.push(request.url()); });
  await page.evaluate(async () => { await fetch(document.querySelector('.water-boss img').src); });
  await page.waitForTimeout(200);
  if (workerRequests.some(url => /sugar-boss.*webp/.test(url))) throw new Error('Cached artwork still fetched from network');
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Bắt đầu', exact: true }).click();
  const motion = await page.evaluate(async () => {
    const node = document.querySelector('.water-car');
    const before = node.style.transform;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' }));
    await new Promise(resolve => setTimeout(resolve, 150));
    return before !== node.style.transform;
  });
  if (!motion) throw new Error('Catching scene failed offline');
  await page.evaluate(()=>{window.__gameUpdatePending=true;navigator.serviceWorker.dispatchEvent(new Event('controllerchange'));});
  await page.waitForTimeout(200);
  if(!(await page.evaluate(()=>window.__gameUpdatePending)))throw new Error('PWA update interrupted the game');
  await context.setOffline(false);
  await page.getByRole('link',{name:'Thoát',exact:true}).click();
  await page.waitForFunction(()=>!window.__gameUpdatePending);

  if (errors.length) throw new Error(errors.join('\n'));
  // Fresh visit with a very slow image: no flight starts with undecoded artwork.
  const coldContext = await browser.newContext({ serviceWorkers: 'block' });
  const coldPage = await coldContext.newPage();
  await coldPage.addInitScript(seed);
  await coldPage.route('**/*sugar-boss*.webp', async route => {
    await new Promise(resolve => setTimeout(resolve, 1800));
    await route.continue();
  });
  await coldPage.goto(`${base}/mission/14?gfx=low`, { waitUntil: 'domcontentloaded' });
  const loading = coldPage.getByRole('button', { name: 'Đang tải hình ảnh…' });
  await loading.waitFor();
  if (!(await loading.isDisabled())) throw new Error('Start allowed before image decode');
  await coldPage.keyboard.press('Space');
  await loading.waitFor();
  await coldPage.getByRole('button', { name: 'Bắt đầu', exact: true }).click();
  await coldPage.getByRole('button', { name: 'Bắt đầu', exact: true }).waitFor({ state: 'detached' });
  await coldContext.close();
  console.log('PASS: production SW, native-resolution artwork, cached assets avoid network, offline reload and catching, slow initial artwork decode gate. Progress/auth use local mock; real score submission remains unverified offline.');
} finally { await browser.close(); }
