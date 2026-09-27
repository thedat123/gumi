# Deploy thật — Level Down Challenge (Gumi)

Kiến trúc: **Frontend** (Vite SPA + PWA) trên **Cloudflare Pages** · **Backend/DB** trên **Supabase** (Postgres + Auth + Storage). Nguồn sự thật điểm số nằm ở SQL (RPC security definer).

---

## 1. Tạo project Supabase (bạn làm — ~2 phút)

1. Vào <https://supabase.com> → **New project**.
2. **Region: Southeast Asia (Singapore)** — gần Việt Nam nhất → độ trễ thấp nhất.
3. Đặt **Database password** (lưu lại, dùng để push migration).
4. Đợi project khởi tạo xong (~1 phút).

Lấy 3 thông tin (Settings):
| Cần | Chỗ lấy |
|-----|---------|
| **Project URL** | Settings → API → Project URL (`https://<ref>.supabase.co`) |
| **anon key** | Settings → API Keys → `anon` `public` (hoặc "Publishable key") |
| **Connection string** | Settings → Database → Connection string → **URI**, cổng **5432** (Direct/Session mode) |

---

## 2. Push migration (mình chạy khi có connection string)

```bash
scripts/db-push.sh "postgresql://postgres:PASSWORD@db.<ref>.supabase.co:5432/postgres"
```

Chạy tuần tự `0001_init` → `0002_functions` → `0003_seed` → `0004_admin`, dừng ngay nếu lỗi. Idempotent — chạy lại an toàn.

---

## 2b. Cấp quyền Admin (allowlist)

Admin **không** còn tự phong bằng email `admin...`. Chỉ email nằm trong bảng `public.admin_emails` mới là admin.

Sinh migration seed từ danh sách email (đọc `VITE_ADMIN_EMAILS` trong `.env.local`, hoặc truyền thẳng):

```bash
npm run admin:migration -- ban.to.chuc@example.com admin2@example.com
# → tạo supabase/migrations/000X_admin_seed.sql, rồi push:
scripts/db-push.sh "postgresql://postgres:PASSWORD@db.<ref>.supabase.co:5432/postgres"
```

Hoặc thêm nhanh trực tiếp trong Supabase → SQL Editor:
```sql
insert into public.admin_emails(email) values ('ban.to.chuc@example.com') on conflict do nothing;
```

Đặt **cùng danh sách** này vào `VITE_ADMIN_EMAILS` để client hiện tab Quản trị cho đúng người.

---

## 3. Cấu hình Supabase Auth (bạn bấm — 1 phút)

- **Authentication → Providers → Email**: nếu muốn đăng ký không cần xác nhận email cho demo, tắt **"Confirm email"**.
- **Authentication → URL Configuration → Redirect URLs**: thêm domain deploy, ví dụ `https://gumi.pages.dev/**` và `http://localhost:5173/**` (để test local). Link đặt lại mật khẩu trỏ về `.../reset-password`, đã nằm trong pattern `/**`.
- **Site URL**: đặt đúng domain production (dùng cho link trong email khôi phục).

### (Tuỳ chọn) Đăng nhập Google
1. Google Cloud Console → tạo **OAuth client ID** (Web application).
2. **Authorized redirect URI**: `https://<ref>.supabase.co/auth/v1/callback`.
3. Supabase → Authentication → Providers → **Google** → dán **Client ID** + **Client Secret** → Save.

---

## 4. Env vars

Local (`.env.local` — KHÔNG commit):
```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
VITE_DATA_SOURCE=auto
VITE_ADMIN_EMAILS=ban.to.chuc@example.com   # email admin, nhiều email ngăn cách dấu phẩy
VITE_GCV_API_KEY=<key Cloud Vision, tuỳ chọn>
```

Trên Cloudflare Pages: **Settings → Environment variables → Production** đặt đúng các biến `VITE_*` trên. Vite nhúng biến lúc **build**, nên đổi env phải **build lại**.

---

## 5. Deploy Cloudflare Pages (bạn kết nối repo — 1 lần)

1. <https://dash.cloudflare.com> → **Workers & Pages → Create → Pages → Connect to Git**.
2. Chọn repo `thedat123/gumi`, nhánh `main`.
3. Build settings:
   - **Framework preset:** None / Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Thêm env vars ở mục 4 → **Save and Deploy**.

Mỗi lần push `main` → Cloudflare tự build & deploy. `public/_redirects` lo SPA routing, `public/_headers` lo cache.

---

## 6. Email chuyên nghiệp (SMTP riêng + template)

Mặc định Supabase gửi email bằng SMTP dùng chung — bị **giới hạn ~3–4 email/giờ** và dễ vào Spam, **không dùng cho production**. Để email "Quên mật khẩu"/"Xác nhận" gửi ổn định, tên miền riêng, ít vào Spam:

1. **Tạo tài khoản gửi mail** (chọn 1): [Resend](https://resend.com) (khuyên dùng, có free tier), SendGrid, Amazon SES, hoặc Postmark. Xác thực **domain** (SPF/DKIM) theo hướng dẫn của nhà cung cấp → email đi từ `no-reply@tenmien.com` sẽ được tin cậy.
2. **Supabase → Authentication → Emails → SMTP Settings → Enable Custom SMTP**, điền:
   - Host / Port (vd Resend: `smtp.resend.com` : `465`)
   - Username / Password (API key của nhà cung cấp)
   - **Sender email/name**: `no-reply@tenmien.com` / `Gumi – Level Down Challenge`
3. **Authentication → Emails → Templates → Reset Password**: đổi sang nội dung tiếng Việt có thương hiệu. Giữ biến `{{ .ConfirmationURL }}` (link khôi phục):

```html
<h2>Đặt lại mật khẩu Gumi 🐱</h2>
<p>Chào bạn, bạn (hoặc ai đó) vừa yêu cầu đặt lại mật khẩu cho tài khoản Level Down Challenge.</p>
<p>Bấm nút dưới đây để chọn mật khẩu mới (link có hiệu lực trong 60 phút):</p>
<p><a href="{{ .ConfirmationURL }}"
      style="display:inline-block;padding:12px 20px;background:#B83556;color:#fff;border-radius:999px;text-decoration:none;font-weight:700">
   Đặt lại mật khẩu</a></p>
<p style="color:#888;font-size:13px">Nếu không phải bạn yêu cầu, cứ bỏ qua email này — mật khẩu hiện tại vẫn an toàn.</p>
```

4. (Tuỳ chọn) Chỉnh **thời hạn link** ở Authentication → Providers → Email → *OTP/link expiry*.

> Lưu ý: gửi email là dịch vụ **phía Supabase/nhà cung cấp SMTP**, không nằm trong code app. App chỉ gọi `resetPasswordForEmail()` (đã có ở `src/api/real.ts`).

---

## 7. Đóng gói thành APP

App đã là **PWA cài được sẵn** — không cần làm gì thêm cho bản web-app:

### A. Cài như app (PWA — miễn phí, khuyên dùng cho chiến dịch)
- **Android/Chrome:** mở web đã deploy → menu ⋮ → **"Cài ứng dụng" / "Thêm vào màn hình chính"**.
- **iOS/Safari:** nút Chia sẻ → **"Thêm vào MH chính"**.
- Mở lên chạy **toàn màn hình như app thật** (đã có `manifest.webmanifest`, service worker chạy offline cơ bản, icon `public/icons/`).
- Muốn dụ người dùng cài: có thể bắt sự kiện `beforeinstallprompt` để hiện nút "Cài app" (chưa bật, thêm khi cần).

### B. Đưa lên App Store / Google Play

**Cách nhanh nhất — PWABuilder** (không cần code): vào <https://pwabuilder.com>, dán URL đã deploy → tải gói **Android (.aab)** / **iOS** đã ký sẵn khung → nộp store.

**Chủ động hơn — Capacitor** (đã có sẵn `capacitor.config.json`, `webDir: dist`):
```bash
npm i -D @capacitor/cli && npm i @capacitor/core @capacitor/android @capacitor/ios
npm run build            # tạo dist/
npx cap add android      # cần Android Studio
npx cap add ios          # cần macOS + Xcode
npx cap sync             # copy dist/ vào 2 project native
npx cap open android     # mở Android Studio để build .aab → Google Play
npx cap open ios         # mở Xcode để build → App Store
```
Mỗi lần đổi web: `npm run build && npx cap sync`. App native chỉ là "vỏ" nạp bản web `dist/` — vẫn dùng chung Supabase.

> Lưu ý store: cần app icon/splash (Capacitor có `@capacitor/assets` tạo từ 1 ảnh 1024×1024), mô tả, ảnh chụp màn hình, và (iOS) tài khoản Apple Developer 99$/năm; Google Play 25$ một lần.

---

## Kiểm tra sau deploy
- Mở trang → đăng ký email → tạo hồ sơ → check-in Ngày 1 → xem điểm/bảng xếp hạng cập nhật (dữ liệu thật trong Supabase, không phải mock).
- DevTools → Network: request tới `<ref>.supabase.co/rest/v1/rpc/...` trả 200.
