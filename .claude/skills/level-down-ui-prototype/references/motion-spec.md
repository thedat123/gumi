# Đặc tả chuyển động của mascot Gumi

Mọi giá trị dưới đây đang được cài trong `assets/template/src/gumi.css` và `Gumi.tsx`. Đổi số ở đây thì đổi ở đó, rồi chạy `npm run check`.

## Ba trạng thái và chuyển động chờ (idle)

| Trạng thái | Nét mặt | Chuyển động tự động | Chu kỳ |
|---|---|---|---|
| `bo_pho` (bơ phờ) | mắt lờ đờ, chớp mắt, bụng bự | Thở nhẹ (co giãn 2–3,5%); chớp mắt | thở 3,6 giây; chớp 5 giây |
| `hap_hoi` (hấp hối) | mắt X, giọt mồ hôi | Lắc lư chậm ±4° | 2,6 giây |
| `tien_hoa` (tiến hoá) | kính râm, bụng gọn | Thở nhẹ; **tự nhảy một lần** (khoảng 1,1 giây) | thở 3 giây; nhảy mỗi 10 giây, lệch pha ngẫu nhiên 0–4 giây lúc mở màn để nhiều Gumi không nhảy cùng lúc |

## Sự kiện (chạy một lần, thay chuyển động chờ trong lúc chạy)

| Sự kiện | Khi nào | Thời lượng | Mô tả |
|---|---|---|---|
| `cheer` | Check-in thành công | 1,2 giây | Ép người, nhảy hai lần (cao rồi thấp), 5 ngôi sao bay ra |
| `revive` | Dùng Sugar Pass thành công | 1,4 giây | Từ nghiêng ngả bật dậy, rung nhẹ rồi đứng thẳng; đổi sang `bo_pho` |
| `evolve` | Hoàn thành Day 10 | 2 giây | Hiển thị dạng `bo_pho` → thu nhỏ → **loé sáng** → phóng to; đổi sang `tien_hoa` ở ~0,9 giây (lúc đang loé) |
| `poke` | Người chơi bấm vào Gumi | 0,5 giây | Nhảy nhỏ và hiện bong bóng lời thoại 2,4 giây (mỗi trạng thái có 2–3 câu trong `content/vi.ts`) |

## Ngân sách và quy tắc

1. **Chỉ animate `transform` và `opacity`.** Không animate `filter`, `box-shadow`, `width`, `height`, `top/left`, màu. Lý do: chỉ hai thuộc tính này chạy trên GPU mà không buộc trình duyệt tính lại bố cục, nên mượt và ít tốn pin trên điện thoại tầm trung. Do `check-motion.mjs` kiểm.
2. **Mỗi màn tối đa một Gumi chuyển động.** Ở Styleguide có 3 Gumi nhỏ cạnh nhau chỉ để so sánh, chúng vẫn chạy chuyển động chờ; trên màn người chơi thật chỉ đặt một.
3. **Không `transition: all`.** Liệt kê thuộc tính cụ thể.
4. **Tạm dừng khi không cần:** tab bị ẩn hoặc Gumi ra ngoài màn hình thì `animation-play-state: paused` (hook `useAnimationPause`).
5. **Giảm chuyển động:** khi hệ điều hành bật "giảm chuyển động" (`prefers-reduced-motion`) mọi hoạt ảnh tắt, Gumi đứng ở tư thế tĩnh, ngôi sao và loé sáng ẩn. Trên thanh công cụ có công tắc giả lập để duyệt (lớp `html.rm`).
6. **Trang trí, không mang thông tin:** SVG có `aria-hidden`. Trạng thái luôn có chữ đi kèm (`vi.gumi.caption`, banner hấp hối kèm hạn Pass), nên người dùng không nhìn thấy hoạt ảnh vẫn nhận đủ thông tin.
7. **Ảnh tĩnh cho card Story:** không dùng hoạt ảnh; dùng tư thế tĩnh của trạng thái tương ứng.
8. **Không tải ảnh ngoài:** mascot là SVG nội tuyến. Lý do: `html-to-image` trên Safari hay lỗi với ảnh khác miền.

## Cách kiểm chứng

| Cái gì | Cách | Ai làm |
|---|---|---|
| Chỉ animate transform/opacity, có giảm chuyển động, không `transition: all` | `npm run motion` | Tự động |
| Mỗi trạng thái có nét mặt riêng, sự kiện gắn đúng lớp, là trang trí (ẩn khỏi trình đọc màn hình), hồi sinh sau khi dùng Pass | `npm test` | Tự động |
| Hình dạng ở từng thời điểm của mỗi chuyển động | `npm run shots -- --motion` (chụp "phim khung hình", cần Chromium) rồi xem ảnh | Claude xem ảnh, nêu nhận xét cụ thể |
| **Có đáng yêu không, có mượt không, nhịp có dễ chịu không** | Chạy `npm run dev -- --host`, mở trên điện thoại thật, bấm thử từng sự kiện ở thanh công cụ | **Con người** |
| Hoạt động trên iPhone Safari và trong Zalo/Facebook | Thử tay | **Con người** |

## Thay hình Gumi bằng bản của designer

Khung dựng Gumi từ các hình cơ bản (placeholder), không phải nhân vật thật. Để thay:
1. Xuất SVG có lớp rõ ràng với các mã: `g-actor` (cả nhân vật), `g-breath` (thân dùng cho thở), `g-eyes-open`, `g-eyes-closed`, và các nhóm nét mặt cho từng trạng thái.
2. Giữ nguyên tên lớp CSS trong `gumi.css` rồi thay nội dung SVG trong `Gumi.tsx`. Không cần sửa hoạt ảnh nếu tên lớp không đổi.
3. Chạy lại `npm run check` và `npm run shots -- --motion`, kiểm tra tâm xoay (`transform-origin`) vẫn ở đáy nhân vật.
4. Mỗi tệp SVG nên nhỏ (mục tiêu ≲ 30 KB) và không nhúng ảnh raster.

Nếu designer chỉ giao ảnh raster (PNG/WebP từng khung), dùng sprite sheet với `animation-timing-function: steps()`: đó là một thay đổi lớn hơn, hãy hỏi người dùng trước.
