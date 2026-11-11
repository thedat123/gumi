import { supabase } from '../../api/client';

/** Một lượt chơi sự kiện: 1 điện thoại · 1 game (1–3) · 1 điểm. */
export interface EventPlay { id: string; player_key: string; player: string; game: number; score: number; created_at?: string; round?: string }
/** Dòng bảng xếp hạng chung. */
export interface BoardRow { id: string; player: string; game: number; score: number; rank: number; me?: boolean; pending?: boolean }

const live = import.meta.env.VITE_DATA_SOURCE !== 'mock' ? supabase : null;
const outboxKey = 'gumi-event-plays-outbox-v2';
const mockKey = 'gumi-event-plays-mock-v2';
const mineKey = 'gumi-event-my-plays-v2';
const keyKey = 'gumi-event-player-key-v2';
const changed = () => window.dispatchEvent(new Event('event-plays'));

const read = <T,>(key: string, fallback: T): T => { try { return (JSON.parse(localStorage.getItem(key) ?? 'null') as T) ?? fallback; } catch { return fallback; } };
const write = (key: string, value: unknown) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* bộ nhớ đầy: bỏ qua */ } };

const roundKey = 'gumi-event-round-v1';
/** The round a device has joined; null means a first-time live connection is pending. */
export const eventRound = (): string | null => read<string | null>(roundKey, null) ?? (!live ? 'mock' : null);
let roundRequest: Promise<string | null> | null = null;
let roundChecked = 0;

/** Check before retrying outbox entries, on reopen, and on visible polling ticks. */
export function syncEventRound(force = false): Promise<string | null> {
  if (!live || !navigator.onLine) return Promise.resolve(eventRound());
  if (roundRequest) return roundRequest;
  if (!force && roundChecked && Date.now() - roundChecked < 10000) return Promise.resolve(eventRound());
  const client = live;
  roundRequest = (async () => {
    const { data, error } = await client.rpc('event_round').abortSignal(AbortSignal.timeout(8000));
    if (error) throw error;
    if (typeof data !== 'string' || !data) throw new Error('Invalid event round');
    if (eventRound() !== data) {
      // Only event-specific storage is removed. Auth, profiles and normal game
      // progress remain intact. Old outbox entries must never reach a new round.
      for (const storage of [localStorage, sessionStorage]) {
        const keys = Array.from({ length: storage.length }, (_, i) => storage.key(i));
        keys.forEach(key => { if (key?.startsWith('gumi-event-')) storage.removeItem(key); });
      }
      write(roundKey, data);
      changed();
    }
    roundChecked = Date.now();
    return data;
  })().finally(() => { roundRequest = null; });
  return roundRequest;
}

/** Mã ngẫu nhiên của điện thoại này — gom các game của cùng 1 người vào bảng tổng hợp. */
export function playerKey(): string {
  let k = read<string | null>(keyKey, null);
  if (!k) { k = crypto.randomUUID(); write(keyKey, k); }
  return k;
}
/** Lượt chơi của máy này (mỗi điện thoại 1 lượt). */
export const myPlay = (): EventPlay | null => read<EventPlay[]>(mineKey, [])[0] ?? null;
export const pending = (): EventPlay[] => read<EventPlay[]>(outboxKey, []);
/** Ban tổ chức mở `/play?new=1`: xoá lượt đã chơi để máy dùng chung / thử nghiệm chơi lại như người mới. */
export function resetDevice() {
  try { [mineKey, keyKey, outboxKey].forEach(k => localStorage.removeItem(k)); } catch { /* ignore */ }
}

/** Lưu vào máy TRƯỚC, rồi mới gửi lên server → mất mạng giữa chừng vẫn không mất điểm. */
export function savePlay(play: EventPlay) {
  if (myPlay() || play.round !== eventRound()) return false;
  write(mineKey, [play]);
  if (!live) write(mockKey, [...read<EventPlay[]>(mockKey, []).filter(p => p.id !== play.id), { ...play, created_at: new Date().toISOString() }]);
  else if (!pending().some(p => p.id === play.id)) write(outboxKey, [...pending(), play]);
  changed();
  void flush().catch(() => {});
  return true;
}

let inFlight: Promise<void> | null = null;
export function flush(): Promise<void> {
  if (!live || !navigator.onLine) return Promise.resolve();
  if (inFlight) return inFlight;
  const client = live;
  inFlight = (async () => {
    if (pending().length) await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 1200));
    await syncEventRound();
    for (const p of pending()) {
      if (p.round !== eventRound()) {
        write(outboxKey, pending().filter(x => x.id !== p.id));
        changed();
        continue;
      }
      const { error } = await client.rpc('event_submit', { p_id: p.id, p_key: p.player_key, p_player: p.player, p_game: p.game, p_score: p.score, p_round: p.round }).abortSignal(AbortSignal.timeout(8000));
      if (error) {
        if (error.message.includes('EVENT_ROUND_EXPIRED')) { await syncEventRound(true); return; }
        throw error;
      }
      write(outboxKey, pending().filter(x => x.id !== p.id));
      changed();
    }
  })().finally(() => { inFlight = null; });
  return inFlight;
}

const byScore = <T extends { score: number; created_at?: string }>(a: T, b: T) => b.score - a.score || (a.created_at ?? '').localeCompare(b.created_at ?? '');

/** Xếp hạng chung tại máy (chế độ giả lập + admin). */
export const rankPlays = (plays: EventPlay[], me?: string): BoardRow[] =>
  [...plays].sort(byScore).map((p, i) => ({ id: p.id, player: p.player, game: p.game, score: p.score, rank: i + 1, me: p.player_key === me }));

export interface BoardPage { rows: BoardRow[]; total: number; mine: BoardRow | null }

/** 1 trang bảng xếp hạng chung (phân trang phía máy chủ) + dòng của máy này dù nằm ở trang nào. */
export async function fetchBoard(offset = 0, limit = 10): Promise<BoardPage> {
  await syncEventRound();
  const me = playerKey();
  let all: BoardRow[]; let total: number;
  if (!live) {
    const ranked = rankPlays(read<EventPlay[]>(mockKey, []), me);
    total = ranked.length;
    all = ranked.filter(r => (r.rank > offset && r.rank <= offset + limit) || r.me);
  } else {
    const { data, error } = await live.rpc('event_board', { p_offset: offset, p_limit: limit, p_key: me }).abortSignal(AbortSignal.timeout(8000));
    if (error) throw error;
    const raw = (data ?? []) as (BoardRow & { total: number })[];
    total = Number(raw[0]?.total ?? 0);
    all = raw.map(({ total: _t, ...r }) => ({ ...r, rank: Number(r.rank) }));
    // Lượt của máy này chưa gửi kịp: hiện tạm là "đang gửi" (chưa có hạng thật).
    const w = pending().find(p => !all.some(r => r.id === p.id));
    if (w) all.push({ id: w.id, player: w.player, game: w.game, score: w.score, rank: 0, me: true, pending: true });
  }
  const mine = all.find(r => r.me) ?? null;
  return { rows: all.filter(r => r.rank > offset && r.rank <= offset + limit), total, mine };
}

/** Gọi `refresh` khi máy có điểm mới, khi có mạng lại, và định kỳ lúc màn hình đang mở.
 *  every=0: chỉ theo dõi sự kiện, không polling khi người chơi đang chơi.
 *  Nhịp có độ lệch ngẫu nhiên để hàng trăm điện thoại không gọi máy chủ cùng một giây. */
export function watch(refresh: () => void, every = 15000) {
  const online = () => { void flush().catch(() => {}).then(refresh); };
  window.addEventListener('event-plays', refresh); window.addEventListener('storage', refresh); window.addEventListener('online', online);
  let timer = 0;
  const loop = () => { timer = window.setTimeout(() => { if (!document.hidden && navigator.onLine) online(); loop(); }, every * (0.8 + Math.random() * 0.4)); };
  if (every > 0) loop();
  const visible = () => { if (!document.hidden) { void syncEventRound(true).catch(() => {}).then(online); } };
  document.addEventListener('visibilitychange', visible);
  return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', visible); window.removeEventListener('event-plays', refresh); window.removeEventListener('storage', refresh); window.removeEventListener('online', online); };
}

/** One Realtime channel per tab, shared by top-three/rest/results observers.
 * A notification burst becomes one refresh after a randomized short delay.
 * The 60s watch remains as recovery when the socket is unavailable. */
const boardObservers = new Set<() => void>();
let boardChannel: ReturnType<NonNullable<typeof live>['channel']> | null = null;
let boardRefreshTimer = 0;
let boardRefreshDirty = false;
function queueBoardRefresh() {
  boardRefreshDirty = true;
  if (boardRefreshTimer || document.hidden || !navigator.onLine) return;
  boardRefreshTimer = window.setTimeout(() => {
    boardRefreshTimer = 0;
    if (document.hidden || !navigator.onLine) return;
    boardRefreshDirty = false;
    boardObservers.forEach(refresh => refresh());
  }, 1300 + Math.random() * 1200);
}
const resumeBoard = () => { if (boardRefreshDirty) queueBoardRefresh(); };
export function watchBoard(refresh: () => void, every = 60000) {
  const stop = watch(refresh, every);
  boardObservers.add(refresh);
  if (live && !boardChannel) {
    boardChannel = live.channel('event-board-signal')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'event_board_updates' }, queueBoardRefresh)
      .subscribe(status => { if (status === 'SUBSCRIBED') queueBoardRefresh(); });
    document.addEventListener('visibilitychange', resumeBoard);
  }
  return () => {
    stop(); boardObservers.delete(refresh);
    if (!boardObservers.size) {
      if (boardChannel && live) void live.removeChannel(boardChannel);
      boardChannel = null;
      clearTimeout(boardRefreshTimer); boardRefreshTimer = 0; boardRefreshDirty = false;
      document.removeEventListener('visibilitychange', resumeBoard);
    }
  };
}

/* ---------- Admin ---------- */
/** Toàn bộ lượt chơi (chỉ admin đọc được). */
export async function adminPlays(): Promise<EventPlay[]> {
  if (!live) return read<EventPlay[]>(mockKey, []);
  const { data, error } = await live.from('event_plays').select('id,player_key,player,game,score,created_at')
    .order('score', { ascending: false }).order('created_at').limit(5000).abortSignal(AbortSignal.timeout(8000));
  if (error) throw error;
  return (data ?? []) as EventPlay[];
}
/** Xoá lượt chơi (tên bậy, chơi thử, gian lận…). */
export async function adminDelete(id: string) {
  if (!live) { write(mockKey, read<EventPlay[]>(mockKey, []).filter(p => p.id !== id)); changed(); return; }
  const { error } = await live.from('event_plays').delete().eq('id', id);
  if (error) throw error;
  changed();
}
/** Admin: cập nhật ngay khi có lượt mới (realtime), dự phòng 15 giây nếu realtime rớt. */
export function adminWatch(refresh: () => void) {
  window.addEventListener('event-plays', refresh);
  let subscribed = false;
  const channel = live ? live.channel('event-plays-admin').on('postgres_changes', { event: '*', schema: 'public', table: 'event_plays' }, refresh)
    .subscribe(s => { subscribed = s === 'SUBSCRIBED'; }) : null;
  const timer = window.setInterval(() => { if (!subscribed && !document.hidden && navigator.onLine) refresh(); }, 15000);
  return () => { clearInterval(timer); window.removeEventListener('event-plays', refresh); if (channel && live) void live.removeChannel(channel); };
}
