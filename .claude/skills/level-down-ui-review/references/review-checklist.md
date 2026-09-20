# Checklist phân tích thiết kế

Đi từng nhóm. Với mỗi mục ghi: đạt / không đạt / không kiểm tra được, kèm mã màn và tệp nguồn. Cột "Mức" là mức mặc định khi không đạt.

## A. Độ phủ
| Kiểm tra | Cách làm | Mức |
|---|---|---|
| Đủ màn bắt buộc | `check_coverage.mjs` | Chặn |
| Đủ trạng thái bắt buộc của từng màn | `check_coverage.mjs` | Nên sửa (Chặn với S05 dashboard, S06 check-in, S13 admin) |
| Màn ngoài danh sách | `extraItems` của script: hỏi người dùng giữ hay bỏ, mỗi màn thêm là một phần công sức của agent | Gợi ý |

## B. Khớp brief và luật D1–D16
Đối chiếu số liệu và chữ hiển thị với `brief.md`. Các chỗ brief gốc **tự mâu thuẫn** thường bị chép nguyên vào thiết kế:

| Kiểm tra | Đúng theo luật đã chốt | Mức |
|---|---|---|
| Điểm tối đa | 260 (165 nhiệm vụ + 95 streak). Card mẫu trong brief ghi 265 là sai | Chặn |
| Điểm từng ngày | 15, 10 (quiz tối đa), 10, 10, 20, 20, 10, 20, 25, 15 (+10 nếu có minh chứng) | Chặn |
| Quiz Day 2 | 5 câu, hiển thị "x/5". Card mẫu ghi "3/3" là sai | Chặn |
| Day 4 | Tìm 3 tên đường. Card mẫu ghi "6 loại" là sai | Nên sửa |
| Thưởng streak | 3 ngày +15, 7 ngày +30, 10 ngày +50 | Nên sửa |
| Sugar Pass | 1 lần mỗi người; ~24h; ngày dùng Pass nhận 0 điểm nhiệm vụ | Nên sửa |
| Bảng xếp hạng | Top 10 (avatar, tên, điểm); chân bảng "Hạng hiện tại của bạn: #x (y pts)" và câu "cần thêm x điểm để vượt qua [tên]" | Nên sửa |
| Đường ước tính | Có ký hiệu "≈" hoặc chữ "ước tính"; công thức theo D7; không dùng số mẫu 240g | Nên sửa |
| Avatar | Chọn từ bộ có sẵn, không có nút tải ảnh lên (D11) | Chặn nếu thiết kế cần tải ảnh |
| Email | Không có luồng gửi email nào: không "gửi mail xác nhận", không "quên mật khẩu qua email" (D13). Quên mật khẩu chỉ hiển thị hướng dẫn liên hệ admin | Chặn |
| Thu thông tin quà | Không có ô nhập tên thật hoặc địa chỉ trong ứng dụng (D14) | Nên sửa |
| Hạn duyệt ảnh | Người chơi thấy ảnh bị gỡ kèm lý do, và biết còn Pass để cứu tới hết ngày D+1 (D16) | Nên sửa |

## C. Mobile
| Kiểm tra | Ngưỡng | Mức |
|---|---|---|
| Khung thiết kế chính | 360–430px rộng; nếu chỉ có bản desktop thì hỏi | Chặn nếu không có mobile |
| Vùng chạm | Nút, ô chọn, thẻ bấm được cao ≥ 44px | Nên sửa |
| Ô nhập liệu | Cỡ chữ ≥ 16px (iOS tự phóng to nếu nhỏ hơn) | Nên sửa |
| Vùng an toàn | Không đặt nút sát mép dưới/trên (tai thỏ, thanh điều hướng iOS). Thanh dính dưới màn có chừa chỗ | Nên sửa |
| Cuộn ngang | Không có phần tử rộng hơn màn | Nên sửa |
| Chiều cao | Không dựa vào chiều cao cố định bằng 100% màn hình (thanh địa chỉ Safari làm sai lệch) | Gợi ý |
| Bàn phím ảo | Ô nhập không bị bàn phím che khi đang gõ (đặc biệt bình luận Day 10) | Nên sửa |
| Máy tính | Người chơi: cột hẹp căn giữa là đủ. Admin: lưới nhiều cột | Gợi ý |

## D. Tiếng Việt và nội dung
| Kiểm tra | Mức |
|---|---|
| Có dấu đầy đủ, không lỗi chính tả, không lẫn chữ Anh vô lý (giữ các từ thương hiệu như "Sugar Pass") | Nên sửa |
| Chữ tiếng Việt thường dài hơn tiếng Anh 20–30%: nút, tiêu đề, tên người dùng dài có bị vỡ hay cắt không | Nên sửa |
| Dữ liệu người dùng bất kỳ: tên 30 ký tự, tên có dấu và emoji | Gợi ý |
| Giọng điệu nhất quán trong mọi màn (xưng "bạn", mức độ đùa) | Ý kiến |
| **Tuyên bố về sức khoẻ** ("cứu lấy động mạch", "ngộ độc đường", "cắt cơn nghiện", "Sugar Crash", con số đường/thìa): đánh dấu để người dùng nhờ pháp lý và chuyên môn xem. Bạn không kết luận đúng sai | Nên sửa (đánh dấu) |
| Số liệu ví dụ trên màn (điểm, hạng, gram đường) không mâu thuẫn nhau và với luật | Nên sửa |

## E. Khả năng tiếp cận
| Kiểm tra | Cách làm | Mức |
|---|---|---|
| Tương phản chữ thường ≥ 4.5:1, chữ lớn và biểu tượng/viền ≥ 3:1 | `check_contrast.mjs` với `tokens.json` | Nên sửa |
| Không chỉ dùng màu để báo trạng thái | Dải 10 ngày và trạng thái ảnh phải có chữ hoặc biểu tượng khác nhau, không chỉ đổi màu | Nên sửa |
| Chữ trên ảnh nền | Có lớp phủ hoặc bóng để đọc được | Nên sửa |
| Thứ tự đọc và nhãn cho biểu tượng | Ghi vào `ui-spec.md`, agent kiểm tra được bằng thuộc tính `aria` | Gợi ý |
| Hoạt ảnh | Có phương án giảm chuyển động (`prefers-reduced-motion`) | Gợi ý |

## F. Dữ liệu và bảo mật
| Kiểm tra | Mức |
|---|---|
| Mỗi thành phần trên màn có nguồn dữ liệu (RPC) trong `required-screens.json`; chỗ nào hiển thị dữ liệu chưa có nguồn thì báo | Nên sửa |
| Bảng xếp hạng và bức tường chỉ hiển thị tên, avatar, điểm, nội dung: không lộ email hay ảnh của người khác | Chặn |
| Ảnh của người khác chỉ admin xem được; người chơi chỉ thấy ảnh của chính mình | Chặn |
| Có màn/đoạn xin đồng ý xử lý ảnh (S15), lưu ý ảnh Day 8 có mặt bạn bè | Nên sửa |
| Trang admin: không hiện email, có xác nhận trước khi gỡ, có lý do chọn sẵn | Nên sửa |
| Thời hạn lưu ảnh (D15) được nói rõ ở điều khoản | Gợi ý |

## G. Khả thi kỹ thuật và chi phí
Stack: Vite + React + Tailwind, Supabase gói miễn phí, không có server riêng, không thêm thư viện ngoài danh sách được phép.

| Kiểm tra | Vì sao | Mức |
|---|---|---|
| Hoạt ảnh nặng (Lottie, video, WebGL, hạt) | Tốn công agent, tốn pin điện thoại, tốn dữ liệu di động. Gumi chỉ cần 3 ảnh tĩnh cộng chuyển động CSS đơn giản | Nên sửa |
| Ảnh lớn | Mỗi ảnh nên nhỏ (SVG hoặc WebP); tổng trang đầu ≲ 1 MB | Nên sửa |
| Số font, số độ đậm | Mỗi độ đậm là một tệp tải; chỉ dùng Be Vietnam Pro với 2–3 độ đậm | Gợi ý |
| Hiệu ứng cần thư viện mới (kéo thả, biểu đồ, chọn ngày) | Ngoài danh sách thư viện được phép | Nên sửa |
| Cập nhật thời gian thực trên giao diện | Bảng xếp hạng làm mới 20 giây, không cần realtime | Gợi ý |
| Tính năng đòi hỏi server hoặc dịch vụ trả phí (thông báo đẩy, gửi email, AI chấm ảnh) | Đã loại khỏi phạm vi | Chặn |
| Card Story 9:16 | Vẽ bằng HTML rồi xuất ảnh ở trình duyệt; tránh font web bị chặn, ảnh ngoài miền khác (Safari iOS hay lỗi chỗ này) | Nên sửa |

## H. Nhất quán
| Kiểm tra | Mức |
|---|---|
| Màu, cỡ chữ, bo góc, khoảng cách đến từ một tập giá trị nhỏ (rút được vào `tokens.json`), không phải mỗi màn một kiểu | Nên sửa |
| Một thành phần dùng lại đúng một kiểu (nút chính, thẻ, ô nhập, thông báo lỗi) ở mọi màn | Nên sửa |
| Cùng một trạng thái được thể hiện giống nhau ở dashboard, dải 10 ngày và admin | Nên sửa |

## I. Thẩm mỹ (mọi mục ở đây là ý kiến)
Bố cục, nhịp, cảm xúc của Gumi, độ hợp thương hiệu. Ghi ngắn gọn, đánh dấu rõ là ý kiến, và không đưa vào danh sách "phải sửa".
