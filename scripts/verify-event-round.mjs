import { chromium } from '@playwright/test';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 360, height: 800 } });
const origin = 'http://127.0.0.1:5204';
const api = 'http://127.0.0.1:4918/supabase';
const control = async (body = {}) => {
  const response = await fetch(`${api}/__test/control`, { method: 'POST', body: JSON.stringify(body) });
  if (!response.ok) throw Error(await response.text());
  return response.json();
};
const state = await control({ reset: true, failure: 'none' });
// Protocol fixture for the Realtime socket. HTTP still uses Postman Simulation.
const subscriptions = new Map();
await page.routeWebSocket('**/realtime/v1/websocket*', socket => {
  socket.onMessage(raw => {
    const parsed = JSON.parse(String(raw));
    const [join, ref, topic, event, payload] = Array.isArray(parsed) ? parsed : [parsed.join_ref, parsed.ref, parsed.topic, parsed.event, parsed.payload];
    const reply = response => socket.send(JSON.stringify([join, ref, topic, 'phx_reply', { status: 'ok', response }]));
    if (event === 'phx_join') {
      subscriptions.set(topic, { socket, join });
      reply({ postgres_changes: [{ id: 42, event: 'UPDATE', schema: 'public', table: 'event_board_updates' }] });
    } else if (event === 'phx_leave') { subscriptions.delete(topic); reply({}); }
    else if (event === 'heartbeat') reply({});
  });
  socket.onClose(() => { for (const [topic, sub] of subscriptions) if (sub.socket === socket) subscriptions.delete(topic); });
});
const requests = [];
page.on('request', request => requests.push(request.url()));
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await page.addInitScript(() => {
  localStorage.setItem('gumi-event-round-v1', JSON.stringify('old-round'));
  localStorage.setItem('gumi-event-name', 'Old player');
  localStorage.setItem('gumi-event-my-plays-v2', JSON.stringify([{ id: 'old-play', player: 'Old player', score: 25, game: 1 }]));
  localStorage.setItem('gumi-event-plays-outbox-v2', JSON.stringify([{ id: 'old-play', player: 'Old player', score: 25, game: 1 }]));
  localStorage.setItem('normal-progress-sentinel', 'preserved');
});
await page.goto(`${origin}/play`);
await page.getByLabel('Tên xuất hiện trên bảng xếp hạng').waitFor();
await page.waitForFunction(() => localStorage.getItem('gumi-event-round-v1') !== '"old-round"');
if (await page.getByLabel('Tên xuất hiện trên bảng xếp hạng').inputValue() !== '') throw Error('Name survived reset');
if (await page.evaluate(() => localStorage.getItem('gumi-event-plays-outbox-v2'))) throw Error('Stale outbox survived reset');
if (await page.evaluate(() => localStorage.getItem('normal-progress-sentinel')) !== 'preserved') throw Error('Normal progress removed');
await page.getByLabel('Tên xuất hiện trên bảng xếp hạng').fill('New player');
await page.getByRole('button', { name: 'Chọn thử thách', exact: true }).click();
await page.locator('.event-game-pick > button').first().click();
await page.getByRole('button', { name: 'Bắt đầu chơi' }).click();
await page.clock.install();
const before = await control();
await page.clock.fastForward(10000);
const after = await control();
if (after.calls.round !== before.calls.round || after.calls.board !== before.calls.board) throw Error('Polling during active gameplay');
await page.context().setOffline(true);
await page.clock.fastForward(21000);
await page.getByRole('heading', { name: 'Bạn đã hoàn thành!' }).waitFor();
if (await page.evaluate(() => JSON.parse(localStorage.getItem('gumi-event-plays-outbox-v2')).length) !== 1) throw Error('Offline result missing');
await page.clock.resume();
await control({ reset: true });
await page.context().setOffline(false);
await page.getByLabel('Tên xuất hiện trên bảng xếp hạng').waitFor();
if (await page.getByLabel('Tên xuất hiện trên bảng xếp hạng').inputValue() !== '') throw Error('Reconnect did not clear player');
if ((await control()).plays.length) throw Error('Old outbox resurrected cleared score');
// Same device can play again. A 503 must retain the result, then retry once.
await page.getByLabel('Tên xuất hiện trên bảng xếp hạng').fill('After reset');
await page.getByRole('button', { name: 'Chọn thử thách', exact: true }).click();
await page.locator('.event-game-pick > button').first().click();
await page.getByRole('button', { name: 'Bắt đầu chơi' }).click();
await control({ failure: 'error' });
await page.clock.fastForward(31000);
await page.clock.resume();
await page.getByRole('heading', { name: 'Bạn đã hoàn thành!' }).waitFor();
await page.waitForTimeout(2500);
if (await page.evaluate(() => JSON.parse(localStorage.getItem('gumi-event-plays-outbox-v2')).length) !== 1) throw Error('503 lost result');
await control({ failure: 'none' });
await page.evaluate(async () => { const store = await import('/src/pages/event/store.ts'); await store.flush(); });
const stored = await control();
if (stored.plays.length !== 1 || stored.plays[0].player !== 'After reset') throw Error('Retry did not save exactly once');
await page.evaluate(async () => {
  const store = await import('/src/pages/event/store.ts');
  localStorage.setItem('gumi-event-plays-outbox-v2', JSON.stringify([store.myPlay()]));
  await store.flush();
});
if ((await control()).plays.length !== 1) throw Error('Retry duplicated result');
const initialBoardCalls = (await control()).calls.board;
await page.clock.fastForward(30000);
if ((await control()).calls.board !== initialBoardCalls) throw Error('Board polled before one-minute interval');
await page.clock.fastForward(45000);
await page.waitForTimeout(100);
if ((await control()).calls.board <= initialBoardCalls) throw Error('One-minute fallback did not refresh');
const realtimeBefore = (await control()).calls.board;
if (subscriptions.size !== 1) throw Error(`Expected one shared board channel, got ${subscriptions.size}`);
for (let i = 0; i < 200; i++) for (const [topic, { socket, join }] of subscriptions) {
  socket.send(JSON.stringify([join, null, topic, 'postgres_changes', { ids: [42], data: { schema: 'public', table: 'event_board_updates', type: 'UPDATE', commit_timestamp: new Date().toISOString(), columns: [], record: { singleton: true, revision: i }, old_record: {}, errors: [] } }]));
}
await page.waitForTimeout(100);
await page.clock.fastForward(2700);
await page.waitForTimeout(200);
if ((await control()).calls.board !== realtimeBefore + 1) throw Error('Realtime burst was not coalesced into one board read');
const unrelated = requests.filter(url => /GumiRoom|three[./-]|transformers|onnx|\/rpc\/(get_profile|get_journey|get_summary)|\/auth\/v1/.test(url));
if (unrelated.length) throw Error('Public event loaded unrelated app resources: ' + unrelated.join('\n'));
if (errors.length) throw Error(errors.join('\n'));
console.log('PASS: real Supabase HTTP client through Postman Simulation; reset clears name/play/outbox; offline reconnect discards old score; same phone replays; 503 retains result; retry is idempotent; no gameplay polling; one-minute board fallback; 200 simulated Realtime events coalesced into one board read through the real client; no auth/profile/3D/vision requests.');
console.log(JSON.stringify({ calls: (await control()).calls, requests: requests.length }));
await browser.close();
