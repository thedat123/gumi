import { useState } from 'react';
import { Wall } from '../Wall';
import { BossBattle } from './BossBattle';

/**
 * Ngày 14 — CỬA ẢI cuối: trước tiên hứng nước lành hạ Boss Đường (BossBattle ở chế độ "cổng",
 * KHÔNG tự chấm điểm), thắng rồi mới mở bước viết Lời Nhắn Tốt Nghiệp gửi lên Bức Tường
 * cộng đồng (Wall chốt hoàn thành + điểm ngày 14 + dẫn tới thẻ tổng kết).
 */
export function Day14Final() {
  const [won, setWon] = useState(false);
  return won ? <Wall /> : <BossBattle onWon={() => setWon(true)} />;
}
