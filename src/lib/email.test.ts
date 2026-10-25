import { describe, expect, it } from 'vitest';
import {
  classifySmtpError, parseEmailSlots, reminderEmailPayload, reminderSubject, unsubscribeToken, verifyUnsubscribeToken,
} from '../../supabase/functions/_shared/email';

const UID = '11111111-2222-3333-4444-555555555555';

describe('email reminder helpers', () => {
  it('chữ ký huỷ nhận chỉ đúng với đúng user + đúng secret', async () => {
    const t = await unsubscribeToken('secret', UID);
    expect(await verifyUnsubscribeToken('secret', UID, t)).toBe(true);
    expect(await verifyUnsubscribeToken('khac', UID, t)).toBe(false);
    expect(await verifyUnsubscribeToken('secret', '99999999-2222-3333-4444-555555555555', t)).toBe(false);
    expect(await verifyUnsubscribeToken('secret', UID, t.slice(0, -1))).toBe(false);
  });

  it('dựng mail: link vào đúng ngày, preheader, link huỷ nhận, thoát ký tự HTML', () => {
    const p = reminderEmailPayload('Gumi <a@gmail.com>', {
      to: 'a@b.c', name: '<Minh>', text: 'Chơi nào & giảm đường', day: 3, minute: 21 * 60,
      appUrl: 'https://matdo.pages.dev/', unsubscribeUrl: 'https://x/unsub?u=1&t=2',
    });
    expect(p.to).toBe('a@b.c');
    expect(p.subject).toBe(reminderSubject(3, 21 * 60));
    expect(p.html).toContain('https://matdo.pages.dev/chapter/3');
    expect(p.html).toContain('&lt;Minh&gt;');
    expect(p.html).toContain('Chơi nào &amp; giảm đường');
    expect(p.headers['List-Unsubscribe']).toBe('<https://x/unsub?u=1&t=2>');
    expect(p.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
    expect(p.text).toContain('https://x/unsub?u=1&t=2');
  });

  it('mỗi mốc giờ một tiêu đề khác nhau', () => {
    const subjects = [0, 8 * 60, 15 * 60, 18 * 60, 21 * 60, 23 * 60 + 30].map((m) => reminderSubject(5, m));
    expect(new Set(subjects).size).toBe(6);
    expect(subjects.every((s) => s.includes('Ngày 5/14'))).toBe(true);
  });

  it('EMAIL_SLOTS: đọc "HH:MM", trống hoặc sai thì gửi mọi mốc', () => {
    expect(parseEmailSlots('08:00, 21:00')).toEqual(new Set([480, 1260]));
    expect(parseEmailSlots('23:30')).toEqual(new Set([1410]));
    expect(parseEmailSlots('')).toBeNull();
    expect(parseEmailSlots(undefined)).toBeNull();
    expect(parseEmailSlots('8h,21:00')).toBeNull();
    expect(parseEmailSlots('25:00')).toBeNull();
  });

  it('phân loại lỗi SMTP', () => {
    expect(classifySmtpError({ code: 'EAUTH', responseCode: 535, response: '535 5.7.8 Username and Password not accepted' }).kind).toBe('stop');
    expect(classifySmtpError({ responseCode: 550, response: '550 5.4.5 Daily user sending limit exceeded' }).kind).toBe('stop');
    expect(classifySmtpError({ responseCode: 421, response: '421 4.7.0 Try again later' }).kind).toBe('stop');
    expect(classifySmtpError({ responseCode: 550, response: "550 5.1.1 The email account that you tried to reach does not exist" }).kind).toBe('bad_address');
    expect(classifySmtpError({ responseCode: 552, response: '552 5.7.0 Message rejected: content' }).kind).toBe('rejected');
    expect(classifySmtpError({ code: 'ETIMEDOUT', message: 'Connection timeout' }).kind).toBe('retry');
    expect(classifySmtpError({ responseCode: 451, response: '451 4.3.0 Temporary failure' }).kind).toBe('retry');
  });
});
