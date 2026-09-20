# Catalog chức năng gợi ý

Dùng cùng `suggestion-template.md`. Điểm (R, U, F, C, K) là điểm khởi đầu chấm sẵn cho bối cảnh này (70–100 người, 10 ngày, không có ngân sách hạ tầng). Hãy chấm lại theo tình hình thật; đừng sao chép máy móc.

Nhóm: **G** giữ chân, **L** lan toả UGC, **C** công bằng, **V** vận hành.

## Bảng tổng hợp (đã sắp theo ưu tiên)

| ID | Chức năng | Nhóm | R | U | F | C | K | Ưu tiên |
|---|---|---|---|---|---|---|---|---|
| F-03 | Danh sách "sắp rớt" cho admin | V | 3 | 1 | 5 | S | 2 | 8 |
| F-01 | Nhắc check-in bằng lịch (.ics) | G | 4 | 1 | 1 | S | 1 | 7 |
| F-04 | Thống kê phễu theo ngày cho admin | V | 2 | 1 | 5 | S | 1 | 7 |
| F-02 | "Gumi đói": đếm ngược tới hết ngày | G | 3 | 1 | 1 | S | 1 | 5 |
| F-08 | Mã Buddy cho Day 8 | L | 3 | 5 | 1 | M | 3 | 5 |
| F-12 | Thêm vào màn hình chính (PWA nhẹ) | G | 3 | 1 | 1 | S | 1 | 5 |
| F-05 | Sugar Tip sau mỗi lần check-in | G | 2 | 2 | 1 | S | 1 | 4 |
| F-06 | Huy hiệu tính từ dữ liệu có sẵn | G/L | 3 | 3 | 1 | M | 2 | 4 |
| F-11 | Thẻ tổng kết giữa chặng (Day 5) | L | 2 | 4 | 1 | M | 2 | 3 |
| F-07 | Reaction ❤ trên bức tường cảm nhận | L | 2 | 4 | 1 | M | 3 | 2 |
| F-09 | Xếp hạng theo nhóm 3–5 người | G/L | 4 | 4 | 1 | L | 5 | 2 |
| F-10 | Cảnh báo ảnh trùng lặp | C | 1 | 1 | 4 | M | 2 | 1 |

Các dòng có ưu tiên < 4 hoặc K > 3 (F-11, F-07, F-09, F-10) mặc định **không** được đề xuất; chỉ nhắc khi người dùng hỏi hoặc khi có tín hiệu rất mạnh, và nói rõ vì sao điểm thấp.

## Chi tiết và AC seed

### F-03 — Danh sách "sắp rớt" cho admin
**Ý tưởng:** với 100 người, team có thể nhắn tay (Zalo/Facebook) cho những ai chưa check-in hoặc đang "hấp hối". Đây thường hiệu quả hơn mọi cơ chế trong app.
**Cần quyết định:** admin có được xem email không? Nếu có, chỉ trả cho admin và ghi rõ trong `docs/admin.md`. Nếu không, chỉ trả tên hiển thị.
- AC1: `admin_list_at_risk()` chỉ admin gọi được (người khác nhận `FORBIDDEN`).
- AC2: trả những người có profile và ngày hôm nay chưa `checked`, kèm `state` của họ (`open` hoặc `dying`), số giờ còn lại tới hạn, và tên hiển thị.
- AC3: người đã check-in hôm nay không có trong danh sách; người đã hết cửa sổ Pass (`missed`) tách riêng thành nhóm `lost`.
- AC4: trang `/admin/at-risk` có nút "Sao chép danh sách" (văn bản thuần, mỗi dòng một người).

### F-01 — Nhắc check-in bằng lịch (.ics)
**Ý tưởng:** không cần server hay email: người chơi tải một file lịch có 10 sự kiện lặp lúc 19:00 mỗi ngày, mỗi sự kiện có link tới `/mission/<ngày>`.
- AC1: nút "Nhắc tôi mỗi tối" trên dashboard tải về file `.ics` hợp lệ có đúng 10 `VEVENT`, ngày theo `start_date` (Asia/Ho_Chi_Minh), giờ mặc định 19:00.
- AC2: mỗi sự kiện có `URL` trỏ tới `/mission/<ngày>` của đúng ngày.
- AC3: người dùng đổi được giờ nhắc (18:00–22:00) trước khi tải.
- AC4: file được tạo ở client, không gọi thêm API nào.

### F-04 — Thống kê phễu theo ngày cho admin
**Ý tưởng:** biết Day nào người chơi rớt nhiều nhất để can thiệp kịp (nhắn nhắc, đổi nội dung).
- AC1: `admin_funnel()` chỉ admin gọi được, trả cho mỗi ngày 1..10: số người có check-in approved, số người dùng Pass, số người `missed`.
- AC2: số liệu khớp dữ liệu nền trong test với 5 người chơi có trạng thái khác nhau.
- AC3: trang `/admin/funnel` hiển thị bảng và thanh ngang cho từng ngày, không cuộn ngang ở 390×844.

### F-02 — "Gumi đói": đếm ngược tới hết ngày
**Ý tưởng:** nhiệm vụ hôm nay chưa xong thì dashboard hiện đếm ngược tới 23:59:59, và Gumi có biểu cảm lo lắng trong 3 giờ cuối. Tận dụng tâm lý sợ mất chuỗi mà không đổi luật.
- AC1: dashboard hiển thị thời gian còn lại tính từ `server_now` của `get_campaign_state()`, không dùng đồng hồ máy.
- AC2: còn ≤ 3 giờ thì đổi sang trạng thái cảnh báo (chữ và biểu tượng, không chỉ màu).
- AC3: đã check-in hôm nay thì không hiển thị đếm ngược.

### F-08 — Mã Buddy cho Day 8
**Ý tưởng:** Day 8 hiện chỉ cần chụp ảnh 2 ly. Thêm mã mời giúp bạn bè vào chơi, nhưng **không đổi điểm** (điểm Day 8 vẫn +20 từ ảnh) để không đụng công thức.
**Cần quyết định:** buddy chỉ hiển thị tên, hay được gắn huy hiệu? Mặc định: chỉ hiển thị tên và một dòng "Bạn đồng hành".
- AC1: mỗi người có mã Buddy 6 ký tự duy nhất, sinh ở server.
- AC2: `link_buddy(code)` chỉ dùng trong Day 8, không tự liên kết với chính mình, mỗi người chỉ liên kết được 1 buddy và mỗi cặp là hai chiều.
- AC3: mã sai/đã dùng trả `BAD_CODE`, dùng lại sau khi đã liên kết trả `ALREADY_LINKED`.
- AC4: ảnh check-in Day 8 hiển thị tên buddy đã liên kết; không có thay đổi nào trong `total_points`.

### F-12 — Thêm vào màn hình chính (PWA nhẹ)
**Ý tưởng:** có `manifest.webmanifest` + icon để người chơi thêm biểu tượng Gumi ra màn hình chính, mở lại nhanh hơn. Không làm push notification (iOS hạn chế và cần hạ tầng).
- AC1: `manifest.webmanifest` hợp lệ (tên, `start_url`, `display: standalone`, icon 192 và 512).
- AC2: trang có `theme-color` và `apple-touch-icon`.
- AC3: một dòng hướng dẫn "Thêm vào màn hình chính" hiển thị đúng theo iOS/Android, có thể tắt.

### F-05 — Sugar Tip sau mỗi lần check-in
**Ý tưởng:** sau khi check-in, hiển thị một mẹo ngắn (1 câu, có nguồn nội bộ). Tạo cảm giác "học được điều gì đó" mà không thêm việc.
**Cần quyết định:** 10 câu mẹo do team nội dung viết và kiểm duyệt (đừng để agent tự bịa số liệu sức khoẻ).
- AC1: có bảng `sugar_tips(day, text)` với đúng 10 dòng (seed), người chơi chỉ đọc.
- AC2: màn thành công check-in hiển thị mẹo của đúng ngày.
- AC3: không có mẹo nào dài hơn 140 ký tự (kiểm bằng ràng buộc DB).

### F-06 — Huy hiệu tính từ dữ liệu có sẵn
**Ý tưởng:** huy hiệu suy ra từ dữ liệu (không cột mới): "Không Trân Châu" (Day 3), "Bản Lĩnh 30%" (Day 6), "Thanh Lọc 0%" (Day 9), "Streak 7". Hiển thị trên dashboard và card Story.
- AC1: `get_my_badges()` trả danh sách huy hiệu đã mở khoá, chỉ dựa trên check-in approved và streak.
- AC2: check-in bị gỡ thì huy hiệu tương ứng biến mất.
- AC3: dashboard hiển thị huy hiệu (có nhãn chữ, không chỉ biểu tượng).

### Các mục không đề xuất mặc định
- **F-11 Thẻ tổng kết giữa chặng:** hay cho UGC nhưng tái dùng card T-017 chưa xong ở Day 5; đợi sau M4 thì đã quá đóng băng.
- **F-07 Reaction ❤:** cần bảng và chống lạm dụng (1 reaction/người/bài), giá trị thấp so với công sức ở quy mô 100 người.
- **F-09 Xếp hạng theo nhóm:** đụng thẳng vào bảng xếp hạng đã chốt (K = 5) và đổi luật chơi; chỉ xét nếu người dùng chủ động yêu cầu và đang vượt kế hoạch ≥ 2 ngày.
- **F-10 Cảnh báo ảnh trùng:** nếu cần chống gian lận thì admin xem thủ công ở quy mô này rẻ hơn; xét lại nếu có dấu hiệu gian lận thật.
