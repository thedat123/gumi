// Thời gian tương đối tiếng Việt ("5 phút trước"…) cho tường cộng đồng & chuông thông báo.

/** Đọc mốc thời gian ISO; chấp nhận cả múi giờ rút gọn "+07"/"+00" (Postgres to_char 'OF') mà
 *  trình duyệt không tự hiểu → trả NaN nếu không đọc được. */
export function parseIso(iso: string | null | undefined): number {
  if (!iso) return NaN;
  const fixed = iso.trim().replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00');
  return new Date(fixed).getTime();
}

export function timeAgo(iso: string | null | undefined, now = Date.now()): string {
  const ms = parseIso(iso);
  if (Number.isNaN(ms)) return '';
  const s = Math.max(0, (now - ms) / 1000);
  if (s < 60) return 'vừa xong';
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  if (s < 172800) return 'hôm qua';
  return `${Math.floor(s / 86400)} ngày trước`;
}
