# Backend Supabase — Level Down Challenge

Nguồn sự thật điểm số/trạng thái nằm ở SQL. Frontend chỉ gọi các RPC qua
`src/api/real.ts`; adapter tự bật khi có `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.

## Migrations

| File | Nội dung |
|------|----------|
| `migrations/0001_init.sql` | Bảng + RLS (đọc của chính mình; ghi qua RPC) |
| `migrations/0002_functions.sql` | 18 RPC (SECURITY DEFINER) + bucket `checkins` + policy storage |
| `migrations/0003_seed.sql` | Đổ data: 21 nhiệm vụ, quiz Ngày 2 (1 câu trà sữa), top-10 demo, tường mẫu, cấu hình |
| `migrations/0004_admin.sql` | Allowlist admin + `admin_stats()` |
| `migrations/0005_admin_seed.sql` | Seed email admin (sinh bởi `scripts/gen-admin-migration.mjs`) |
| `migrations/0006_content_quiz.sql` | Quiz Ngày 2 chấm theo KHOẢNG đúng 12–15 + đồng bộ nhiệm vụ Ngày 3 |
| `migrations/0007_tester.sql` | Cờ `is_tester` + RPC mở khoá 21 ngày & bỏ chặn "chỉ chơi hôm nay" |
| `migrations/0008_tester_accounts.sql` | Seed 5 tester + 1 admin (đăng nhập ngay, mở mọi màn) |
| `migrations/0009_real_leaderboard.sql` | Bỏ đối thủ giả + tường mẫu; xếp hạng tính từ người chơi THẬT |

### Tài khoản demo/QA (seed ở 0008)

Đăng nhập được ngay, **mở khoá toàn bộ 21 ngày**, bỏ chặn "chỉ chơi ngày hôm nay":

| Email | Mật khẩu | Vai trò |
|-------|----------|---------|
| `test1@gumi.vn` … `test5@gumi.vn` | `test1234` | tester (mọi màn) |
| `admin@gumi.vn` | `test1234` | admin + tester (vào `/admin`) |

> Đổi/huỷ mật khẩu sau ở Supabase → Authentication. Các email này cũng có sẵn trong mock (`src/api/mock.ts`) để demo không cần backend.

Seed đặt `start_date = current_date` → mở **Ngày 1 = hôm nay**. Đổi ngày mở:
`update public.app_config set start_date = 'YYYY-MM-DD';`

## Áp dụng

**Cách 1 — Supabase CLI (khuyến nghị)**
```bash
supabase link --project-ref <ref>
supabase db push          # chạy các file trong migrations/ theo thứ tự
```

**Cách 2 — SQL Editor trên dashboard**
Dán lần lượt nội dung `0001` → `0002` → `0003` và Run.

**Cách 3 — psql**
```bash
psql "$DATABASE_URL" -f supabase/migrations/0001_init.sql
psql "$DATABASE_URL" -f supabase/migrations/0002_functions.sql
psql "$DATABASE_URL" -f supabase/migrations/0003_seed.sql
```

Sau đó điền `.env.local`:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_DATA_SOURCE=auto
```

## Xác thực & phân quyền
- Quyền admin theo **allowlist** (migration `0004_admin.sql`): chỉ email nằm trong bảng
  `public.admin_emails` mới là admin (xem thống kê, duyệt/gỡ ảnh). Thêm admin:
  ```sql
  insert into public.admin_emails(email) values ('ban.to.chuc@example.com') on conflict do nothing;
  ```
  Người dùng thường **không thể tự phong** admin (trước đây mọi email `admin%` đều thành admin — đã bỏ).
  Client (mock) đọc allowlist từ `VITE_ADMIN_EMAILS` — đặt cùng danh sách email cho khớp.
- `admin_stats()` và mọi RPC `admin_*` đều kiểm `_is_admin()` phía DB (security definer) → chặn kể cả khi vượt được UI.
- Ảnh check-in lưu ở bucket riêng tư `checkins/<user_id>/<day>.jpg`; chỉ chủ ảnh & admin đọc được.

## Kiểm thử cục bộ (không cần Supabase)
Migrations đã được chạy thử trên Postgres 16 với stub tối thiểu cho schema
`auth`/`storage` (`auth.users`, `auth.uid()`, `storage.buckets/objects/foldername`).
Toàn bộ RPC + luồng admin + công thức điểm/chuỗi cho kết quả khớp `src/lib/scoring.ts`.
