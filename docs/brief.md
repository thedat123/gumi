# GAME BRIEF: LEVEL DOWN CHALLENGE (10 NGÀY BỚT NGỌT)

**Thông điệp:** "10 ngày cắt cơn nghiện ngọt — Cùng Gumi reset vị giác, cứu lấy động mạch!"
**Định vị:** sự kiện tương tác phụ (sub-campaign / gamification) trong chiến dịch.
**Thời gian:** đúng 10 ngày liên tục. **Quy mô:** ~70–100 người.
**Nền tảng:** website chiến dịch, tương thích di động, đăng nhập tài khoản.

---

## QUYẾT ĐỊNH ĐÃ CHỐT
> ⚠️ Các mục dưới đây là GIẢ ĐỊNH TẠM do người thiết kế đặt để agent có thể chạy. Người phụ trách dự án phải xác nhận hoặc sửa TRƯỚC KHI chạy agent (D1–D8 là chỗ brief gốc chưa nói rõ). Agent không được tự đổi các mục này.

- **D1. Ngày theo lịch chung.** Mọi người cùng ở Day N vào cùng một ngày lịch (`start_date + N-1`, múi giờ Asia/Ho_Chi_Minh). Vào trễ thì bỏ lỡ các ngày đã qua.
- **D2. Check-in chỉ trong đúng ngày của nhiệm vụ** (00:00–23:59 ICT). Không cho bù muộn; cách cứu duy nhất là Sugar Pass.
- **D3. Sugar Pass:** mỗi người 1 cái. Ngày bị bỏ lỡ D được cứu nếu bấm Pass trước 23:59:59 ICT của ngày D+1 (cửa sổ ~24h; trong thời gian này trạng thái là "hấp hối"). Ngày dùng Pass: 0 điểm nhiệm vụ, nhưng được tính là ngày "giữ streak".
- **D4. Streak** = số ngày liên tiếp mà mỗi ngày hoặc có check-in được duyệt, hoặc được cứu bằng Pass. Thưởng dựa trên streak DÀI NHẤT của người chơi và mỗi mốc chỉ thưởng một lần: ≥3 ngày +15, ≥7 ngày +30, =10 ngày +50.
- **D5. "All Finishers" (≥7/10 ngày):** chỉ đếm các ngày có check-in được duyệt thật; ngày dùng Pass KHÔNG được đếm.
- **D6. Duyệt ảnh:** check-in mặc định `approved`, điểm cộng ngay. Admin có thể chuyển sang `rejected`; khi đó điểm và streak tự tính lại (không lưu số cứng).
- **D7. Ước tính đường/ly theo mức đường** (ước lượng, hiển thị "≈"): 100% = 40g, 70% = 28g, 50% = 20g, 30% = 12g, 0% = 0g. Người chơi khai số ly ngọt/tuần (mặc định 7). Đường ước tính/tuần = số ly × g/ly của mức hiện tại. Đường đã cắt giảm (báo cáo Day 10) = tổng (g/ly mức ban đầu − g/ly mức đã check-in) trên các ngày DRINK được duyệt, quy đổi 1 ly/ngày; hiển thị thêm số thìa = gram / 4.
- **D8. Bảng xếp hạng:** sắp theo tổng điểm giảm dần; hoà điểm thì ai làm quiz (Day 2) nhanh hơn (`duration_ms` nhỏ hơn) đứng trên, rồi ai chưa dùng Pass đứng trên, cuối cùng ai đăng ký sớm hơn.

---

## I. USER FLOW TỔNG THỂ
### Day 0 — Onboarding & Nhận Nuôi Gumi
Mỗi người chơi đăng ký 1 tài khoản để lưu kết quả xuyên suốt. Chọn "Mức đường hiện tại của bạn":
- 🧋 Hệ ngọt ngào: 100% đường trở lên
- 🥤 Hệ lơ lửng: 70% đường
- 🍵 Hệ trung dung: 50% đường

Hệ thống khởi tạo:
- Chỉ số cá nhân hoá: lượng đường ước tính bạn tiêu thụ/tuần.
- Xuất hiện Mèo Gumi Bơ Phờ (bụng bự, mắt lờ đờ vì ngộ độc đường lỏng).
- Dashboard hiển thị: `MY SUGAR JOURNEY: 0 / 10 DAYS`.

## II. LỘ TRÌNH 10 NGÀY (3 loại nhiệm vụ đan xen: DRINK / KNOW / SHARE)
Mỗi ngày chỉ có 1 nhiệm vụ chính.

| Ngày | Nhóm | Tên | Nội dung & thao tác | Điểm |
|---|---|---|---|---|
| 1 | DRINK | Bước Nhỏ Đầu Tiên | Hạ 1 nấc đường so với thói quen (100%→70%, hoặc 70%→50%). Check-in ảnh tem ly/hoá đơn | +15 |
| 2 | KNOW (5 câu) | Đoán Thìa Đoán Muỗng | Mini-quiz: "Ly trà đào cam sả size L chứa bao nhiêu thìa đường?". Kéo thanh trượt đoán | +2đ/câu |
| 3 | DRINK | Nói Không Với Topping Ngọt | Đồ uống không thêm trân châu đen/siro ngọt, hoặc đổi sang thạch nha đam/sương sáo. Check-in ảnh ly | +10 |
| 4 | KNOW | Vạch Mặt Đường Ẩn | Mini-game 30s: tìm 3 cái tên "trá hình" của đường trên nhãn thành phần (HFCS, Sucrose, Dextrose…) | +10 |
| 5 | SHARE | Khoe Ly Cùng Gumi | Chụp ly nước giảm đường hôm nay + đăng Story kèm hashtag & tag dự án. Upload ảnh cap màn hình Story | +20 |
| 6 | DRINK | Hạ Bậc Chạm Mốc 30% | Uống ở mức tối đa 30% đường (hoặc cà phê ít sữa/ít đường). Check-in ảnh | +20 |
| 7 | KNOW | Emoji Catch | Giải mã 3 chuỗi Emoji đồ uống nhiều đường, nhận infographic giải thích Sugar Crash | +10 |
| 8 | SHARE | Buddy Challenge | Rủ 1 người bạn cùng uống giảm đường. Chụp ảnh 2 ly "cheers" | +20 |
| 9 | DRINK | Thanh Lọc Nguyên Bản (0% đường) | Uống 1 ly nước lọc, cold brew, trà mộc hoặc trà trái cây nguyên bản 0% đường. Check-in ảnh | +25 |
| 10 | FINAL | Lời Nhắn Tốt Nghiệp | Viết 1 câu cảm nhận (cơ thể/vị giác thay đổi ra sao) gửi lên Bức tường cộng đồng của Gumi | +15 cho bài cảm nhận, +10 nếu có minh chứng share bài về story |

## III. CƠ CHẾ ĐIỂM & STREAK
### Điểm tích luỹ
- Điểm nhiệm vụ hằng ngày: 10–25 điểm/ngày. Tổng điểm nhiệm vụ = 165.
- Thưởng streak: 3 ngày liên tục +15; 7 ngày +30; trọn vẹn 10 ngày +50. Tổng thưởng = 95.
- **Tổng điểm tối đa = 260** (brief gốc ghi ~260–275).

### Cơ chế "Gumi Sugar Pass" (cứu streak)
- Mỗi người chơi được phát 01 "Gumi Pass" ngay từ đầu.
- Quên check-in 1 ngày thì streak không đứt ngay mà rơi vào trạng thái "Gumi đang hấp hối (X_X)".
- Người chơi có 24h để bấm kích hoạt Sugar Pass để cứu streak (ngày đó nhận 0 điểm nhiệm vụ, nhưng chuỗi ngày không về 0).

## IV. BẢNG XẾP HẠNG (SUGAR SLAYER)
- Cập nhật gần realtime (polling 15–30s là đủ): Top 10 kèm avatar, tên tài khoản, tổng điểm.
- Chân bảng cá nhân hoá: "Hạng hiện tại của bạn: #24 (145 pts)" và "Bạn chỉ cần thêm 25 điểm nữa để vượt qua [Tên bạn Top 10] và lọt vào Top 10!".
- Tie-break: xem D8.

## V. DAY 10 — SUGAR JOURNEY SUMMARY & TIẾN HOÁ GUMI
Khi cán đích ngày 10, website tự tạo Bản báo cáo cá nhân hoá (card Story 9:16):
- 🎉 CHÚC MỪNG BẠN ĐÃ TỐT NGHIỆP 10 NGÀY BỚT NGỌT!
- 🐱 MÈO GUMI TIẾN HOÁ THÀNH: CHIẾN THẦN 0% ĐƯỜNG (fit, đeo kính râm cực ngầu)
- 📊 SUGAR METRICS: ước tính lượng đường đã cắt giảm (gram và số thìa); mức đường thấp nhất đã chinh phục; số ly healthy đã check-in (x/4); thần đồng Sugar Quiz (đúng/tổng câu); chuỗi ngày kiên trì (x/10, "Streak Master")
- ⭐ Tổng điểm & hạng chung cuộc
- Có nút "Tải ảnh khoe Story / Facebook" để tạo làn sóng UGC cuối chiến dịch.

## VI. PHẦN THƯỞNG
- **TOP 10 (Sugar Slayers):** chứng nhận điện tử "Bậc Thầy Giảm Đường" kèm tên riêng; bộ merch độc quyền (bình giữ nhiệt + stickers).
- **All Finishers (≥7/10 ngày):** certificate "Sen Nuôi Gumi Thành Công"; gói quà (bộ sticker meme Mèo Gumi + móc khoá Gumi bản giới hạn).
