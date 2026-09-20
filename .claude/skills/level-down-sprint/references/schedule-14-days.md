# Kế hoạch 14 ngày và checklist duyệt milestone

Số liệu "dự kiến xong" nằm trong `schedule.json` (script đọc file đó). File này là bản để người đọc. Kế hoạch giả định trung bình ~1,4 task/ngày; ngày 1 dùng để đo chi phí và tốc độ thật, nếu số thật khác xa thì báo người dùng để điều chỉnh kế hoạch thay vì bám số cũ.

## Bảng ngày

| Ngày | Agent chạy | Người làm | Dự kiến xong (luỹ kế) |
|---|---|---|---|
| 1 | Chỉ T-001, chạy tay | Chốt D1–D8 trong brief.md, cài Docker/Claude Code, `init` sprint, đo chi phí một task | 1 |
| 2 | T-002 | Duyệt **M0**, điền `.env.local`, thêm `npx supabase status` vào `preflight`, bật autopilot | 2 |
| 3 | T-003, T-004 (qua đêm) | Sáng: xem báo cáo, xử lý blocked | 4 |
| 4 | T-005, T-006 | Duyệt **M1** | 6 |
| 5 | T-007, T-008 | Đọc SQL streak/Pass đối chiếu brief | 8 |
| 6 | T-009, T-010 | Duyệt **M2** (dành 30 phút, đây là lõi luật chơi) | 10 |
| 7 | T-011, T-012 | Thử onboarding + dashboard trên điện thoại | 12 |
| 8 | T-013 | Thử check-in bằng ảnh thật | 13 |
| 9 | T-014 | Duyệt **M3** bằng điện thoại thật | 14 |
| 10 | T-015, T-016 | Chơi thử quiz và mini-game | 15 |
| 11 | T-017 | Duyệt **M4**. **Đóng băng tính năng**: từ đây chỉ sửa lỗi | 17 |
| 12 | T-018 | Nhờ 1–2 người test tay iOS Safari và Android | 18 |
| 13 | T-019 | Duyệt **M5**, dry-run với 5–10 người thật | 19 |
| 14 | Chỉ task sửa lỗi | Sửa lỗi dry-run, tạo admin, deploy Cloudflare Pages, đặt `start_date`, kiểm tra `now_override` NULL, chốt launch | 19 |

Ngày 8 chỉ có T-013 vì nó phụ thuộc chuỗi T-011 → T-012 và có upload ảnh thật. Dùng phần dư để đệm.

## Checklist duyệt (làm TRƯỚC khi `approve`)

Với mọi milestone: checkout `develop`, chạy `npm run gate` (sau T-001), đọc `reports/*.json` của các task trong milestone và chú ý mục `notes`, rồi xem `git log develop --oneline` xem có commit lạ không.

**M0 Nền tảng**
- `npm run dev` mở được trang; `npm run build` thành công.
- `npx supabase status` chạy, `.env.local` có URL và anon key; `npm run db:reset` thật (không còn placeholder).
- Ghi lại chi phí trung bình/task từ `status` và so với `maxTotalUsd`. Nếu dự phóng vượt trần, báo người dùng ngay.

**M1 Dữ liệu & đăng nhập**
- Tự đăng ký và đăng nhập trong trình duyệt; tải lại trang vẫn còn phiên; vào `/dashboard` khi chưa đăng nhập bị chuyển sang `/login?next=...`.
- Xem lại các chính sách RLS trong migration: không có `using (true)` cho bảng nhạy cảm, `campaign_config.now_override` là NULL sau `db:reset`.
- Mở các test RLS, kiểm tra thật sự có hai user khác nhau chứ không chỉ một.

**M2 Lõi điểm số** (kỹ nhất)
- Đọc SQL của `submit_checkin`, `use_sugar_pass`, view điểm. Tự chạy tay bốn kịch bản: đủ 10 ngày (260 điểm), bỏ 1 ngày không Pass, bỏ 1 ngày có Pass, hết cửa sổ Pass.
- Đối chiếu từng dòng với D1–D8 trong `brief.md`. Nếu người dùng đã đổi ý về D3–D5 thì dừng và sửa spec trước khi duyệt.
- Kiểm tra bảng xếp hạng chỉ trả tên, avatar, điểm.

**M3 Giao diện người chơi**
- Mở bằng điện thoại thật (hoặc DevTools 390×844): onboarding → check-in ảnh thật → thấy điểm → xem bảng xếp hạng. Không cuộn ngang.
- Ảnh tải lên ≤ ~400KB (xem tab Network). Đổi `now_override` để thử trạng thái hấp hối và dùng Pass.
- Ghi mọi thứ thấy "chưa ổn" thành danh sách; đưa vào task sửa lỗi ở tuần sau thay vì làm ngay.

**M4 Nội dung game**
- Chơi quiz, Day 4, Day 7 như người chơi. `grep -r "correct_value" dist/` sau khi build phải không có kết quả.
- Tải card Story trên Chrome Android và iOS Safari (agent chỉ test được Chromium). Ghi lại lỗi font/ảnh nếu có.
- Sau bước này: thông báo đóng băng tính năng cho người dùng.

**M5 Vận hành & nghiệm thu**
- Chạy `npm run test:e2e` trên `develop`, xem báo cáo T-019.
- `grep -ri "service_role" dist/` không có kết quả; các RPC admin trả `FORBIDDEN` với user thường; Storage: user A không đọc ảnh của B.
- Có kế hoạch xuất CSV (check-in, điểm) khi kết thúc và nhớ gói miễn phí không có backup tự động; Supabase có thể tạm dừng project khi không hoạt động lâu.
- Dry-run 5–10 người thật trong 1 ngày, gom lỗi thành task sửa lỗi cho ngày 14.
