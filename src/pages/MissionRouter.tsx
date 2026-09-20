import { useParams } from 'react-router-dom';
import { CheckIn } from './CheckIn';
import { Day4 } from './Day4';
import { Day7 } from './Day7';
import { Quiz } from './Quiz';
import { Wall } from './Wall';

// Nhiệm vụ KNOW (Day 2/4/7) và FINAL (Day 10) có màn riêng; các ngày còn lại là check-in ảnh.
export function MissionRouter() {
  const { day } = useParams();
  const n = Number(day) || 1;
  if (n === 2) return <Quiz />;
  if (n === 4) return <Day4 />;
  if (n === 7) return <Day7 />;
  if (n === 10) return <Wall />;
  return <CheckIn />;
}
