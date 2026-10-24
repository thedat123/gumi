import { lazy, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { loaderFor } from './missionGames';

// Mỗi loader chỉ bọc lazy() MỘT lần (giữ cùng component giữa các lần render → không remount game).
const lazyCache = new Map<number, ReturnType<typeof lazy>>();
const gameFor = (day: number) => {
  let C = lazyCache.get(day);
  if (!C) { C = lazy(loaderFor(day)); lazyCache.set(day, C); }
  return C;
};

/** Điều phối màn chơi theo ngày (bảng ở missionGames.ts). Không có Suspense riêng: dùng boundary của AppShell
 *  → chuyển từ màn Chương sang là transition, màn Chương đứng yên tới khi game sẵn sàng (không chớp spinner). */
export function MissionRouter() {
  const { day } = useParams();
  const n = Number(day) || 1;
  const Game = useMemo(() => gameFor(n), [n]);
  return <div data-game-active="true" style={{ display: 'contents' }}><Game /></div>;
}
