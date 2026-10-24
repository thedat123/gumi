# Khu sự kiện trực tiếp

Route `/event` có shell riêng, yêu cầu đăng nhập với profile role `gamer`.
Ba máy/tài khoản điều hành đăng nhập một lần; các đội chỉ nhập tên, không tạo tài khoản.
Có 4 game và màn tổng kết (brief gọi 5 game nhưng chỉ mô tả 4).
Memory dùng 45 giây sau preview 3 giây. Flappy tối đa 5 lượt, lấy số cột cao nhất, dừng ngay khi đạt 40.
Kết quả chỉ lưu khi kết thúc cả chặng; không cộng vào hành trình thường.

## Triển khai

Áp dụng migration `0041_event_games.sql`. Tạo/chọn 3 tài khoản Supabase Auth có profile, rồi dùng quyền database quản trị để gán từng tài khoản (thay UUID):

```sql
begin;
update public.profiles set role='gamer' where id in ('UUID_1','UUID_2','UUID_3');
insert into public.event_operators(slot,user_id) values
(1,'UUID_1'),(2,'UUID_2'),(3,'UUID_3');
commit;
```

Không nhúng mật khẩu hay service key vào frontend. `event_operators` chỉ có ba slot, không cho client tự gán. Role gamer và slot đều cần để đọc/ghi kết quả.

## Hợp đồng lưu kết quả

`event_results`: insert-only, UUID do client sinh để retry không trùng; `team` 1–60 ký tự; `scores` đúng 4 số nguyên theo thứ tự sort/memory/truth/flappy; `total` bằng tổng. Client gửi operator trùng phiên đang đăng nhập; RLS kiểm tra operator. Server tự gán thời gian. Gamer được insert; gamer và admin được select. Player/khách không truy cập. Điểm được kiểm tra phạm vi nhưng đây là trò chơi tại máy điều hành tin cậy, không phải cơ chế chống gian lận từ client.

Bảng xếp hạng sắp tổng giảm dần; các kết quả server hòa điểm ưu tiên thời gian lưu trước, tối đa 500 kết quả server. Realtime cập nhật khi insert; polling dự phòng 30 giây chỉ khi kênh chưa kết nối, trang đang mở và có mạng. Chống gọi chồng và gom các thông báo liên tiếp trong 300ms.

Kết quả được ghi vào hàng đợi localStorage trước khi gọi mạng. Đội tiếp theo chơi ngay khi đã lưu tại máy. Hàng đợi tách theo operator, tự gửi lại khi kết nối trở lại hoặc sau 30 giây; mỗi request giới hạn 6 giây. Retry cùng UUID dùng ON CONFLICT DO NOTHING, không cộng trùng. Hàng đợi tồn tại qua reload/đóng tab; chỉ tài khoản đã ghi điểm mới được gửi lại. Bảng xếp hạng hiển thị cache và kết quả tại máy chưa đồng bộ, có nhãn ĐANG ĐỒNG BỘ. Nếu trình duyệt khóa/đầy bộ nhớ thì giữ màn kết quả và yêu cầu lưu lại điểm trước khi đổi đội.

Mock mode lưu localStorage cùng trình duyệt, không đồng bộ máy khác. Dữ liệu thường và leaderboard thường không thay đổi.

Nội dung sức khỏe đã chỉnh WHO 25g thành ngưỡng đề xuất để có thêm lợi ích với 2.000 kcal; bỏ cam kết giảm mụn/mệt mỏi. Phân loại dùng công thức giả định hiển thị trong game, lượng đường thực tế phụ thuộc công thức và nhãn.

## Kiểm tra

`npm test`: 65 test hiện tại qua. `npm run build`: qua typecheck và build.
Chạy server `VITE_DATA_SOURCE=mock npm run dev -- --host 127.0.0.1 --port 5197`, rồi `node scripts/verify-event.mjs` để kiểm tra guard, chuyển màn theo timer, 5 câu timeout, 5 lần chết Flappy, tổng kết và lưu leaderboard local.
Chưa áp dụng migration hay kiểm chứng RLS/Realtime trên Supabase thật.

## Giao diện và hiệu năng sự kiện

- Giao diện navy / cyan / lime cho màn chiếu, có nút toàn màn hình, thanh tiến độ và đồng hồ tương phản cao. Hỗ trợ 1366×768, màn lớn và mobile.
- Toàn bộ game chạy tại máy sau khi màn sự kiện đã tải. Cần kết nối để đăng nhập và tải lần đầu; offline không ảnh hưởng ván đã mở. Không tuyên bố có thể đăng nhập mới khi mất mạng.
- Không video, WebGL hay particle cho shell sự kiện; nền CSS tĩnh, không blur; máy yếu tắt rung và chuyển động trang trí.
- Không prefetch phòng 3D/hành trình khi đang ở `/event`. Flappy chỉ tải sprite UFO, không kéo thêm boss/xe và màn MissionDone của hành trình thường. Nếu sprite chưa tải, có hình UFO dự phòng bằng canvas.
- Flappy dùng vòng lặp vật lý cố định hiện tại; tự hạ DPR/FPS theo máy. Vẽ màn chờ/lượt kết thúc tối đa 10 lần/giây; gameplay vẫn theo cơ chế adaptive. Đồng hồ HTML chỉ cập nhật React khi số giây thay đổi.
- Đã chạy toàn luồng với CPU throttle 6×, 1366×768, ngắt mạng sau khi tải game: qua đủ 4 game, tổng kết và lưu local. Đây là mô phỏng Chromium, chưa thay thế kiểm tra trên máy sự kiện thực tế.

## Kiểm tra lỗi mạng bằng Postman Simulation

```sh
postman simulation run postman/simulations/event.sim.yaml --port 4917 --output ndjson --no-history
VITE_DATA_SOURCE=supabase VITE_SUPABASE_URL=http://127.0.0.1:4917/supabase VITE_SUPABASE_ANON_KEY=local-event-test-key npm run dev -- --host 127.0.0.1 --port 5198
node scripts/verify-event-network.mjs
```

Server giả lập dựa trên migration hiện có, chỉ hỗ trợ các endpoint của bài test; không tra cứu hay xuất bản mock từ workspace bên ngoài. Chưa giả lập/kiểm chứng Supabase RLS, xác thực thật hay Realtime WebSocket. Bài test gọi HTTP qua Supabase client thật: 503 giữ điểm qua reload, cho phép đổi đội ngay; request treo abort sau khoảng 6 giây; offline giữ điểm; khôi phục mạng gửi thành công và retry không trùng. Đã kiểm tra log simulation có POST 503, POST 201 và GET 200. Viewport mobile 390px không tràn ngang trang.
