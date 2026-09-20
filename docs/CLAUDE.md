# CLAUDE.md — Level Down Challenge

Mọi agent đọc file này trước khi làm. Brief gốc ở `brief.md` (gồm cả mục "Quyết định đã chốt").

## Sản phẩm
Web app game "10 ngày bớt ngọt": người chơi đăng ký, làm 1 nhiệm vụ mỗi ngày trong 10 ngày, tích điểm + streak, lên bảng xếp hạng. Quy mô ~100 người, chạy 10 ngày. Giao diện tiếng Việt, ưu tiên mobile.

## Stack (đã chốt, đừng đổi)
- Frontend: Vite + React + TypeScript + Tailwind + React Router (SPA, không SSR)
- Backend: Supabase (Auth, Postgres, Storage). KHÔNG viết API server riêng; logic nằm trong Postgres function (RPC) và view.
- Test: Vitest (unit + SQL), Playwright (e2e)
- Deploy: Cloudflare Pages (người làm, không phải agent)
- Ngôn ngữ: code/identifier tiếng Anh; chuỗi hiển thị cho người chơi bằng tiếng Việt có dấu.

## Lệnh chuẩn (T-001/T-002 tạo ra)
| Lệnh | Việc |
|---|---|
| `npm run gate` | `db:reset` + `typecheck` + `lint` + `npm test`. Xanh mới được coi là xong |
| `npm test` | Vitest: unit + SQL test |
| `npm run test:e2e` | Playwright (cần Supabase local đang chạy) |
| `npm run db:reset` | `npx supabase db reset` — áp lại toàn bộ migration + seed |
| `npm run dev` | Vite dev server |

## Cấu trúc thư mục
```
src/            code ứng dụng (dev)
supabase/migrations/   migration SQL, chỉ THÊM file mới, không sửa file cũ (dev)
supabase/seed.sql      dữ liệu seed (dev)
tests/          unit + SQL test (QA; ở task setup thì dev)
e2e/            Playwright (QA)
reports/        báo cáo verifier
tasks/  tasks.json  brief.md  CLAUDE.md  agents/  .claude/   → agent KHÔNG được sửa
```

## Quy ước kỹ thuật
- **Thời gian:** mọi tính toán "ngày của chiến dịch" dùng múi giờ `Asia/Ho_Chi_Minh` (UTC+7, không có DST). Ngày theo LỊCH CHUNG: Day N = `start_date + (N-1)`. Trong SQL luôn dùng `campaign_now()` thay cho `now()`; hàm này trả `coalesce(campaign_config.now_override, now())`. `now_override` phải là NULL ở production.
- **Nguồn sự thật cho điểm là SQL** (bảng `missions`, view điểm, RPC). Frontend chỉ hiển thị, không tự tính điểm.
- **RLS bật cho MỌI bảng** trong schema `public`. Mặc định từ chối, chỉ mở đúng thứ cần. Người chơi không đọc được đáp án quiz, không sửa được `points`/`status`.
- **Mọi thay đổi trạng thái đi qua RPC** (`submit_checkin`, `use_sugar_pass`, `submit_quiz`, …) chạy `security definer`, luôn đặt `set search_path = public` và kiểm tra `auth.uid()`.
- **Test SQL:** dùng `pg` kết nối Supabase local (`postgresql://postgres:postgres@127.0.0.1:54322/postgres`), mỗi test chạy trong transaction rồi rollback. Giả lập user bằng `set local role authenticated; select set_config('request.jwt.claims', '{"sub":"<uuid>"}', true);`. Helper nằm ở `tests/helpers/db.ts`.
- **Ảnh check-in:** nén ở client xuống ≤ ~300KB (`browser-image-compression`) trước khi upload lên Storage bucket `checkins` (private, đường dẫn `<user_id>/<day>.jpg`).
- **Mobile-first:** kiểm tra viewport 390×844. Thao tác chính bấm được bằng một tay.
- **Không dùng** localStorage để lưu dữ liệu quan trọng; server là nguồn sự thật.
- Chuỗi tiếng Việt để trong `src/content/` hoặc `src/i18n/`, không rải trong component.
- Cấu hình lint, typecheck và test ở thư mục gốc phải **loại trừ `.claude/`** (nơi chứa skill và khung prototype có `package.json` và test riêng).
- Commit nhỏ, không commit secret, không commit `.env*` (trừ `.env.example`).

## Định nghĩa "xong" của một task
1. `npm run gate` xanh.
2. Mọi AC trong `tasks/<id>.md` có test và test chạy thật.
3. Verifier chạy thật từng AC và ghi `pass` kèm bằng chứng.

## Lessons learned
(retro sẽ điền vào đây sau mỗi milestone)
