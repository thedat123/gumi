import { useParams } from 'react-router-dom';
import { CheckIn } from './CheckIn';
import { Day7 } from './Day7';
import { Quiz } from './Quiz';
import { Crossword } from './minigames/Crossword';
import { Day14Final } from './minigames/Day14Final';
import { FlappyBird } from './minigames/FlappyBird';
import { MemoryMatch } from './minigames/MemoryMatch';
import { QuickQuiz } from './minigames/QuickQuiz';
import { SortGame } from './minigames/SortGame';
import { WordHunt } from './minigames/WordHunt';

// Điều phối màn chơi theo ngày cho hành trình 14 ngày (khớp vi.missions):
//   2  → Quiz "Đoán Thìa Đoán Muỗng"        8  → QuickQuiz "Trắc Nghiệm Chớp Nhoáng"
//   3  → Day7 "Đuổi Hình Bắt Chữ"           9  → WordHunt "Truy Tìm Mật Khẩu"
//   5  → SortGame "Đấu Trường Calo"         11 → Crossword "Gumi Bắt Chữ"
//   7  → FlappyBird "Bay Qua Cơn Thèm"      12 → MemoryMatch "Lật Thẻ Trí Nhớ"
//   14 → Day14Final: hứng nước (Boss) → Lời Nhắn Tốt Nghiệp (bức tường)
//   1,4,6,10,13 (DRINK/SHARE) → CheckIn ảnh
export function MissionRouter() {
  const { day } = useParams();
  const n = Number(day) || 1;
  switch (n) {
    case 2: return <Quiz />;
    case 3: return <Day7 />;
    case 5: return <SortGame />;                    // Đấu Trường Calo
    case 7: return <FlappyBird />;                  // CỬA ẢI Hồi 1 — Flappy Gumi
    case 8: return <QuickQuiz />;                   // Trắc nghiệm 3 câu, 10s/câu
    case 9: return <WordHunt />;                    // Wordsearch
    case 11: return <Crossword />;                  // CROSSWORD "Gumi Bắt Chữ" (3 phút)
    case 12: return <MemoryMatch />;                // Lật Thẻ Trí Nhớ
    case 14: return <Day14Final />;                 // CỬA ẢI cuối — hứng nước → lời nhắn tốt nghiệp
    default: return <CheckIn />;                    // DRINK / SHARE → check-in ảnh
  }
}
