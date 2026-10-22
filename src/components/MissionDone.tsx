import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { ApiError } from '../api/types';
import { Banner } from './Banner';
import { Button } from './Button';
import { CompletionPanel } from './CompletionPanel';
import { playSfx } from '../lib/sfx';

/** Nhịp KẾT nhiệm vụ dùng chung: Gumi ăn mừng + báo điểm + lưu kết quả (có retry). */
export function MissionDone({ day, points, note, earnedPoints }: {
  day: number;
  points: number;
  note?: string;
  /** Điểm thực tế cần lưu (submit_minigame_score); nếu bỏ qua → dùng điểm mặc định ngày (submit_minigame). */
  earnedPoints?: number;
}) {
  const [saveError, setSaveError] = useState(false);

  const doSave = useCallback(async () => {
    setSaveError(false);
    try {
      if (earnedPoints !== undefined) {
        await api.submitMinigame(day, earnedPoints);
      } else {
        await api.submitMinigame(day);
      }
    } catch (e) {
      // DB idempotent (0038): not_today = đã lưu thành công trước đó → coi là thành công
      if (e instanceof ApiError && (e.code === 'not_today' || e.code === 'already_done')) return;
      setSaveError(true);
    }
  }, [day, earnedPoints]);

  useEffect(() => {
    playSfx('win');
    void doSave();
  }, [doSave]);

  return (
    <CompletionPanel day={day} points={points} note={note}>
      {saveError && (
        <div className="mt-2 flex flex-col gap-2">
          <Banner kind="error">Chưa lưu được kết quả. Kiểm tra mạng và thử lại.</Banner>
          <Button onClick={doSave} block>Thử lại lưu kết quả</Button>
        </div>
      )}
    </CompletionPanel>
  );
}
