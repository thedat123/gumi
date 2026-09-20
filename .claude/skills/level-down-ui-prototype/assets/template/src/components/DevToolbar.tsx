import { useState } from 'react';
import { SCENARIOS } from '../mock/scenarios';
import { useScenario, type CheckinMode, type GumiEvent, type LeaderboardMode } from '../mock/ScenarioContext';

const CHECKIN: CheckinMode[] = ['interactive', 'photo_selected', 'uploading', 'success', 'error_network', 'not_today', 'already_done', 'level_not_allowed', 'photo_too_large_or_not_image'];
const BOARD: LeaderboardMode[] = ['in_top10', 'outside_top10_with_gap', 'empty', 'loading', 'error'];
const EVENTS: GumiEvent[] = ['cheer', 'revive', 'evolve'];

/** Thanh công cụ CHỈ dùng khi duyệt prototype: đổi kịch bản, kích hoạt chuyển động, thử giảm chuyển động. Không đưa vào bản thật. */
export function DevToolbar() {
  const s = useScenario();
  const [open, setOpen] = useState(false);
  const sel = 'min-h-11 w-full rounded-control border-2 border-border-strong bg-surface px-2 text-small';
  return (
    <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t-2 border-text bg-surface text-small" data-testid="dev-toolbar">
      <button className="flex min-h-11 w-full items-center justify-between px-4 font-semibold" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span>🛠 Prototype · {s.scenario.label}</span><span aria-hidden="true">{open ? '▾' : '▴'}</span>
      </button>
      {open && (
        <div className="grid max-h-[60dvh] gap-3 overflow-auto p-4 pt-0">
          <label className="grid gap-1">Kịch bản dashboard
            <select className={sel} value={s.scenario.id} onChange={(e) => s.setScenarioId(e.target.value)}>
              {SCENARIOS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
            </select>
          </label>
          <div className="grid gap-1">Chuyển động của Gumi
            <div className="flex gap-2">
              {EVENTS.map((e) => <button key={e} className="min-h-11 flex-1 rounded-control bg-primary px-2 font-semibold text-on-primary" onClick={() => s.fireEvent(e)}>{e}</button>)}
            </div>
          </div>
          <label className="grid gap-1">Màn check-in
            <select className={sel} value={s.checkinMode} onChange={(e) => s.setCheckinMode(e.target.value as CheckinMode)}>{CHECKIN.map((m) => <option key={m}>{m}</option>)}</select>
          </label>
          <label className="grid gap-1">Bảng xếp hạng
            <select className={sel} value={s.leaderboardMode} onChange={(e) => s.setLeaderboardMode(e.target.value as LeaderboardMode)}>{BOARD.map((m) => <option key={m}>{m}</option>)}</select>
          </label>
          <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={s.reducedMotion} onChange={(e) => s.setReducedMotion(e.target.checked)} className="h-5 w-5" />Giả lập "giảm chuyển động"</label>
        </div>
      )}
    </div>
  );
}
