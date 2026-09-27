import { useParams } from 'react-router-dom';
import { CheckIn } from './CheckIn';
import { Day4 } from './Day4';
import { Day7 } from './Day7';
import { Quiz } from './Quiz';
import { Crossword } from './minigames/Crossword';
import { Day21Final } from './minigames/Day21Final';
import { FlappyBird } from './minigames/FlappyBird';
import { MemoryMatch } from './minigames/MemoryMatch';
import { QuickQuiz } from './minigames/QuickQuiz';
import { SortGame } from './minigames/SortGame';
import { SpinWheel } from './minigames/SpinWheel';
import { SugarRun } from './minigames/SugarRun';
import { WordHunt } from './minigames/WordHunt';

// Điều phối màn chơi theo ngày cho hành trình 21 ngày. Các ngày thường giữ nguyên (quiz/đuổi hình/check-in ảnh);
// riêng 3 CỬA ẢI cuối Hồi (gặp Boss) là GAME ARCADE full màn:
//   7  → Flappy Bird "Bay Qua Cơn Thèm" (qua mỗi cột +1, tối đa 50đ)
//   14 → Endless Runner "Chạy Trốn Cơn Thèm" (nhảy/trượt né đồ ngọt)
//   16 → CROSSWORD "Gumi Bắt Chữ" (đồng hồ 3 phút, hết giờ dừng)
//   21 → "Giải Cứu Mèo Gumi" (sliding) rồi gửi Lời Nhắn Tốt Nghiệp lên bức tường
export function MissionRouter() {
  const { day } = useParams();
  const n = Number(day) || 1;
  switch (n) {
    case 2: return <Quiz />;
    case 3: return <Day7 />;
    case 6: return <SortGame />;
    case 7: return <FlappyBird />;                 // CỬA ẢI Hồi 1 — Flappy Bird
    case 16: return <Crossword />;                  // Ngày 16 — CROSSWORD "Gumi Bắt Chữ" (đồng hồ 3 phút)
    case 17: return <QuickQuiz />;
    case 9: return <WordHunt />;
    case 11: return <Day4 />;
    case 12: case 18: return <MemoryMatch />;
    case 14: return <SugarRun />;                   // CỬA ẢI Hồi 2 — Endless Runner né đồ ngọt
    case 21: return <Day21Final />;                 // CỬA ẢI cuối — Giải Cứu Mèo Gumi (sliding) → gửi lời nhắn tốt nghiệp
    case 19: return <SpinWheel />;
    default: return <CheckIn />; // DRINK / SHARE → check-in ảnh
  }
}
