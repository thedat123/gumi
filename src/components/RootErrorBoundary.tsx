import { Component, type ReactNode } from 'react';

const RELOAD_KEY = 'ld_chunk_reload';

/** Lỗi tải chunk (deploy mới xoá file cũ, mạng chập chờn) → tải lại trang là hết. */
export function isChunkError(e: unknown): boolean {
  const msg = e instanceof Error ? `${e.name} ${e.message}` : String(e);
  return /dynamically imported module|Importing a module script failed|Failed to fetch|ChunkLoadError|error loading dynamically/i.test(msg);
}

/** Tải lại 1 lần cho mỗi phiên (tránh vòng lặp reload khi mạng hỏng hẳn). */
export function reloadOnce(): boolean {
  try {
    if (sessionStorage.getItem(RELOAD_KEY)) return false;
    sessionStorage.setItem(RELOAD_KEY, '1');
  } catch { /* private mode */ }
  window.location.reload();
  return true;
}

/** Lưới an toàn GỐC: lỗi bất kỳ khi render không còn làm app trắng màn ("die"), mà hiện nút tải lại. */
export class RootErrorBoundary extends Component<{ children: ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  componentDidCatch(e: unknown) {
    if (isChunkError(e)) reloadOnce();
  }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, textAlign: 'center', background: '#FADED2', color: '#3a241e', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ fontSize: 48 }} aria-hidden="true">🐱</div>
        <p style={{ fontWeight: 700, fontSize: 18, margin: 0 }}>Gumi vấp ngã một chút rồi</p>
        <p style={{ fontSize: 14, margin: 0, opacity: 0.75 }}>Bấm tải lại để vào tiếp nhé.</p>
        <button
          type="button"
          onClick={() => { try { localStorage.setItem('gfx', 'low'); sessionStorage.removeItem(RELOAD_KEY); } catch { /* private mode */ } window.location.reload(); }}
          style={{ minHeight: 48, padding: '0 24px', border: 0, borderRadius: 16, background: '#B83556', color: '#fff', fontWeight: 700, fontSize: 16 }}
        >
          Tải lại
        </button>
      </div>
    );
  }
}
