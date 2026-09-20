# Checklist prototype

## Định nghĩa "xong" của prototype sơ sơ
1. `npm run check` xanh (typecheck, test, kiểm tra chuyển động, build).
2. `ui-coverage.json` cập nhật và `check_coverage.mjs` (skill level-down-ui-review) cho biết đúng những gì còn thiếu, không có lỗi gõ sai mã.
3. Mỗi màn ở mọi trạng thái bắt buộc có thể mở bằng một đường dẫn hoặc thanh công cụ. Tương ứng có trong danh sách `npm run shots -- --list`.
4. Mọi chữ hiển thị nằm trong `src/content/vi.ts`. Các câu về sức khoẻ đã được đánh dấu `[PHÁP LÝ]`.
5. Đã xem ảnh chụp (nếu chạy được `shots`) hoặc đã nói rõ là chưa xem được.
6. Đã báo cho người dùng chính xác cái gì chưa kiểm tra được.

## Việc còn phải dựng sau khung có sẵn
Khung có sẵn (kiểm bằng `check_coverage`): **8/20** mục đủ trạng thái bắt buộc.

| Còn thiếu | Task sẽ dựng bản thật |
|---|---|
| S01 Trang giới thiệu, S02 Đăng ký, S15 Điều khoản đồng ý xử lý ảnh | T-006 |
| S07 Quiz Day 2 (thanh trượt) | T-015 |
| S08 Day 4, S09 Day 7 | T-016 |
| S10 Bức tường Day 10, S11 Card Story 9:16 | T-017 |
| S13 Admin duyệt ảnh | T-018b |
| Trạng thái lẻ: S04 `server_error`; S14 `offline`, `maintenance`; C04 `error` | T-011, T-001, T-012 |

Khi dựng thêm màn: dùng lại `Button`, `Card`, `Input`, `Banner`, `DayStrip`; thêm chuỗi vào `vi.ts`; thêm trạng thái vào `ScenarioContext`/`DevToolbar` nếu cần; thêm dòng vào `capture.mjs` và `ui-coverage.json`; viết test hành vi trong `pages.test.tsx`.

## Cách trình bày với team để duyệt (10 phút)
1. Mở `shots/index.html` (nếu có), hoặc `npm run dev -- --host` và đưa địa chỉ "Network" cho mọi người mở trên điện thoại cùng wifi.
2. Hướng dẫn ba điều: thanh 🛠 ở đáy để đổi kịch bản; nút `cheer / revive / evolve` để xem chuyển động; công tắc "giảm chuyển động".
3. Nói rõ đây là bản **sơ sơ**: hình Gumi là placeholder, màu và chữ là mặc định của khung, dữ liệu là giả.
4. Thu phản hồi theo ba nhóm: bản sao chữ, màu và hình, chuyển động. Ghi lại từng ý kèm tên màn.
5. Chuyển kết quả cho skill `level-down-ui-review` để phân tích rồi đóng băng.

## Bàn giao cho agent (sau khi đóng băng)

| Tái sử dụng làm nền cho T-023 | Bỏ khi dựng bản thật |
|---|---|
| `tokens.json`, `src/theme.css` | `src/mock/` (dữ liệu giả, `ScenarioContext`) |
| `src/components/` (Button, Card, Input, Banner, DayStrip, MissionCard, SugarPassDialog, Gumi) | `DevToolbar`, công tắc giả lập, tham số URL `?s=` |
| `src/gumi.css`, `src/content/vi.ts`, `src/lib/sugar.ts` | Mật khẩu thử `gumi1234` trong Login |
| Các test trong `Gumi.test.tsx`, `sugar.test.ts` và phần hành vi của `pages.test.tsx` | `HashRouter` (bản thật dùng `BrowserRouter` cùng tệp `_redirects`) |

Prototype **không** đưa lên máy chủ thật.

## Thư viện
Chạy thật chỉ có: react, react-dom, react-router-dom, `@fontsource/be-vietnam-pro`. Công cụ xây dựng và test: vite, typescript, tailwindcss, `@tailwindcss/vite`, vitest, `@playwright/test`, cùng `jsdom` và `@testing-library/*` (chỉ để test hành vi). Ba gói test cuối nằm ngoài "danh sách thư viện được phép" chung của dự án, cần người dùng đồng ý nếu đưa vào bản thật.
