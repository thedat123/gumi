# Khuôn gợi ý chức năng

## Chấm điểm (mỗi trục 1–5)

- **R** (giữ chân): giúp người chơi quay lại và chạm mốc 7/10 ngày.
- **U** (lan toả): tạo UGC hoặc rủ thêm người.
- **F** (công bằng/vận hành): chống gian lận, giúp team vận hành can thiệp kịp thời.
- **C** (chi phí, theo số task Planner sẽ tạo): S = 1, M = 2, L = 3.
- **K** (rủi ro với lịch và chất lượng): 1 = chỉ thêm, không đụng gì cũ; 3 = thêm bảng/RPC mới hoặc đụng UI đã duyệt; 5 = đổi công thức điểm/xếp hạng.

`ưu tiên = (2R + U + F) − (2C + K)`

Chỉ đề xuất khi **cả ba** đều đúng: ưu tiên ≥ 4; K ≤ 3; C ≤ `slackTasks` trong báo cáo. Nếu tính năng cần người quyết định (dữ liệu cá nhân, nội dung do team viết), ghi rõ ở "Cần quyết định".

## Khuôn trình bày (dùng đúng khuôn này)

```
### F-04 — Bảng thống kê phễu cho admin   [ưu tiên 9 · chi phí S (1 task) · rủi ro 1]
**Vì sao lúc này:** <1 câu, gắn với tín hiệu thật trong dự án: ví dụ "Day 3 có 40% người chưa check-in, team cần biết sớm">
**Người dùng nhận được:** <1–2 câu>
**Cái giá:** <task nào bị đẩy lùi, hoặc "nằm trong độ đệm hiện có">
**Cần quyết định:** <hoặc "không">
**AC seed:** (copy từ catalog, chỉnh cho đúng tình hình)
- AC1: ...
```

## Quy tắc

- Tối đa 3 gợi ý mỗi lần, tối đa 2 gợi ý đang chờ quyết định.
- Nếu người dùng từ chối một gợi ý, đừng đề xuất lại trừ khi có tín hiệu mới.
- Mỗi gợi ý phải gắn với một tín hiệu thật (số liệu, ghi chú Verifier, lỗi lặp lại) hoặc một mục tiêu trong brief, không chỉ "nghe hay".
- Sau khi người dùng đồng ý, dùng `node agents/run.mjs plan "..."` và cho Planner đặt milestone `M6 Bổ sung`. Sau đó đọc task mới trước khi chạy.
