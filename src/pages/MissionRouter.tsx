import { useParams } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Loading } from '../components/Loading';
const CheckIn = lazy(() => import('./CheckIn').then(m => ({ default: m.CheckIn })));
const Day7 = lazy(() => import('./Day7').then(m => ({ default: m.Day7 })));
const Quiz = lazy(() => import('./Quiz').then(m => ({ default: m.Quiz })));
const Crossword = lazy(() => import('./minigames/Crossword').then(m => ({ default: m.Crossword })));
const Day14Final = lazy(() => import('./minigames/Day14Final').then(m => ({ default: m.Day14Final })));
const FlappyBird = lazy(() => import('./minigames/FlappyBird').then(m => ({ default: m.FlappyBird })));
const MemoryMatch = lazy(() => import('./minigames/MemoryMatch').then(m => ({ default: m.MemoryMatch })));
const QuickQuiz = lazy(() => import('./minigames/QuickQuiz').then(m => ({ default: m.QuickQuiz })));
const SortGame = lazy(() => import('./minigames/SortGame').then(m => ({ default: m.SortGame })));
const WordHunt = lazy(() => import('./minigames/WordHunt').then(m => ({ default: m.WordHunt })));

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
  const games: Record<number, typeof CheckIn> = { 2: Quiz, 3: Day7, 5: SortGame, 7: FlappyBird, 8: QuickQuiz,
    9: WordHunt, 11: Crossword, 12: MemoryMatch, 14: Day14Final };
  const Game = games[n] ?? CheckIn;
  return <Suspense fallback={<Loading />}><Game /></Suspense>;
}
