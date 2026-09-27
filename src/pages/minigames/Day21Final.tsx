import { useState } from 'react';
import { Wall } from '../Wall';
import { SlidingPuzzle } from './SlidingPuzzle';

/**
 * Ngày 21 — CỬA ẢI cuối: trước tiên giải cứu Gumi (sliding puzzle), thắng rồi mới mở bước
 * viết Lời Nhắn Tốt Nghiệp gửi lên Bức Tường Cộng Đồng (chốt hoàn thành + dẫn tới thẻ tổng kết).
 */
export function Day21Final() {
  const [rescued, setRescued] = useState(false);
  return rescued ? <Wall /> : <SlidingPuzzle onSolved={() => setRescued(true)} />;
}
