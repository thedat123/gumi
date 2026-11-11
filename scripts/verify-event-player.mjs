import { chromium } from '@playwright/test';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const base = process.env.GAME_BASE_URL || 'http://127.0.0.1:5203';
const errors = [];
page.on('pageerror', error => errors.push(error.message));
async function fits() {
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw Error('Horizontal overflow');
}
await page.goto(`${base}/play?new=1`);
await page.getByLabel('Tên xuất hiện trên bảng xếp hạng').fill('Người chơi kiểm tra');
await fits();
await page.screenshot({ path: '/private/tmp/event-player-entry.png', fullPage: true });
await page.getByRole('button', { name: 'Chọn thử thách', exact: true }).click();
await fits();
await page.screenshot({ path: '/private/tmp/event-player-pick.png', fullPage: true });
await page.locator('.event-game-pick > button').first().click();
await page.getByText('Đồng hồ chỉ chạy khi bạn bắt đầu.').waitFor();
if (await page.locator('.event-timer').count()) throw Error('Timer running before start');
await page.getByRole('button', { name: 'Bắt đầu chơi' }).click();
await page.locator('.drink-card').waitFor();
await fits();
await page.screenshot({ path: '/private/tmp/event-player-sort.png', fullPage: true });
await page.clock.install();
await page.clock.fastForward(31000);
await page.getByRole('heading', { name: 'Bạn đã hoàn thành!' }).waitFor();
if (await page.evaluate(() => JSON.parse(localStorage.getItem('gumi-event-my-plays-v2')).length !== 1)) throw Error('Result missing');
await page.screenshot({ path: '/private/tmp/event-player-results.png', fullPage: true });
await page.clock.resume();
for (const game of [1, 2, 3]) {
  await page.goto(`${base}/play?new=1`);
  await page.getByRole('button', { name: 'Chọn thử thách', exact: true }).click();
  await page.locator('.event-game-pick > button').nth(game - 1).click();
  await page.getByRole('button', { name: 'Bắt đầu chơi' }).click();
  await fits();
  await page.screenshot({ path: `/private/tmp/event-player-game-${game}.png`, fullPage: true });
  if (game === 3) {
    await page.getByRole('button', { name: 'Cú lừa' }).click();
    await page.locator('.truth-reveal').waitFor();
    await fits();
    await page.screenshot({ path: '/private/tmp/event-player-answer.png', fullPage: true });
    await page.getByRole('button', { name: 'Câu tiếp theo' }).click();
    if (await page.locator('.player-question-track .complete').count() !== 1) throw Error('Question progress did not advance');
  }

}
for (const width of [320, 360, 768, 1440]) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${base}/play?new=1`);
  await page.getByLabel('Tên xuất hiện trên bảng xếp hạng').waitFor();
  await page.evaluate(() => document.fonts.ready);
  const titleGap = await page.locator('.player-hero-title').evaluate(el => {
    const [first, second] = [...el.children].map(line => line.getBoundingClientRect());
    return second.top - first.bottom;
  });
  if (titleGap < 1) throw Error(`Headline line boxes too close at ${width}px: ${titleGap}`);
  await fits();
  await page.screenshot({ path: `/private/tmp/event-player-${width}.png`, fullPage: true });
}
// Simulate enlarged typography and user-defined spacing on a narrow phone.
await page.setViewportSize({ width: 320, height: 700 });
await page.goto(`${base}/play?new=1`);
await page.addStyleTag({ content: '.event-mobile { font-size: 20px; } .event-mobile p, .event-mobile label, .event-mobile button, .event-mobile small { font-size: 20px !important; line-height: 1.8 !important; letter-spacing: .12em !important; word-spacing: .16em !important; }' });
await fits();
await page.getByRole('button', { name: 'Chọn thử thách', exact: true }).click();
await fits();
await page.locator('.event-game-pick > button').nth(2).click();
await fits();
await page.getByRole('button', { name: 'Bắt đầu chơi' }).click();
await fits();
await page.screenshot({ path: '/private/tmp/event-player-large-text.png', fullPage: true });
// The gamer projection: no players, 500 players, narrow and wide surfaces.
await page.evaluate(() => localStorage.setItem('ld_mock_v3', JSON.stringify({ session: { userId: 'event-test', email: 'operator@example.com' }, users: {}, profile: { id: 'event-test', name: 'Operator', avatar: '🐱', level: 100, drinksPerWeek: 7, role: 'gamer', sugarPassAvailable: true }, completed: [], passed: [], rejected: [], levels: {}, wall: [], campaignDay: 1, passesLeft: 2, playStreak: 0, storyBonus: 0, earnedPoints: {} })));
await page.evaluate(() => localStorage.removeItem('gumi-event-plays-mock-v2'));
for (const width of [320, 768, 1280, 1920]) {
  await page.setViewportSize({ width, height: width === 1280 ? 720 : 1080 });
  await page.goto(`${base}/event`);
  await page.getByRole('heading', { name: 'Bảng xếp hạng', exact: true }).waitFor();
  await page.locator('.eh-podium').waitFor();
  await page.locator('.eh-code img').waitFor();
  await fits();
  await page.screenshot({ path: `/private/tmp/event-host-empty-${width}.png`, fullPage: true });
}
await page.evaluate(() => localStorage.setItem('gumi-event-plays-mock-v2', JSON.stringify(Array.from({ length: 500 }, (_, i) => ({ id: `test-${i}`, player_key: `player-${i}`, player: i === 0 ? 'Nguyễn Thị Hoàng Minh Anh' : `Người chơi thứ ${i + 1}`, game: i % 3 + 1, score: 500 - i, created_at: new Date(1700000000000 + i * 1000).toISOString() })))));
for (const [width, height] of [[1920,1080],[1280,720],[390,844],[320,700]]) {
  await page.setViewportSize({ width, height });
  await page.reload();
  await page.locator('.eh-top3 li').first().waitFor();
  await page.locator('.eh-rest li').first().waitFor();
  await fits();
  if (await page.locator('.eh-rest li').count() > 10) throw Error('Unbounded board rendering');
  if (width > 1024 && await page.locator('.eh-games').evaluate(el => el.getBoundingClientRect().bottom > innerHeight + 1)) throw Error('Projection games clipped');
  await page.screenshot({ path: `/private/tmp/event-host-500-${width}.png`, fullPage: true });
}
if (errors.length) throw Error(errors.join('\n'));
console.log('PASS: all player screens, timer and saved result; enlarged text and spacing at 320px; projection empty/500-player board at 320/390/768/1280/1920px; paginated rendering; no overflow or runtime errors.');
await browser.close();
