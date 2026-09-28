import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import './room.css';
import './game.css';
import { App } from './App';
import { registerSW } from './pwa';
import { applyGfxClass } from './lib/quality';

applyGfxClass(); // gắn hạng đồ hoạ (gfx-low|mid|high) lên <html> để CSS + cảnh 3D hạ tải theo máy

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);

registerSW();
