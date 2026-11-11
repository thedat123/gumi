import { supabase } from '../../api/client';

/** Một lượt chơi sự kiện: 1 điện thoại · 1 game (1–3) · 1 điểm. */
export interface EventPlay { id: string; player_key: string; player: string; game: number; score: number; created_at?: string }
/** Dòng bảng xếp hạng. game 1–3: điểm game đó; game 0 (Tổng hợp): `games` = số game đã chơi, `score` = tổng điểm. */
export interface BoardRow { id: string; player: string; score: number; rank: number; games?: number; me?: boolean; pending?: boolean }

const live = import.meta.env.VITE_DATA_SOURCE !== 'mock' ? supabase : null;
const outboxKey = 'gumi-event-plays-outbox-v2';
const mockKey = 'gumi-event-plays-mock-v2';
const mineKey = 'gumi-event-my-plays-v2';
const keyKey = 'gumi-event-player-key-v2';
const changed = () => window.dispatchEvent(new Event('event-plays'));

const read = <T,>(key: string, fallback: T): T => { try { return (JSON.parse(localStorage.getItem(key) ?? 'null') as T) ?? fallback; } catch { return fallback; } };
const write = (key: string, value: unknown) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* bộ nhớ đầy: bỏ qua */ } };

/** Mã ngẫu nhiên của điện thoại này — gom các game của cùng 1 người vào bảng tổng hợp. */
export function playerKey(): string {
  let k = read<string | null>(keyKey, null);
  if (!k) { k = crypto.randomUUID(); write(keyKey, k); }
  return k;
}
/** Các game máy này đã chơi (mỗi game 1 lần). */
export const myPlays = (): EventPlay[] => read<EventPlay[]>(mineKey, []);
export const pending = (): EventPlay[] => read<EventPlay[]>(outboxKey, []);
/** Ban tổ chức mở `/play?new=1`: xoá lượt đã chơi để máy dùng chung / thử nghiệm chơi lại như người mới. */
export function resetDevice() {
  try { [mineKey, keyKey].forEach(k => localStorage.removeItem(k)); } catch { /* ignore */ }
}

/** Lưu vào máy TRƯỚC, rồi mới gửi lên server → mất mạng giữa chừng vẫn không mất điểm. */
export function savePlay(play: EventPlay) {
  if (myPlays().some(p => p.game === play.game)) return;
  write(mineKey, [...myPlays(), play]);
  if (!live) write(mockKey, [...read<EventPlay[]>(mockKey, []).filter(p => p.id !== play.id), { ...play, created_at: new Date().toISOString() }]);
  else if (!pending().some(p => p.id === play.id)) write(outboxKey, [...pending(), play]);
  changed();
  void flush().catch(() => {});
}

let inFlight: Promise<void> | null = null;
export function flush(): Promise<void> {
  if (!live || !navigator.onLine) return Promise.resolve();
  if (inFlight) return inFlight;
  const client = live;
  inFlight = (async () => {
    for (const p of pending()) {
      const { error } = await client.rpc('event_submit', { p_id: p.id, p_key: p.player_key, p_player: p.player, p_game: p.game, p_score: p.score }).abortSignal(AbortSignal.timeout(8000));
      if (error) throw error;
      write(outboxKey, pending().filter(x => x.id !== p.id));
      changed();
    }
  })().finally(() => { inFlight = null; });
  return inFlight;
}

const byScore = <T extends { score: number; created_at?: string }>(a: T, b: T) => b.score - a.score || (a.created_at ?? '').localeCompare(b.created_at ?? '');

/** Bảng tổng hợp tính tại máy (chế độ giả lập + admin). */
export function totalsOf(plays: EventPlay[], me?: string): BoardRow[] {
  const by = new Map<string, EventPlay[]>();
  for (const p of plays) by.set(p.player_key, [...(by.get(p.player_key) ?? []), p]);
  return [...by.entries()].map(([k, ps]) => {
    const last = [...ps].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))[0]!;
    return { id: k, player: last.player, games: ps.length, score: ps.reduce((s, p) => s + p.score, 0), last: last.created_at ?? '', me: k === me };
  }).sort((a, b) => b.games - a.games || b.score - a.score || a.last.localeCompare(b.last))
    .map(({ last: _last, ...r }, i) => ({ ...r, rank: i + 1 }));
}

/** Bảng xếp hạng: game 1–3, hoặc 0 = Tổng hợp. Kèm lượt của máy này nếu chưa gửi lên kịp. */
export async function fetchBoard(game: number, limit = 100): Promise<BoardRow[]> {
  const me = playerKey();
  if (!live) {
    const all = read<EventPlay[]>(mockKey, []);
    return game === 0 ? totalsOf(all, me).slice(0, limit)
      : all.filter(p => p.game === game).sort(byScore).slice(0, limit).map((p, i) => ({ id: p.id, player: p.player, score: p.score, rank: i + 1, me: p.player_key === me }));
  }
  const waiting = pending();
  if (game === 0) {
    const { data, error } = await live.rpc('event_total', { p_limit: limit, p_key: me }).abortSignal(AbortSignal.timeout(8000));
    if (error) throw error;
    const rows = ((data ?? []) as { id: string; player: string; games: number; total: number; rank: number; me: boolean }[])
      .map(r => ({ id: r.id, player: r.player, games: r.games, score: r.total, rank: Number(r.rank), me: r.me }));
    if (!waiting.length) return rows;
    // Còn game chưa gửi kịp: cộng tạm vào dòng của mình rồi xếp lại.
    const mine = rows.find(r => r.me) ?? { id: 'me', player: waiting[waiting.length - 1]!.player, games: 0, score: 0, rank: 0, me: true };
    const merged = { ...mine, games: (mine.games ?? 0) + waiting.length, score: mine.score + waiting.reduce((s, p) => s + p.score, 0), pending: true };
    return [...rows.filter(r => !r.me), merged]
      .sort((a, b) => (b.games ?? 0) - (a.games ?? 0) || b.score - a.score || (a.me ? 1 : b.me ? -1 : a.rank - b.rank))
      .map((r, i) => ({ ...r, rank: i + 1 }));
  }
  const { data, error } = await live.rpc('event_board', { p_game: game, p_limit: limit }).abortSignal(AbortSignal.timeout(8000));
  if (error) throw error;
  const minePlayed = myPlays().find(p => p.game === game)?.id;
  const rows: BoardRow[] = ((data ?? []) as { id: string; player: string; score: number; rank: number }[])
    .map(r => ({ ...r, rank: Number(r.rank), me: r.id === minePlayed }));
  const w = waiting.filter(p => p.game === game && !rows.some(r => r.id === p.id));
  if (!w.length) return rows;
  return [...rows, ...w.map(p => ({ id: p.id, player: p.player, score: p.score, rank: 0, me: true, pending: true }))]
    .sort((a, b) => b.score - a.score || (a.pending ? 1 : b.pending ? -1 : a.rank - b.rank))
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

/** Gọi `refresh` khi có thay đổi ở máy, khi có mạng lại, và định kỳ 10 giây lúc đang mở màn hình. */
export function watch(refresh: () => void) {
  const online = () => { void flush().catch(() => {}); refresh(); };
  window.addEventListener('event-plays', refresh); window.addEventListener('storage', refresh); window.addEventListener('online', online);
  const timer = window.setInterval(() => { if (!document.hidden && navigator.onLine) online(); }, 10000);
  return () => { clearInterval(timer); window.removeEventListener('event-plays', refresh); window.removeEventListener('storage', refresh); window.removeEventListener('online', online); };
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
