import { useEffect, useState } from 'react';
import { Banner } from './Banner';
import { Button } from './Button';
import { Card } from './Card';
import { Icon } from './Icon';
import { ensureNotificationPermission, notificationPermission, notificationsSupported, showReminderNotification } from '../lib/notify';
import { isPushSubscribed, pushSupported, subscribePush, unsubscribePush } from '../lib/push';

/**
 * Bật/tắt NHẮC NHỞ của Gumi ngay trong Hồ sơ — để người dùng CHỦ ĐỘNG cấp quyền + đăng ký push
 * (thay vì chỉ tự hỏi 1 lần khi chạm màn, lỡ là không bao giờ nhận được noti). Có nút "Gửi thử"
 * để kiểm chứng thông báo hiện ra khay máy. Việc gửi khi app đóng do Edge Function `send-reminders` lo.
 */
export function ReminderSettings() {
  const supported = pushSupported() && notificationsSupported();
  const [perm, setPerm] = useState<NotificationPermission>(notificationPermission());
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => { if (supported) isPushSubscribed().then(setSubscribed); }, [supported]);

  const enable = async () => {
    setBusy(true); setMsg(null);
    try {
      const p = await ensureNotificationPermission();
      setPerm(p);
      if (p !== 'granted') { setMsg({ kind: 'error', text: 'Bạn đã chặn thông báo. Hãy bật lại trong cài đặt trình duyệt rồi thử lại.' }); return; }
      const ok = await subscribePush();
      setSubscribed(ok);
      if (ok) { await showReminderNotification({ tag: `gumi-test-${Date.now()}`, body: 'Đã bật nhắc nhở! Gumi sẽ nhắc bạn mỗi ngày nhé 🐱', url: '/' }); setMsg({ kind: 'success', text: 'Đã bật — bạn vừa nhận một thông báo thử.' }); }
      else setMsg({ kind: 'error', text: 'Chưa đăng ký được. Trên iPhone cần "Thêm vào MH chính" rồi mở từ app.' });
    } finally { setBusy(false); }
  };

  const test = async () => {
    setBusy(true); setMsg(null);
    const ok = await showReminderNotification({ tag: `gumi-test-${Date.now()}`, body: 'Đây là thông báo thử từ Gumi 🐱', url: '/', requireInteraction: true });
    setMsg(ok ? { kind: 'success', text: 'Đã gửi thông báo thử — kiểm tra khay thông báo nhé.' } : { kind: 'error', text: 'Chưa gửi được. Kiểm tra quyền thông báo.' });
    setBusy(false);
  };

  const disable = async () => {
    setBusy(true); setMsg(null);
    await unsubscribePush();
    setSubscribed(false);
    setMsg({ kind: 'info', text: 'Đã tắt nhắc nhở trên thiết bị này.' });
    setBusy(false);
  };

  return (
    <Card className="flex flex-col gap-3">
      <div>
        <h2 className="flex items-center gap-1.5 font-semibold"><Icon name="clock" size={17} /> Nhắc nhở của Gumi</h2>
        <p className="mt-0.5 text-caption text-muted">Nhận thông báo ra ngoài app để không bỏ lỡ thử thách mỗi ngày.</p>
      </div>

      {!supported ? (
        <Banner kind="info">Thiết bị/trình duyệt này chưa hỗ trợ thông báo đẩy. Trên iPhone: mở bằng app đã "Thêm vào MH chính".</Banner>
      ) : (
        <>
          {msg && <Banner kind={msg.kind}>{msg.text}</Banner>}
          {perm === 'denied' && <Banner kind="error">Thông báo đang bị chặn trong trình duyệt — hãy bật lại ở cài đặt trang.</Banner>}
          {subscribed ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="secondary" onClick={test} loading={busy} block>Gửi thử</Button>
              <Button variant="secondary" onClick={disable} loading={busy} block>Tắt nhắc nhở</Button>
            </div>
          ) : (
            <Button onClick={enable} loading={busy} disabled={perm === 'denied'} block>
              <span className="inline-flex items-center gap-2"><Icon name="clock" size={16} /> Bật nhắc nhở</span>
            </Button>
          )}
        </>
      )}
    </Card>
  );
}
