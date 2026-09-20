# Đặc tả UI (bản đóng băng <ngày>)

Nguồn thiết kế: <tệp>. Mọi thay đổi sau ngày đóng băng là một task mới.

## Quy ước chung
- Bố cục: mobile-first, cột chính rộng tối đa <n>px, căn giữa trên màn lớn. Admin dùng lưới nhiều cột.
- Chỉ dùng biến trong `tokens.json` (màu, cỡ chữ, bo góc). Không thêm giá trị mới.
- Vùng chạm ≥ 44px; ô nhập cỡ chữ ≥ 16px; dùng `dvh` thay cho `100vh`; chừa `env(safe-area-inset-*)`.
- Không dùng màu làm dấu hiệu duy nhất của một trạng thái.

## Màn <Sxx>: <tên>   → task <T-xxx>
**Mục đích:** <1 câu>
**Dữ liệu:** <RPC>
**Bố cục:** <mô tả ngắn từ trên xuống dưới, hoặc tham chiếu ảnh>

| Trạng thái | Điều kiện | Nội dung hiển thị (chữ cuối cùng) | Hành động |
|---|---|---|---|
| `today_open` | hôm nay chưa xong | "…" | nút "…" |

**Tiêu chí chấp nhận (đo được, agent kiểm chứng bằng test):**
- AC-UI1: ở 390×844 không có cuộn ngang.
- AC-UI2: ở trạng thái `<x>` hiển thị đúng chữ "…" và nút "…".
- AC-UI3: khi <điều kiện>, <kết quả>.

**Lưu ý và điều chưa chốt:** <danh sách>
