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
  (3,  'GAME',  'Đuổi Hình Bắt Chữ',            'Giải 3 chuỗi hình/emoji thành tên đồ uống nhiều đường (+5/câu).', 15, false),
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

-- ---- Câu hỏi quiz Ngày 2 (đoán số thìa đường) ----------------------
insert into public.quiz_questions (id, drink, answer, min, max) values
  (0, 'Trà đào cam sả size L (100% đường)', 10, 0, 20),
  (1, 'Trà sữa trân châu size M',           12, 0, 20),
  (2, 'Cà phê sữa đá',                       6, 0, 20),
  (3, 'Nước ngọt có ga lon 330ml',           9, 0, 20),
  (4, 'Sữa chua uống chai 200ml',            5, 0, 20)
on conflict (id) do update set drink = excluded.drink, answer = excluded.answer, min = excluded.min, max = excluded.max;

-- ---- Top 10 demo cho bảng xếp hạng ---------------------------------
insert into public.leaderboard_seed (rank, name, avatar, points) values
  (1, 'Mai Anh', '🐱', 240), (2, 'Quang Huy', '🦊', 232), (3, 'Bảo Ngọc', '🐰', 226),
  (4, 'Thanh Tùng', '🐻', 219), (5, 'Phương Linh', '🐼', 210), (6, 'Đức Minh', '🐯', 204),
  (7, 'Khánh Vy', '🐨', 197), (8, 'Hoàng Nam', '🦁', 190), (9, 'Ngọc Diệp', '🐸', 184),
  (10, 'Gia Bảo', '🐷', 178)
on conflict (rank) do update set name = excluded.name, avatar = excluded.avatar, points = excluded.points;

-- ---- Tường chia sẻ mẫu (chỉ chèn khi tường trống) ------------------
insert into public.wall_posts (name, text, created_at)
select * from (values
  ('Mai Anh',   'Mình bỏ được ly trà sữa mỗi chiều mà không thấy thèm nữa. Vị giác nhạy hơn thật!', timestamptz '2026-01-10T00:00:00+07:00'),
  ('Quang Huy', 'Cà phê giờ mình uống ít đường hẳn. Ngủ ngon hơn và bớt uể oải buổi chiều.',        timestamptz '2026-01-10T00:00:00+07:00'),
  ('Bảo Ngọc',  '21 ngày trôi nhanh ghê. Cảm ơn Gumi đã nhắc mình mỗi ngày!',                        timestamptz '2026-01-10T00:00:00+07:00')
) as v(name, text, created_at)
where not exists (select 1 from public.wall_posts);
