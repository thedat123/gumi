import { useEffect } from 'react';
import { playSfx } from '../lib/sfx';
import { CompletionPanel } from './CompletionPanel';

/** Nhịp KẾT nhiệm vụ dùng chung cho các minigame: Gumi ăn mừng + báo điểm + hé lộ ngày mai. */
export function MissionDone({ day, points, note }: { day: number; points: number; note?: string }) {
  useEffect(() => { playSfx('win'); }, []);
  return <CompletionPanel day={day} points={points} note={note} />;
}
