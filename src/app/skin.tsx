import { createContext, useContext, useState, type ReactNode } from 'react';

// Skin đang chọn của Gumi, lưu ở localStorage (chỉ prototype). Mặc định 'default' khi chưa có provider (an toàn cho test).
const KEY = 'ld_gumi_skin';
interface SkinCtx { skinId: string; setSkinId: (id: string) => void }
const SkinContext = createContext<SkinCtx>({ skinId: 'default', setSkinId: () => {} });

export function SkinProvider({ children }: { children: ReactNode }) {
  const [skinId, setState] = useState<string>(() => {
    try { return localStorage.getItem(KEY) || 'default'; } catch { return 'default'; }
  });
  const setSkinId = (id: string) => {
    setState(id);
    try { localStorage.setItem(KEY, id); } catch { /* bỏ qua khi không có localStorage */ }
  };
  return <SkinContext.Provider value={{ skinId, setSkinId }}>{children}</SkinContext.Provider>;
}

export const useSkin = () => useContext(SkinContext);
