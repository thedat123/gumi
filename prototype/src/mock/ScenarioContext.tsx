import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { scenarioById, type Scenario } from './scenarios';

export type GumiEvent = 'cheer' | 'revive' | 'evolve';
export type CheckinMode = 'interactive' | 'photo_selected' | 'uploading' | 'success' | 'error_network' | 'not_today' | 'already_done' | 'level_not_allowed' | 'photo_too_large_or_not_image';
export type LeaderboardMode = 'in_top10' | 'outside_top10_with_gap' | 'empty' | 'loading' | 'error';

interface Ctx {
  scenario: Scenario;
  setScenarioId: (id: string) => void;
  event: { name: GumiEvent; key: number } | null;
  fireEvent: (name: GumiEvent) => void;
  checkinMode: CheckinMode;
  setCheckinMode: (m: CheckinMode) => void;
  leaderboardMode: LeaderboardMode;
  setLeaderboardMode: (m: LeaderboardMode) => void;
  reducedMotion: boolean;
  setReducedMotion: (v: boolean) => void;
}

const ScenarioContext = createContext<Ctx | null>(null);

export function ScenarioProvider({ children }: { children: ReactNode }) {
  const [params, setParams] = useSearchParams();
  const scenario = scenarioById(params.get('s'));
  const [event, setEvent] = useState<Ctx['event']>(null);
  const counter = useRef(0);
  const [checkinMode, setCheckinMode] = useState<CheckinMode>('interactive');
  const [leaderboardMode, setLeaderboardMode] = useState<LeaderboardMode>(scenario.rank > 10 ? 'outside_top10_with_gap' : 'in_top10');
  const [reducedMotion, setReducedMotion] = useState(false);

  const setScenarioId = useCallback((id: string) => {
    const next = new URLSearchParams(params);
    next.set('s', id);
    setParams(next, { replace: true });
    const sc = scenarioById(id);
    setLeaderboardMode(sc.rank > 10 ? 'outside_top10_with_gap' : 'in_top10');
  }, [params, setParams]);

  const fireEvent = useCallback((name: GumiEvent) => setEvent({ name, key: ++counter.current }), []);

  // Cho phép công cụ chụp ảnh điều khiển qua URL: ?s=dying&event=revive&cmode=error_network&lmode=empty&rm=1
  const startEvent = params.get('event');
  useEffect(() => {
    if (startEvent === 'cheer' || startEvent === 'revive' || startEvent === 'evolve') {
      const t = setTimeout(() => fireEvent(startEvent), 300);
      return () => clearTimeout(t);
    }
  }, [startEvent, fireEvent]);
  const cmode = params.get('cmode');
  useEffect(() => { if (cmode) setCheckinMode(cmode as CheckinMode); }, [cmode]);
  const lmode = params.get('lmode');
  useEffect(() => { if (lmode) setLeaderboardMode(lmode as LeaderboardMode); }, [lmode]);
  const rmParam = params.get('rm') === '1';
  useEffect(() => { if (rmParam) setReducedMotion(true); }, [rmParam]);
  useEffect(() => { document.documentElement.classList.toggle('rm', reducedMotion); }, [reducedMotion]);

  const value = useMemo<Ctx>(() => ({ scenario, setScenarioId, event, fireEvent, checkinMode, setCheckinMode, leaderboardMode, setLeaderboardMode, reducedMotion, setReducedMotion }),
    [scenario, setScenarioId, event, fireEvent, checkinMode, leaderboardMode, reducedMotion]);
  return <ScenarioContext.Provider value={value}>{children}</ScenarioContext.Provider>;
}

export function useScenario(): Ctx {
  const c = useContext(ScenarioContext);
  if (!c) throw new Error('useScenario phải nằm trong ScenarioProvider');
  return c;
}
