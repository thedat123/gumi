import { supabase } from '../../api/client';
export interface EventResult { id: string; team: string; scores: number[]; total: number; created_at?: string }
interface QueuedResult { owner: string; result: EventResult }
const live = import.meta.env.VITE_DATA_SOURCE !== 'mock' && supabase;
const key = 'gumi-event-results';
const queueKey = 'gumi-event-outbox-v1';
const cacheKey = 'gumi-event-leaderboard-cache';
const changed = () => window.dispatchEvent(new Event('event-results'));
function readQueue(): QueuedResult[] { return JSON.parse(localStorage.getItem(queueKey) ?? '[]'); }
export function pendingCount(owner: string) { try { return readQueue().filter(r => r.owner === owner).length; } catch { return 0; } }
export function withPending(rows: EventResult[], owner: string): (EventResult & { pending?: boolean })[] {
  let pending: EventResult[] = [];
  try { pending = readQueue().filter(r => r.owner === owner).map(r => r.result); } catch { /* keep cache */ }
  const merged = new Map<string, EventResult & { pending?: boolean }>(rows.map(r => [r.id, r]));
  for (const r of pending) if (!merged.has(r.id)) merged.set(r.id, { ...r, pending: true });
  return [...merged.values()].sort((a,b) => b.total-a.total);
}
export function cachedResults(): EventResult[] {
  try { return JSON.parse(localStorage.getItem(live ? cacheKey : key) ?? '[]'); } catch { return []; }
}
export async function listResults(): Promise<EventResult[]> {
  if (!live) return cachedResults();
  if (!navigator.onLine) throw new Error('offline');
  const { data, error } = await live.from('event_results').select('id,team,scores,total,created_at')
    .order('total', { ascending: false }).order('created_at').limit(500).abortSignal(AbortSignal.timeout(6000));
  if (error) throw error;
  const rows = data ?? [];
  try { localStorage.setItem(cacheKey, JSON.stringify(rows)); } catch { /* cache optional */ }
  return rows;
}
/** Durably save before any network request; callers can immediately start the next team. */
export function queueResult(result: EventResult, owner: string) {
  if (!live) {
    const rows = cachedResults();
    if (!rows.some(r => r.id === result.id)) localStorage.setItem(key, JSON.stringify([...rows, { ...result, created_at: new Date().toISOString() }].sort((a,b) => b.total-a.total)));
  } else {
    const rows = readQueue();
    if (!rows.some(r => r.result.id === result.id)) localStorage.setItem(queueKey, JSON.stringify([...rows, { owner, result }]));
  }
  changed();
}
let inFlight: Promise<void> | null = null;
export function flushResults(owner: string): Promise<void> {
  if (!live || !navigator.onLine) return Promise.resolve();
  if (inFlight) return inFlight;
  const client = live;
  inFlight = (async () => {
    // The session must still belong to the operator who recorded these scores.
    const { data } = await client.auth.getSession();
    if (data.session?.user.id !== owner) return;
    for (const item of readQueue().filter(r => r.owner === owner)) {
      const { error } = await client.from('event_results').upsert({ ...item.result, operator_id: owner }, { onConflict: 'id', ignoreDuplicates: true }).abortSignal(AbortSignal.timeout(6000));
      if (error) throw error;
      localStorage.setItem(queueKey, JSON.stringify(readQueue().filter(r => r.result.id !== item.result.id)));
      changed();
    }
  })().finally(() => { inFlight = null; });
  return inFlight;
}
export function watchResults(refresh: () => void) {
  window.addEventListener('storage', refresh); window.addEventListener('event-results', refresh); window.addEventListener('online', refresh);
  let subscribed = false;
  const channel = live ? live.channel('event-leaderboard').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event_results' }, refresh)
    .subscribe(status => { subscribed = status === 'SUBSCRIBED'; }) : null;
  // Realtime carries normal updates; fallback only when visible, online, and disconnected.
  const timer = window.setInterval(() => { if (!subscribed && navigator.onLine && !document.hidden) refresh(); }, 30000);
  return () => { clearInterval(timer); window.removeEventListener('storage', refresh); window.removeEventListener('event-results', refresh); window.removeEventListener('online', refresh); if (channel && live) void live.removeChannel(channel); };
}
