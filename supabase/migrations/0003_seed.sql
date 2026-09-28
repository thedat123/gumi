-- =====================================================================
-- Level Down Challenge — SEED (đổ dữ liệu danh mục + demo)
-- Idempotent: chạy lại nhiều lần vẫn an toàn (upsert theo khoá).
-- =====================================================================

-- ---- Cấu hình chiến dịch: mở Ngày 1 = hôm nay khi seed ---------------
insert into public.app_config (id, start_date, total_days)
  values (true, current_date, 21)
  on conflict (id) do update set start_date = excluded.start_date, total_days = excluded.total_days;

-- ---- 21 nhiệm vụ (khớp src/content/vi.ts) ---------------------------
insert into public.missions (day, kind, title, description, points, needs_level) values
  (1,  'DRINK', 'Bước Nhỏ Đầu Tiên',            'Hạ 1 nấc đường so với thói quen (VD 100%→70%). Check-in ảnh tem ly / hoá đơn / ly giảm đường.', 15, true),
  (2,  'KNOW',  'Đoán Thìa Đoán Muỗng',         'Mini-quiz: đoán số thìa đường trong đồ uống quen thuộc.', 10, false),
  (3,  'GAME',  'Đuổi Hình Bắt Chữ',            'Ghép 2 hình đoán tên đồ uống (Trà Thái · Cam vắt · Sữa gạo), đúng thì mở khoá sự thật về đường & calo.', 15, false),
  (4,  'SHARE', 'Khoe Ly Cùng Gumi',            'Chụp ly giảm đường + đăng Story kèm hashtag, tag dự án. Tải ảnh chụp màn hình lên.', 20, false),
  (5,  'DRINK', 'Chạm Mốc 50% Đường',           'Uống ly tối đa 50% đường (hoặc cà phê ít sữa/ít đường). Check-in ảnh.', 20, true),
  (6,  'GAME',  'Đấu Trường Calo',              'Sắp xếp 5 đồ uống từ ít đường nhất → nhiều đường nhất (2 lượt).', 20, false),
  (7,  'GAME',  'Bay Qua Cơn Thèm',             'CỬA ẢI Hồi 1 — Flappy Bird: lách qua mỗi cột đường +1 điểm, đạt tối đa 50 điểm để hạ Boss Cơn Thèm.', 30, false),
  (8,  'SHARE', 'Buddy Challenge',              'Rủ một người bạn cùng uống ly ít đường. Chụp ảnh hai ly "cheers".', 20, false),
  (9,  'GAME',  'Truy Tìm Mật Khẩu',            'Wordsearch: tìm 5 cái tên đường ẩn trong ô chữ (+10/key).', 50, false),
  (10, 'DRINK', 'Nói Không Với Topping Ngọt',   'Chọn đồ uống không trân châu / siro / kem cheese ngọt. Check-in ảnh ly.', 15, false),
  (11, 'KNOW',  'Vạch Mặt Đường Ẩn',            'Nhìn bảng thành phần và gọi đúng tên đường trên nhãn.', 10, false),
  (12, 'GAME',  'Lật Thẻ Trí Nhớ',              'Lật 10 thẻ, ghép 5 cặp đường ↔ tên gọi trong 30 giây (+10/cặp).', 50, false),
  (13, 'SHARE', 'Lan Toả Vị Nhạt',             'Kể một mẹo giảm đường của bạn cho mọi người cùng thử.', 20, false),
  (14, 'GAME',  'Đánh Bại Boss Đường',          'CỬA ẢI Hồi 2 — hứng nước lành 💧🍵 để pha loãng độ ngọt của Boss, né đường xấu 🧊🥤🍬. Còn 3 mạng.', 10, false),
  (15, 'DRINK', 'Chạm Mốc 30% Đường',           'Check-in ly giảm đường mức 30% (hoặc nước tự pha không đường). Check-in ảnh.', 20, true),
  (16, 'GAME',  'Đuổi Hình Bắt Chữ · Vòng 2',   'Vòng nâng cao: giải nhanh các chuỗi hình đồ uống nhiều đường.', 15, false),
  (17, 'KNOW',  'Truy Tìm Sự Thật',             '5 câu đúng/sai nhanh về đường (+5/câu).', 25, false),
  (18, 'GAME',  'Ghép Đôi Healthy',             'Lật 8 thẻ, ghép 5 cặp hình "đồ uống healthy" trong 30 giây (+10/cặp).', 50, false),
  (19, 'GAME',  'Vòng Quay May Mắn',            'Quay vòng nhận buff điểm ngẫu nhiên (+10 đến +30) trước ngày về đích.', 20, false),
  (20, 'DRINK', 'Thanh Lọc Nguyên Bản',         'Ly 0% đường: nước lọc, cold brew, trà mộc hoặc trà trái cây nguyên bản. Check-in ảnh.', 20, true),
  (21, 'FINAL', 'Đại Chiến Boss Cuối',          'CỬA ẢI cuối — đại chiến Boss Đường: hứng nước lành hạ gục Boss, né đường xấu. Thắng để tốt nghiệp, Gumi tiến hoá thành Chiến Thần 0% đường.', 25, false)
on conflict (day) do update
  set kind = excluded.kind, title = excluded.title, description = excluded.description,
      points = excluded.points, needs_level = excluded.needs_level;

-- ---- Câu hỏi quiz Ngày 2 (đoán số thìa đường trong 1 ly trà sữa) ---
-- 1 câu duy nhất: đáp án đúng nằm trong khoảng 12–15 thìa (~50g–60g). answer = 13 (giữa khoảng).
-- (Cột answer_min/answer_max + chấm điểm theo khoảng được thêm ở migration 0006.)
delete from public.quiz_questions where id <> 0;
insert into public.quiz_questions (id, drink, answer, min, max) values
  (0, 'Một ly trà sữa trân châu size M', 13, 0, 20)
on conflict (id) do update set drink = excluded.drink, answer = excluded.answer, min = excluded.min, max = excluded.max;

-- ---- KHÔNG seed đối thủ giả cho bảng xếp hạng ----------------------
-- Bảng xếp hạng tính trực tiếp từ người chơi THẬT (xem get_leaderboard ở 0009).

-- ---- KHÔNG seed bài tường mẫu -------------------------------------
-- Tường chỉ hiển thị lời nhắn thật do người chơi gửi.
