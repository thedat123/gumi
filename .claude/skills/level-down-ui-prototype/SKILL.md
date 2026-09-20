---
name: level-down-ui-prototype
description: Dựng nhanh UI chung và chuyển động thật (mascot Gumi tự thở, chớp mắt, tự nhảy, hồi sinh, tiến hoá) thành prototype bấm được bằng dữ liệu giả cho web game "Level Down / 10 ngày bớt ngọt", chạy TRƯỚC khi lắp backend để team xem và duyệt. Dùng skill này bất cứ khi nào người dùng muốn dựng prototype, chạy thử giao diện, xem UI chạy thật, làm mascot chuyển động, dựng hệ thiết kế hoặc styleguide, hoặc khi chưa có thiết kế và muốn agent phác giao diện, kể cả khi họ không nói chữ "prototype".
---

# Level Down UI Prototype

Bạn dựng một prototype **sơ sơ nhưng chạy thật**: hệ thiết kế dùng chung, các thành phần cốt lõi, vài màn quan trọng ở mọi trạng thái, và mascot Gumi có chuyển động thật. Dữ liệu là giả, chưa có backend.

Vì sao làm bước này trước: người trong team chỉ phán xét được game qua thứ họ nhìn và chạm được. Sửa một màn ở prototype tốn vài phút; sửa sau khi agent đã code và viết test tốn thêm cả một vòng token và thời gian. Một giao diện cố định cũng giúp QA viết test trước, và agent ít "sáng tạo" hơn nên rẻ hơn.

"Sơ sơ" nghĩa là: đúng cấu trúc, đúng trạng thái, đúng chuyển động, dùng được để duyệt. Không phải bản đẹp cuối, và hình Gumi là **placeholder** (dựng từ hình cơ bản), không thay được nhân vật do designer làm.

## Khung có sẵn (đã kiểm thử)

`assets/template/` là dự án Vite + React + TypeScript + Tailwind v4 chạy được ngay:
- **Hệ thiết kế:** `tokens.json` (nguồn sự thật) → `src/theme.css`; font Be Vietnam Pro có tập con tiếng Việt; mọi cặp màu đã đạt WCAG.
- **Thành phần:** Button, Card, Input, Banner, DayStrip (7 trạng thái), MissionCard, SugarPassDialog, Gumi.
- **Màn có sẵn:** Dashboard (8 kịch bản), Check-in ảnh (9 trạng thái), Bảng xếp hạng (5 trạng thái), Onboarding, Đăng nhập, Styleguide.
- **Gumi:** ba trạng thái, chuyển động chờ, bốn sự kiện (cheer, revive, evolve, poke), giảm chuyển động, tạm dừng khi ẩn.
- **Công cụ duyệt:** thanh 🛠 ở đáy để đổi kịch bản và kích hoạt chuyển động; tham số URL (`?s=dying&event=revive`).
- **Kiểm tra:** `npm run check` = typecheck + 37 test (thành phần, kịch bản, công thức đường, hành vi từng màn) + kiểm tra tĩnh chuyển động + build. `npm run shots` chụp ảnh tất cả màn và trạng thái, `-- --motion` chụp "phim khung hình".

Khung phủ **8/20** mục bắt buộc của `level-down-ui-review/references/required-screens.json`. Các màn còn phải dựng nằm trong `references/prototype-checklist.md`.

## Quy trình

### 1. Hỏi đầu vào (ngắn)
Màu chủ đạo hoặc thương hiệu chiến dịch chính, 2–3 ảnh tham khảo, giọng điệu (đùa vui hay nghiêm túc), và Gumi đã có ảnh chưa (SVG hay raster). Nếu người dùng chưa có, dùng mặc định của khung và **nói rõ đó là mặc định**. Đừng chặn công việc để chờ.

### 2. Dựng khung
```
node $SKILL/scripts/scaffold.mjs prototype
cd prototype && npm install
npm run dev -- --host
```
`$SKILL` là thư mục chứa file này. `--host` cho phép mở trên điện thoại cùng wifi bằng địa chỉ "Network".

### 3. Chỉnh hệ thiết kế
Sửa `tokens.json`, chạy `npm run tokens`, rồi kiểm tra tương phản bằng `check_contrast.mjs` của skill `level-down-ui-review` nếu có. Đừng ước lượng độ tương phản bằng mắt. Chỉ dùng biến trong `tokens.json`, không thêm màu hay cỡ chữ ngoài file này.

### 4. Dựng các màn còn thiếu
Dùng lại thành phần và hệ kịch bản có sẵn. Mỗi màn phải có **đủ trạng thái bắt buộc** trong `required-screens.json`: tải, rỗng, lỗi, mất mạng, hấp hối, ảnh bị gỡ, chưa đến ngày, đã kết thúc. Với mỗi màn:
- thêm chữ vào `src/content/vi.ts` (không rải chữ trong component; đánh dấu `[PHÁP LÝ]` các câu về sức khoẻ),
- thêm kịch bản vào `ScenarioContext`/`DevToolbar` nếu cần,
- thêm vào `scripts/capture.mjs` và `ui-coverage.json`,
- viết test hành vi trong `pages.test.tsx`.

Sau đó chạy `node <level-down-ui-review>/scripts/check_coverage.mjs ui-coverage.json` để biết còn thiếu gì.

### 5. Chuyển động của mascot
Theo `references/motion-spec.md`. Quy tắc cứng: chỉ animate `transform` và `opacity`; mỗi màn tối đa một Gumi chuyển động; tôn trọng `prefers-reduced-motion`; tạm dừng khi ẩn; Gumi chỉ là trang trí, thông tin quan trọng luôn có chữ.

### 6. Kiểm chứng
Chạy `npm run check` và đọc kết quả thật. Rồi:
- `npx playwright install chromium && npm run shots` và **mở xem ảnh** bằng công cụ xem ảnh. Nhận xét bằng chi tiết cụ thể ("nút Sugar Pass nằm sát mép dưới ở trạng thái dying", không phải "trông ổn").
- `npm run shots -- --motion` để xem từng khung hình của chuyển động.
- Nếu không tải được Chromium (mạng bị chặn), nói rõ là **chưa xem được ảnh** và chỉ dựa vào test.

### 7. Giao cho người xem
Đưa cho người dùng: cách mở, hướng dẫn thanh công cụ, và danh sách **những gì bạn chưa kiểm tra được**. Dùng phần "Cách trình bày với team" trong `references/prototype-checklist.md`. Sau khi có phản hồi, chuyển sang skill `level-down-ui-review` để phân tích, chỉnh và đóng băng.

### 8. Bàn giao cho agent
Nói rõ phần nào tái sử dụng làm nền cho task hệ thiết kế (tokens, thành phần, Gumi, chữ, test) và phần nào bỏ (dữ liệu giả, thanh công cụ, mật khẩu thử). Bảng nằm ở cuối `references/prototype-checklist.md`. Việc thêm task vào repo do người dùng commit, agent không được sửa `tasks/`.

## Ranh giới
- Chỉ dùng thư viện đã có trong khung. Không thêm Lottie, Rive, framer-motion, thư viện UI, hay video/GIF cho mascot. Nếu cần, hỏi người dùng.
- Prototype không gọi mạng, không chứa khoá, không dùng `localStorage`, và không được đưa lên máy chủ thật.
- Không tuyên bố giao diện "đẹp", "mượt" hay "sẵn sàng". Bạn kiểm tra được: test, độ tương phản, quy tắc chuyển động, ảnh chụp (nếu xem được). Bạn **không** kiểm tra được cảm giác chuyển động, độ đáng yêu, hay hiển thị trên iPhone Safari và trong Zalo/Facebook. Đó là việc của con người.
- Các câu như "cứu lấy động mạch", "ngộ độc đường", "cắt cơn nghiện" chỉ được đánh dấu để nhờ pháp lý và chuyên môn xem lại.
- Không tự thay hình Gumi bằng "bản đẹp hơn" do bạn vẽ và coi như bản chính thức.
