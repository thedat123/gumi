import { useEffect } from 'react';
import { useSession } from '../app/session';
import {
  ensureNotificationPermission,
  notificationPermission,
  notificationsSupported,
} from '../lib/notify';
import { pushSupported, subscribePush } from '../lib/push';

/**
 * Bật WEB PUSH cho lời nhắc của Gumi — noti hiện ra khay HĐH kể cả khi app ĐÃ ĐÓNG.
 * Component này KHÔNG tự bắn noti nữa (việc gửi do Edge Function `send-reminders` lo);
 * nó chỉ: (1) xin quyền thông báo sau cử chỉ đầu tiên, (2) đăng ký + lưu push subscription,
 * (3) re-sync khi trình duyệt xoay khoá (nhận message từ service worker).
 * Không render gì.
 */
export function ReminderNotifier() {
  const { session } = useSession();

  useEffect(() => {
    if (!session || !pushSupported()) return;
    let cancelled = false;

    const sync = async () => { if (!cancelled && notificationPermission() === 'granted') await subscribePush(); };

    // Đã có quyền từ trước → đồng bộ subscription ngay (xử lý cả khi khoá bị xoay).
    void sync();

    // Chưa hỏi → xin quyền sau thao tác đầu tiên (iOS bắt buộc có cử chỉ), rồi đăng ký.
    const ask = async () => {
      if (!notificationsSupported()) return;
      const perm = await ensureNotificationPermission();
      if (perm === 'granted') await sync();
    };
    if (notificationPermission() === 'default') {
      window.addEventListener('pointerdown', ask, { once: true });
    }

    // Service worker báo cần đăng ký lại (pushsubscriptionchange).
    const onMessage = (e: MessageEvent) => { if (e.data?.type === 'push-resubscribe') void sync(); };
    navigator.serviceWorker?.addEventListener('message', onMessage);

    return () => {
      cancelled = true;
      window.removeEventListener('pointerdown', ask);
      navigator.serviceWorker?.removeEventListener('message', onMessage);
    };
  }, [session?.userId]);

  return null;
}
