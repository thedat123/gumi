# Ví dụ: một bản review đạt chuẩn

Ví dụ dựng từ một thiết kế **giả định có lỗi** (dùng để minh hoạ giọng điệu, độ chi tiết và cách dùng số liệu từ script; đây không phải thiết kế thật của dự án).

Kết quả `check_coverage.mjs`: **15/20** mục đủ trạng thái bắt buộc. Thiếu hẳn S13 (admin duyệt ảnh) và S15 (đồng ý xử lý ảnh); S05 thiếu `dying`, `missed_no_pass`, `rejected_day`; S06 thiếu 5 trạng thái lỗi; Gumi thiếu `hap_hoi`; có thêm màn S99 "Cửa hàng đổi quà" ngoài phạm vi.
Kết quả `check_contrast.mjs`: 4 cặp không đạt (`muted` trên nền trắng 2,81:1; chữ trắng trên `primary` 2,05:1; `danger` 4,38:1; viền `primary` 2,05:1 so với ngưỡng 3).

---

## Kết luận
Chưa nên đóng băng. Có 3 mục **Chặn** và 5 mục **Nên sửa**; sửa xong chúng thì phần còn lại đủ dựng.

## Chặn

### B1. Thiếu hẳn màn admin duyệt ảnh (S13)
**Thấy gì:** bộ thiết kế không có màn nào cho admin, trong khi duyệt ảnh là cách chống gian lận chính của dự án.
**Vì sao là vấn đề:** T-018b (gallery admin) không có gì để dựng theo; agent sẽ tự bố cục.
**Đề xuất:** thêm 3 màn tối thiểu: lưới ảnh theo ngày, hộp gỡ ảnh có lý do chọn sẵn, hàng đợi cờ ảnh trùng (ảnh mới cạnh ảnh cũ). Trang này dùng máy tính, không cần đẹp bằng phần người chơi.

### B2. Thiếu trạng thái "Gumi hấp hối" và "ảnh bị gỡ" trên dashboard (S05, C01)
**Thấy gì:** dashboard chỉ có `today_open` và `today_done`; Gumi chỉ có 2 trong 3 dạng.
**Vì sao là vấn đề:** Sugar Pass là cơ chế nổi bật của brief; nếu thiếu trạng thái này người chơi không biết mình còn 24 giờ để cứu chuỗi, và người bị gỡ ảnh không hiểu vì sao mất điểm (D16).
**Đề xuất:** thêm `dying` (có đếm ngược và nút "Dùng Gumi Sugar Pass"), `missed_no_pass`, `rejected_day` (hiện lý do gỡ), và Gumi hấp hối.

### B3. Màn "Cửa hàng đổi quà" (S99) ngoài phạm vi
**Thấy gì:** thiết kế có màn đổi điểm lấy quà.
**Vì sao là vấn đề:** brief không có cơ chế đổi điểm; quà chỉ phát cho Top 10 và người đạt ≥ 7/10. Thêm màn này kéo theo bảng dữ liệu, RPC, luật chống gian lận và test mới.
**Đề xuất:** bỏ khỏi phạm vi. Nếu team thật sự muốn, coi là tính năng mới, chỉ xét sau khi launch.

## Nên sửa
- **S05, C: tương phản.** Chữ phụ `muted` trên nền trắng chỉ 2,81:1. Đề xuất đậm hơn tới ≥ 4,5:1 (ví dụ `#6B6B6B` trên trắng cho ~5,3:1).
- **Nút chính:** chữ trắng trên `primary` chỉ 2,05:1. Đổi sang chữ tối (`text`) hoặc đậm màu nền nút.
- **S06:** thiếu 5 trạng thái lỗi (mất mạng, sai ngày, đã làm, mức đường không hợp lệ, ảnh quá lớn hoặc không phải ảnh). Đây là chỗ người chơi gặp lỗi nhiều nhất.
- **S15 thiếu:** cần một đoạn xin đồng ý xử lý ảnh lúc đăng ký, kèm lưu ý ảnh Day 8 có mặt bạn bè.
- **Số liệu mẫu trên card Story (S11):** ghi "265 PTS" trong khi luật tối đa là 260 (D9).

## Gợi ý
- Gộp bước "chọn số ly" vào cùng trang chọn mức đường ở onboarding.

## Ý kiến (thẩm mỹ, bạn quyết định)
- Ý kiến: cam `primary` hơi nhạt so với chủ đề "cắt cơn nghiện ngọt"; một màu đậm hơn có thể vừa đạt tương phản vừa tạo cảm giác quyết liệt hơn.

## Việc cần bạn chốt
1. Bỏ màn cửa hàng (S99) hay không?
2. Đổi màu chữ phụ và màu nút chính theo đề xuất, hay giữ màu thương hiệu và chấp nhận rủi ro khó đọc ngoài nắng?
3. Ai vẽ 3 màn admin còn thiếu?

## Việc chưa làm được, cần con người
- Thử trên iPhone Safari và trong Zalo/Facebook.
- Nhờ pháp lý xem câu "cứu lấy động mạch" ở màn giới thiệu (S01).
