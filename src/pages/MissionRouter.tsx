import { useParams } from 'react-router-dom';
import { CheckIn } from './CheckIn';
import { Day4 } from './Day4';
import { Day7 } from './Day7';
import { Quiz } from './Quiz';
import { Wall } from './Wall';
import { EnergyTracker } from './minigames/EnergyTracker';
import { MemoryMatch } from './minigames/MemoryMatch';
import { QuickQuiz } from './minigames/QuickQuiz';
import { SortGame } from './minigames/SortGame';
import { SpinWheel } from './minigames/SpinWheel';
import { WordHunt } from './minigames/WordHunt';

// Điều phối màn chơi theo ngày cho hành trình 21 ngày. Mỗi ngày GAME/KNOW/TRACKER có minigame riêng;
// các ngày DRINK/SHARE là check-in ảnh.
//   2 Quiz (đoán thìa) · 3 & 16… đuổi hình · 6 xếp độ ngọt · 7 & 17 trắc nghiệm · 9 truy tìm mật khẩu
//   11 vạch mặt đường ẩn · 12 & 18 lật thẻ trí nhớ · 14 energy tracker · 19 vòng quay · 21 bức tường tốt nghiệp.
export function MissionRouter() {
  const { day } = useParams();
  const n = Number(day) || 1;
  switch (n) {
    case 2: return <Quiz />;
    case 3: return <Day7 />;
    case 6: return <SortGame />;
    case 7: case 16: case 17: return <QuickQuiz />;
    case 9: return <WordHunt />;
    case 11: return <Day4 />;
    case 12: case 18: return <MemoryMatch />;
    case 14: return <EnergyTracker />;
    case 19: return <SpinWheel />;
    case 21: return <Wall />;
    default: return <CheckIn />; // DRINK / SHARE → check-in ảnh
  }
}
