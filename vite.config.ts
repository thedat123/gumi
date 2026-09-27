/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// SPA production cho Cloudflare Pages. Service worker và manifest là file tĩnh trong public/.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // host: true → mở trên mọi giao diện mạng để ĐIỆN THOẠI cùng Wi-Fi vào được (Vite in ra dòng "Network:").
  // allowedHosts: cho phép mở qua tunnel (cloudflared/ngrok) — nếu không Vite chặn "Blocked request".
  server: { host: true, port: 5173, allowedHosts: ['.trycloudflare.com', '.ngrok-free.app', '.ngrok.io'] },
  preview: { host: true, port: 4173 },
  build: { target: 'es2022', sourcemap: false },
  test: { environment: 'node', include: ['src/**/*.test.{ts,tsx}'] },
});
