// Thông báo của HỆ ĐIỀU HÀNH (hiện ở khay thông báo điện thoại, NGOÀI app) cho lời nhắc Gumi.
// Khác với banner trong app: dùng Notification API + Service Worker để hệ máy tự hiển thị,
// kể cả khi người dùng đang ở tab/app khác. Bấm vào thông báo sẽ mở thẳng chương trong ngày.

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined'
    && 'Notification' in window
    && 'serviceWorker' in navigator;
}

export function notificationPermission(): NotificationPermission {
  return notificationsSupported() ? Notification.permission : 'denied';
}

/** Xin quyền thông báo (nên gọi sau một thao tác của người dùng — iOS bắt buộc). */
export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/** Bắn một thông báo ra khay hệ điều hành qua Service Worker. Trả về true nếu bắn được. */
export async function showReminderNotification(opts: { tag: string; body: string; url: string }): Promise<boolean> {
  if (!notificationsSupported() || Notification.permission !== 'granted') return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification('Level Down Challenge', {
      body: opts.body,
      tag: opts.tag,          // trùng tag → thay thế thay vì chồng thông báo cũ
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: opts.url },
      // @ts-expect-error — renotify chưa có trong lib.dom nhưng được hỗ trợ rộng rãi
      renotify: true,
      lang: 'vi',
    });
    return true;
  } catch {
    return false;
  }
}
