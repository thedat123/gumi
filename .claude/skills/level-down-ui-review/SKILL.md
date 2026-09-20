---
name: level-down-ui-review
description: Đọc thiết kế UI của web game "Level Down / 10 ngày bớt ngọt" (Gumi) do designer hoặc team đưa (ảnh chụp màn hình, PDF, xuất từ Figma, prototype HTML, mô tả chữ), phân tích so với brief, giới hạn mobile và stack rẻ, rồi đề xuất chỉnh và chốt bản đóng băng trước khi agent code. Dùng skill này bất cứ khi nào người dùng gửi hoặc nhắc tới thiết kế, mockup, wireframe, prototype, màu sắc, font, bố cục, "duyệt UI", "kiểm tra thiết kế", "đóng băng UI", hoặc muốn biết thiết kế có thiếu màn hay trạng thái nào không, kể cả khi họ không nói chữ "review".
---

# Level Down UI Review

Bạn đọc thiết kế UI trước khi agent code, phân tích nó, rồi giúp người dùng chỉnh cho hợp lý và **đóng băng** một bản duy nhất. Lý do: sửa một màn trong thiết kế tốn vài phút, sửa sau khi agent đã code và viết test tốn thêm cả một vòng token và thời gian. Ngoài ra agent nhận một thiết kế rõ ràng và có giới hạn sẽ ít "sáng tạo" hơn, nên rẻ hơn.

## Nguyên tắc

1. **Tách sự thật khỏi ý kiến.** Mỗi nhận xét thuộc một trong bốn loại (bảng dưới). "Màu này không đủ tương phản" là sự thật đo được. "Nên đổi sang màu ấm hơn" là ý kiến và phải ghi rõ như vậy. Người dùng quyết định phần thẩm mỹ, bạn không áp đặt.
2. **Nhìn kỹ rồi mới nói.** Chỉ nhận xét điều bạn thấy được trong tài liệu. Chỗ nào không đọc rõ (ảnh mờ, chữ nhỏ, màn bị cắt) thì hỏi, đừng đoán. Mỗi nhận xét phải chỉ ra màn hoặc tệp nguồn (ví dụ "S05, 03-dashboard.png").
3. **Ảnh tĩnh không chứng minh được tương tác.** Bạn không kiểm chứng được hoạt ảnh, cảm giác chạm, hay hiển thị trên iPhone thật. Nói rõ những gì bạn không kiểm tra được thay vì tuyên bố "ổn".
4. **Không bịa tài sản thương hiệu.** Logo, ảnh Gumi, minh hoạ: nếu thiếu thì ghi "placeholder", không tự vẽ rồi coi như bản chính.
5. **Chỉ chỉnh trong ranh giới đã chốt.** Stack, luật D1–D16 trong `brief.md`, và ràng buộc trong `CLAUDE.md` không được thay đổi vì lý do thiết kế. Nếu thiết kế mâu thuẫn với chúng, đó là phát hiện để báo, không phải điều để lặng lẽ sửa.

## Bốn mức nhận xét

| Mức | Nghĩa | Ví dụ |
|---|---|---|
| **Chặn** | Không thể dựng hoặc mâu thuẫn brief. Phải xử lý trước khi đóng băng | Thiếu hẳn màn admin; card Story ghi 265 điểm nhưng luật tối đa là 260; thiết kế cần gửi email |
| **Nên sửa** | Sẽ gây lỗi hoặc tốn công về sau | Thiếu trạng thái "ảnh bị gỡ"; chữ xám tương phản 3,2:1; nút nhỏ hơn 44px |
| **Gợi ý** | Cải thiện rõ nhưng không bắt buộc | Nhóm hai bước onboarding thành một |
| **Ý kiến** | Sở thích thẩm mỹ, có thể sai | "Cam đậm hơi gắt" |

## Quy trình

### Bước 1. Nhận đầu vào
Hỏi (nếu chưa có) tài liệu thiết kế: ảnh, PDF, HTML, hoặc mô tả chữ. Nếu đầu vào là link Figma mà bạn không mở được, nói rõ và xin xuất ảnh hoặc PDF. Nếu người dùng chưa có thiết kế nào, đừng tự thiết kế thẩm mỹ: dùng `references/required-screens.json` để lập **danh sách yêu cầu cho designer** (màn nào, trạng thái nào, dữ liệu nào), rồi dừng ở đó trừ khi họ nhờ dựng bản nháp.

### Bước 2. Kiểm kê
Đọc từng tài liệu và lập `docs/ui/screens.json`:

```json
{
  "screens": [ { "id": "S05", "name": "Dashboard", "states": ["today_open", "dying"], "evidence": "03-dashboard.png" } ],
  "components": [ { "id": "C01", "name": "Gumi", "states": ["bo_pho", "hap_hoi"] } ]
}
```

Dùng mã màn, thành phần và tên trạng thái đúng như trong `references/required-screens.json`. Màn nào có trong thiết kế nhưng không có trong danh sách thì vẫn ghi vào với mã mới (ví dụ `S99`), để bước sau quyết định giữ hay bỏ.

Chạy `node $SKILL/scripts/check_coverage.mjs docs/ui/screens.json`. Kết quả cho biết màn hoặc trạng thái bắt buộc còn thiếu và màn nào phát sinh ngoài phạm vi. `$SKILL` là thư mục chứa file này.

### Bước 3. Phân tích
Đi qua `references/review-checklist.md` theo từng nhóm (khớp brief, mobile, tiếng Việt, khả năng tiếp cận, dữ liệu và bảo mật, khả thi và chi phí, nhất quán, thẩm mỹ). Trong nhóm màu sắc, ghi các cặp màu chữ/nền vào `docs/ui/tokens.json` rồi chạy `node $SKILL/scripts/check_contrast.mjs`. Đừng ước lượng độ tương phản bằng mắt.

### Bước 4. Báo cáo
Ghi `docs/ui/review.md` theo `references/report-template.md` (xem `references/example-review.md` để biết mức chi tiết và giọng điệu mong muốn). Trình bày cho người dùng, đưa các mục **Chặn** lên đầu, kèm đề xuất sửa cụ thể cho từng mục. Kết thúc bằng danh sách quyết định họ cần chốt (không quá 5).

### Bước 5. Chỉnh
Sau khi người dùng phản hồi, cập nhật hai tài liệu sau (đừng sửa file thiết kế gốc của designer):
- `docs/ui/ui-spec.md` theo `references/ui-spec-template.md`: mỗi màn gồm mục đích, trạng thái, nội dung chữ tiếng Việt cuối cùng, dữ liệu cần (RPC), và tiêu chí chấp nhận đo được.
- `docs/ui/tokens.json`: màu, font, bo góc, cỡ chữ. Chạy lại `check_contrast.mjs` cho tới khi đạt. Sau đó sinh cấu hình Tailwind bằng `node $SKILL/scripts/tokens_to_tailwind.mjs --format css --out ...` (dùng `--format js` nếu T-001 cài Tailwind v3).

### Bước 6. Bàn giao và đóng băng
1. Với mỗi màn, ghi các tiêu chí giao diện vào `tasks/T-xxx.md` tương ứng (bảng ánh xạ màn → task nằm trong `required-screens.json`). Tiêu chí phải đo được, ví dụ "màn S05 ở trạng thái `dying` hiển thị nút 'Dùng Gumi Sugar Pass' và đếm ngược tới hạn", không phải "trông đẹp".
2. Thay đổi task là commit của **con người**; agent không được sửa `tasks/`. Đề xuất nội dung và nhờ người dùng commit, hoặc làm khi họ cho phép.
3. Đóng băng: liệt kê những gì đã chốt, ngày chốt, và nói rõ từ giờ mọi thay đổi UI là **task mới**, không sửa ngầm.

## Kết quả đầu ra (đặt trong `docs/ui/` của repo)

| File | Nội dung |
|---|---|
| `screens.json` | Kiểm kê thiết kế (đầu vào của script độ phủ) |
| `review.md` | Báo cáo phân tích, có mức nhận xét |
| `ui-spec.md` | Đặc tả UI cuối cùng để agent dựng |
| `tokens.json` | Biến thiết kế đã kiểm tra tương phản |
| `tailwind-theme.css` (hoặc `.js`) | Sinh từ `tokens.json`, không sửa tay |

## Ranh giới
- Không thay đổi luật chơi, điểm số hay stack để chiều theo thiết kế; báo mâu thuẫn và để người dùng quyết định.
- Không kết luận thiết kế "đúng" hoặc "sẵn sàng" nếu chưa chạy script độ phủ và tương phản, và chưa nói rõ những gì không kiểm tra được.
- Các câu về sức khoẻ trong nội dung ("cứu lấy động mạch", "ngộ độc đường", "cắt cơn nghiện") chỉ được đánh dấu để người dùng nhờ pháp lý và chuyên môn xem lại. Bạn không phải người kết luận chúng đúng hay sai.
- Kiểm thử trên thiết bị thật (iPhone Safari, Android Chrome, mở trong Zalo/Facebook) là việc của con người. Ghi vào báo cáo như một việc chưa xong.
