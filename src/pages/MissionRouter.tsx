import { useParams } from 'react-router-dom';
import { vi } from '../content/vi';
import { CheckIn } from './CheckIn';
import { Day4 } from './Day4';
import { Day7 } from './Day7';
import { Quiz } from './Quiz';
import { TapMission } from './TapMission';
import { Wall } from './Wall';

// Điều phối theo ngày cho hành trình 21 ngày:
//  2 → Quiz (đoán thìa) · 3 → Đuổi hình bắt chữ · 11 → Vạch mặt đường ẩn · 21 → Bức tường tốt nghiệp.
//  GAME/KNOW/TRACKER còn lại → TapMission (minigame đầy đủ lắp sau). DRINK/SHARE → check-in ảnh.
export function MissionRouter() {
  const { day } = useParams();
  const n = Number(day) || 1;
  if (n === 2) return <Quiz />;
  if (n === 3) return <Day7 />;
  if (n === 11) return <Day4 />;
  if (n === 21) return <Wall />;
  const kind = vi.missions[n - 1]?.kind;
  if (kind === 'GAME' || kind === 'KNOW' || kind === 'TRACKER') return <TapMission />;
  return <CheckIn />;
}
