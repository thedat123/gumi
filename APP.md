# Level Down Challenge — app thật (web + PWA)

Đây là **ứng dụng production** ở gốc project `gumi/` (`src/`). Một codebase React chạy trên **web** và cài được như **app** (PWA) trên iOS/Android. Dữ liệu đi qua **một lớp API** có hai adapter: **mock** (chạy ngay, không cần backend) và **Supabase** (bật khi có khoá). UI không biết dữ liệu đến từ đâu.

Spec gốc (đặc tả game + quyết định D1–D8, quy ước kỹ thuật/RLS/RPC) ở `docs/brief.md` và `docs/CLAUDE.md`. Skill Claude Code ở `.claude/skills/` (ui-prototype, ui-review, sprint).

## Chạy

```bash
npm install
npm run dev            # mở http://localhost:5173  (dùng mock, chơi được cả 10 ngày)
npm run dev -- --host  # mở trên điện thoại cùng wifi (địa chỉ "Network")
npm run check          # typecheck + test (18) + build production
npm run build          # ra dist/ (kèm manifest, service worker, icon, _redirects)
npm run preview        # phục vụ bản build để thử PWA/service worker
```

Mock **lưu tiến trình ở localStorage của trình duyệt** (chỉ mock). Xoá để chơi lại: DevTools → Application → Local Storage → xoá khoá `ld_mock_v1`. Đăng nhập nhanh khi demo: email bất kỳ + mật khẩu `gumi1234`. Email bắt đầu bằng `admin` sẽ có vai admin (thấy tab **Duyệt ảnh**).

## Kiến trúc

```
src/
  api/
    types.ts     hợp đồng API + mô hình miền (UI chỉ phụ thuộc file này)
    index.ts     chọn adapter theo env (mock ↔ supabase)
    mock.ts      dữ liệu giả, có trạng thái, bám quyết định D1–D8; lưu localStorage
    real.ts      adapter Supabase: map từng RPC/Storage/Auth (SẴN SÀNG, chờ backend)
    client.ts    khởi tạo Supabase client từ env
  app/
    session.tsx  phiên đăng nhập + hồ sơ (bọc api.auth)
    guards.tsx   RequireAuth / RequireProfile / RequireAdmin
    useAsync.ts  hook nạp dữ liệu (loading/error/reload)
  lib/
    sugar.ts     công thức đường (D7)
    scoring.ts   tính điểm/chuỗi/trạng thái ngày (thuần, có test)
    errors.ts    map mã lỗi API → tiếng Việt
  components/    Button, Card, Input, Banner, DayStrip, MissionCard, SugarPassDialog,
                 Gumi (mascot SVG có chuyển động), AppShell, AsyncView, Loading
  pages/         Landing, Login, Signup, Terms, Onboarding, Dashboard, MissionRouter,
                 CheckIn, Quiz, Day4, Day7, Wall, Summary, Leaderboard, Admin, Profile, SystemState
  content/vi.ts  toàn bộ chữ tiếng Việt (câu sức khoẻ đánh dấu [PHÁP LÝ])
  main.tsx       BrowserRouter + đăng ký service worker
public/
  manifest.webmanifest, sw.js, offline.html, icons/, _redirects
```

Định tuyến dùng **BrowserRouter** (URL sạch, không `#`). `public/_redirects` cho Cloudflare Pages trả `index.html` cho mọi đường dẫn (SPA fallback).

## Bật Supabase thật

1. Copy `.env.example` → `.env.local` (không commit) và điền:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
   Có đủ hai biến và `VITE_DATA_SOURCE` khác `mock` → app tự dùng adapter Supabase.
2. Backend cần cung cấp đúng **hợp đồng trong `src/api/types.ts`**. `src/api/real.ts` đã gọi sẵn:
   - Auth: `signUp`, `signInWithPassword`, `signOut`, `onAuthStateChange`
   - RPC (security definer, `set search_path=public`, kiểm `auth.uid()`):
     `get_profile`, `create_profile`, `update_profile`, `get_campaign_state`,
     `get_my_journey`, `get_leaderboard`, `submit_checkin`, `use_sugar_pass`,
     `get_quiz_questions`, `submit_quiz`, `submit_minigame`, `submit_wall_post`,
     `get_wall_posts`, `get_my_summary`, `admin_list_checkins`, `admin_list_flags`,
     `admin_set_checkin_status`
   - Storage: bucket `checkins` (riêng tư), đường dẫn `<user_id>/<day>.jpg`
   Các RPC/RLS này do đội agent dựng qua task backend (T-002…T-019). Nguồn sự thật điểm số là SQL; `scoring.ts` chỉ phục vụ mock và hiển thị phụ.

## PWA (cài như app)

- `public/manifest.webmanifest`: tên, màu, icon 192/512 + maskable + SVG, `display: standalone`.
- `public/sw.js`: service worker tự viết. Điều hướng **network-first** rồi rơi về vỏ app đã cache khi offline; tài nguyên tĩnh cùng miền **stale-while-revalidate**; **không** đụng request Supabase. Đổi `VERSION` trong `sw.js` mỗi lần deploy để làm mới cache.
- iOS/Android: mở web → **Chia sẻ → Thêm vào Màn hình chính** → chạy toàn màn hình như app.
- Icon sinh từ `public/icons/icon.svg`: `npm run icons` (cần Chromium của Playwright; script tự tìm ở `prototype/node_modules`).

## Deploy Cloudflare Pages

- Build command: `npm run build` — Output directory: `dist`
- Đặt biến môi trường `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` trong Pages (khi có backend).
- `public/_redirects` đã lo SPA fallback. Không deploy `dist` lên máy chủ có secret production.

## Còn phải làm / con người kiểm

- Backend Supabase thật (migrations, RLS, RPC, seed, auth Google/email) — chưa dựng; adapter đã sẵn.
- Nén ảnh ở client trước khi upload (`browser-image-compression`) — thêm khi nối Storage thật.
- Hình Gumi là **placeholder SVG**; thay bằng bản của designer (giữ tên lớp `g-actor/g-breath/...`).
- Số liệu đường trong quiz/infographic là **PLACEHOLDER** — cần chuyên môn dinh dưỡng/y tế duyệt (mọi câu đánh dấu `[PHÁP LÝ]` trong `src/content/vi.ts`).
- Thử thật trên **iPhone Safari** và trong **Zalo/Facebook**, đặc biệt card Story 9:16 (`html-to-image` hay lỗi trên Safari).

## Ghi chú

Prototype (khung duyệt UI theo trạng thái) đã được gỡ; app `src/` này kế thừa hệ thiết kế, component, Gumi, nội dung và test từ đó. Muốn dựng lại prototype để duyệt UI, dùng skill `.claude/skills/level-down-ui-prototype`. Skill `level-down-sprint` trước đây điều phối đội agent (`agents/run.mjs`) — bộ đó đã gỡ, nên skill này chỉ còn giá trị tham khảo.
