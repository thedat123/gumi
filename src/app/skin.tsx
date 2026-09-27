import { createContext, useContext, useState, type ReactNode } from 'react';
import { DEFAULT_OUTFIT, type Outfit, type Slot } from '../lib/wardrobe';

// Outfit đang mặc của Gumi (phối tự do), lưu ở localStorage (prototype).
const KEY = 'ld_gumi_outfit';
interface OutfitCtx { outfit: Outfit; setPiece: (slot: Slot, id: string) => void; reset: () => void }
const OutfitContext = createContext<OutfitCtx>({ outfit: DEFAULT_OUTFIT, setPiece: () => {}, reset: () => {} });

function load(): Outfit {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_OUTFIT, ...(JSON.parse(raw) as Partial<Outfit>) };
    // Di trú nhẹ từ hệ skin cũ (nếu có) — chỉ để không mất cảm giác "đang mặc gì đó".
    const old = localStorage.getItem('ld_gumi_skin');
    if (old && old !== 'default') return { ...DEFAULT_OUTFIT };
  } catch { /* bỏ qua */ }
  return { ...DEFAULT_OUTFIT };
}

export function SkinProvider({ children }: { children: ReactNode }) {
  const [outfit, setState] = useState<Outfit>(load);
  const persist = (o: Outfit) => { setState(o); try { localStorage.setItem(KEY, JSON.stringify(o)); } catch { /* bỏ qua */ } };
  const setPiece = (slot: Slot, id: string) => persist({ ...outfit, [slot]: id });
  const reset = () => persist({ ...DEFAULT_OUTFIT });
  return <OutfitContext.Provider value={{ outfit, setPiece, reset }}>{children}</OutfitContext.Provider>;
}

export const useOutfit = () => useContext(OutfitContext);
