# Vận hành event QR

`/event`: màn chiếu của role gamer. `/play`: người chơi quét QR, nhập tên, chọn 1 trong 3 game. Mỗi điện thoại có 1 lượt trong mỗi đợt.

## Xóa event để tất cả chơi lại từ đầu

```sh
npm run clear
```

Lệnh dùng `DATABASE_URL` hoặc `SUPABASE_DB_URL` trong môi trường / `.env.local`, cần PostgreSQL client `psql`. Không đưa DB password vào frontend. Môi trường được ưu tiên hơn file.

Lệnh chạy trong một transaction: đổi mã đợt chơi, xóa tất cả `event_plays` và dữ liệu event cũ `event_results`. Giữ tài khoản, role gamer, profile, hành trình và điểm của game thường. Không tự deploy website.

Điện thoại chạy frontend mới tự xóa tên, dấu đã chơi và hàng đợi điểm cũ khi nhận mã đợt mới (khi mở lại, quay về tab, kết nối lại hoặc tải bảng điểm). Ván cũ đang chạy không thể nộp điểm vào đợt mới. Máy offline nhận reset khi có mạng lại. Không cần clear cache thủ công.

Kiểm tra số dòng trước khi xóa:

```sh
npm run clear -- --dry-run
```

Chế độ này chỉ đếm, không đổi đợt, xóa bản ghi hay tạo schema. Bản ghi lỗi làm toàn bộ lệnh rollback. Không chạy `npm run clear` như bước deploy tự động.

### Triển khai lần đầu

Frontend mới và migration `0065_event_reset_round.sql` cần được triển khai cùng đợt bảo trì trước khi cho người chơi vào. Migration không xóa điểm hiện có. Nó thêm mã đợt, chặn client cũ nộp điểm không có mã đợt, và thêm tín hiệu Realtime không chứa dữ liệu người chơi.

Có thể áp dụng riêng migration qua quy trình migration của dự án. Lệnh `npm run clear` cũng tự áp dụng migration 0065 nếu cần rồi reset, và ghi phiên bản vào lịch sử migration nếu bảng theo dõi đã có. Lệnh này không áp dụng các migration trước 0065; database cần có schema event từ 0063–0064.

## Giảm tải cho khoảng 200 người

- Entry `/play` tách riêng khỏi App có đăng nhập: không tải profile, trang hành trình, phòng 3D, nội thất hoặc thư viện nhận diện ảnh. Không prefetch các màn đó ở nền.
- Gumi riêng cho event dùng WebP 25 KB thay PNG 81 KB. Asset có hash được Cloudflare Pages cache. Game chạy tại máy; bấm, lật thẻ và tính điểm không gọi server.
- Sau khi đã lấy mã đợt, màn đang chơi không polling server, không mở Realtime. Metadata có cache 10 giây và gộp request trong cùng tab.
- Kết quả lưu local trước, rồi nộp 1 RPC, giãn ngẫu nhiên 0,2–1,4 giây khi gửi để giảm đỉnh tải khi đồng loạt kết thúc / có mạng lại. UUID và unique player key chống trùng khi retry. Request giới hạn 8 giây.
- Chỉ màn có bảng điểm mở Realtime; top 3 và phần còn lại trên màn chiếu dùng chung 1 channel/tab. Tín hiệu công khai chỉ chứa revision và thời gian; không phát tên, điểm hay mã điện thoại.
- Database phát tối đa 1 tín hiệu thay đổi điểm/giây. Client gom thông báo trong 1,3–2,5 giây rồi tải đúng trang hiện tại (10 dòng + vị trí của mình). Xóa dữ liệu luôn phát tín hiệu, kể cả bảng rỗng.
- Polling khoảng 60 giây, lệch ngẫu nhiên giữa các máy, làm dự phòng khi WebSocket không hoạt động. Tab ẩn không tải bảng điểm. Màn chiếu tự chuyển trang khoảng 60 giây.

Vì Supabase Realtime còn phụ thuộc cấu hình publication, hạn mức kết nối/message và tài nguyên của project, các phép thử local không bảo đảm 200 kết nối Internet thật sẽ có cùng latency. Không mở tải thử vào production nếu chưa xác định tài nguyên và phạm vi thử.

## Hợp đồng server

- `event_round()` → UUID đợt hiện tại; anon/authenticated chỉ được gọi để đọc.
- `event_submit(p_id, p_key, p_player, p_game, p_score, p_round)` → void. `p_round` phải trùng đợt hiện tại; sai hoặc thiếu trả `P0001 / EVENT_ROUND_EXPIRED`. Giữ kiểm tra tên, game, điểm từ schema cũ; retry không tạo dòng trùng.
- `event_board(p_offset, p_limit, p_key)` giữ hợp đồng phân trang hiện tại.
- `event_board_updates`: chỉ được SELECT, RLS công khai; client không được ghi. Realtime theo dõi UPDATE trên bảng tín hiệu này, không đọc `event_plays` riêng tư.
- Reset cập nhật mã đợt trước khi xóa. `event_submit` giữ shared lock mã đợt: lượt cũ hoặc được ghi trước reset rồi bị xóa, hoặc bị từ chối sau reset; không lọt qua đợt mới.

## Kiểm tra lặp lại

```sh
python3 scripts/verify-event-reset.py
```

Tạo PostgreSQL tạm ở `/private/tmp`, dùng cổng ngẫu nhiên, không kết nối `.env.local` hoặc DB thật. Kiểm tra dry run, clear atomic, giữ profile, nộp điểm cũ bị từ chối, chơi lại cùng điện thoại, chống trùng và 200 client đồng thời (mỗi client đọc mã đợt + nộp điểm + tải 1 trang bảng). PostgreSQL 18 và pgbench cần nằm cùng thư mục với psql.

```sh
postman simulation run postman/simulations/event.sim.yaml --port 4918 --output ndjson --no-history
VITE_DATA_SOURCE=supabase VITE_SUPABASE_URL=http://127.0.0.1:4918/supabase VITE_SUPABASE_ANON_KEY=local-event-test-key npm run dev -- --host 127.0.0.1 --port 5204
node scripts/verify-event-round.mjs
```

HTTP dùng Supabase client thật qua stand-in Postman trong repo. WebSocket dùng protocol fixture của bài test trình duyệt. Kiểm tra reset tên/lượt/outbox, offline rồi reconnect không phục hồi điểm cũ, 503 giữ hàng đợi, retry không trùng, không polling khi chơi, fallback một phút và 200 thông báo gom thành 1 lần tải bảng. Không kiểm chứng Supabase gateway/RLS/Realtime hosted; quyền RPC và SELECT tín hiệu được kiểm tra riêng trên PostgreSQL local.
