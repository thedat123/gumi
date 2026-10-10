// Web Push phía CLIENT: đăng ký subscription với trình duyệt rồi lưu lên Supabase.
// Việc GỬI thông báo do Edge Function `send-reminders` (server) lo — nhờ vậy noti tới cả
// khi app đã đóng. Khác hẳn Notification API cục bộ (chỉ chạy khi app còn sống).
//
// iOS: chỉ hoạt động khi PWA đã "Add to Home Screen" (iOS 16.4+), không chạy trong Safari tab.

import { api } from '../api';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export function pushSupported(): boolean {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;
}

/** VAPID public key (base64url) → Uint8Array cho applicationServerKey. */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalized);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * Đăng ký push (nếu chưa) và LƯU subscription lên Supabase.
 * An toàn gọi nhiều lần — upsert theo endpoint; tự xử lý trường hợp trình duyệt xoay khoá.
 * Trả về true nếu đã có subscription hợp lệ được lưu.
 */
export async function subscribePush(): Promise<boolean> {
  if (!pushSupported() || !VAPID_PUBLIC_KEY || Notification.permission !== 'granted') return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const appServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    let sub = await reg.pushManager.getSubscription();
    // Nếu đã subscribe nhưng bằng VAPID key khác (đổi khoá) → huỷ rồi đăng ký lại.
    if (sub && !applicationServerKeyMatches(sub, appServerKey)) {
      try { await sub.unsubscribe(); } catch { /* ignore */ }
      sub = null;
    }
    if (!sub) {
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: appServerKey as BufferSource });
    }
    const json = sub.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;
    await api.savePushSubscription({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth });
    return true;
  } catch {
    return false;
  }
}

/** Trình duyệt hiện đã có push subscription chưa (để hiện đúng trạng thái nút bật/tắt). */
export async function isPushSubscribed(): Promise<boolean> {
  if (!pushSupported()) return false;
  try { const reg = await navigator.serviceWorker.ready; return !!(await reg.pushManager.getSubscription()); }
  catch { return false; }
}

/** Huỷ đăng ký push ở trình duyệt và xoá subscription trên server. */
export async function unsubscribePush(): Promise<void> {
  if (!pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    try { await api.deletePushSubscription(sub.endpoint); } catch { /* vẫn huỷ ở trình duyệt */ }
    await sub.unsubscribe();
  } catch {
    /* ignore */
  }
}

function applicationServerKeyMatches(sub: PushSubscription, key: Uint8Array): boolean {
  const current = sub.options?.applicationServerKey;
  if (!current) return true; // không so sánh được → coi như khớp, tránh huỷ nhầm
  const a = new Uint8Array(current);
  if (a.length !== key.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== key[i]) return false;
  return true;
}
