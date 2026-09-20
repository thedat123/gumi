// Toàn bộ chữ hiển thị nằm ở đây (không rải trong component) để team duyệt và sửa một chỗ.
// Các câu về sức khoẻ được đánh dấu [PHÁP LÝ] để nhờ người có chuyên môn xem lại trước khi launch.
export const vi = {
  app: { name: 'Level Down Challenge', tagline: '10 ngày bớt ngọt' },
  nav: { home: 'Hành trình', leaderboard: 'Xếp hạng' },
  journey: { title: 'MY SUGAR JOURNEY', unit: 'DAYS' },
  hero: { message: 'Cùng Gumi reset vị giác, cứu lấy động mạch!' /* [PHÁP LÝ] */ },
  day: { today: 'Hôm nay', done: 'Đã xong', open: 'Chưa làm', dying: 'Sắp mất chuỗi', missed: 'Đã lỡ', passed: 'Đã dùng Pass', rejected: 'Ảnh bị gỡ', future: 'Sắp tới', checked: 'Đã xong' },
  banners: {
    before: (date: string) => `Chiến dịch bắt đầu ngày ${date}. Hãy chuẩn bị hồ sơ nhé!`,
    dying: (hours: number) => `Gumi đang hấp hối! Bạn còn ${hours} giờ để dùng Sugar Pass cứu chuỗi.`,
    missedNoPass: 'Chuỗi đã đứt và bạn đã dùng hết Sugar Pass. Vẫn còn nhiều ngày để ghi điểm!',
    rejected: (reason: string) => `Ảnh của bạn bị gỡ: ${reason}. Bạn vẫn có thể dùng Sugar Pass nếu còn thời hạn.`,
    finished: 'Bạn đã tốt nghiệp 10 ngày bớt ngọt! Tải card khoe với bạn bè nhé.',
    ended: 'Chiến dịch đã kết thúc. Cảm ơn bạn đã đồng hành cùng Gumi!',
  },
  gumi: {
    bubbles: {
      bo_pho: ['Mình no đường quá…', 'Cho mình bớt ngọt nha!', 'Hôm nay bớt một nấc nhé?'],
      hap_hoi: ['Cứu mình bằng Sugar Pass!', 'X_X …'],
      tien_hoa: ['Chiến thần 0% đường!', 'Ngầu chưa?'],
    },
    caption: { bo_pho: 'Gumi bơ phờ', hap_hoi: 'Gumi đang hấp hối', tien_hoa: 'Gumi đã tiến hoá' },
  },
  pass: { button: 'Dùng Gumi Sugar Pass', title: 'Dùng Sugar Pass?', body: 'Ngày bị lỡ sẽ nhận 0 điểm nhiệm vụ nhưng chuỗi ngày của bạn được giữ. Bạn chỉ có 1 Pass.', confirm: 'Dùng Pass', cancel: 'Để sau', success: 'Gumi đã hồi sinh! Chuỗi của bạn được giữ.' },
  checkin: {
    title: 'Check-in bằng ảnh', pick: 'Chọn hoặc chụp ảnh', change: 'Đổi ảnh', level: 'Mức đường bạn đã uống', submit: 'Gửi check-in',
    uploading: 'Đang tải ảnh lên…', success: (pts: number) => `Xong! Bạn nhận +${pts} điểm.`,
    errors: { network: 'Mất kết nối. Ảnh của bạn vẫn được giữ, hãy thử lại.', notToday: 'Nhiệm vụ này không phải của hôm nay.', already: 'Bạn đã check-in ngày này rồi.', tooLarge: 'Ảnh quá lớn hoặc không phải ảnh. Hãy chọn ảnh khác.', level: 'Mức đường này không hợp lệ cho nhiệm vụ hôm nay.' },
    retry: 'Thử lại', back: 'Về hành trình',
  },
  leaderboard: {
    title: 'Sugar Slayer', me: 'Bạn', empty: 'Chưa có ai lên bảng. Hãy là người đầu tiên!', loading: 'Đang tải bảng xếp hạng…', error: 'Không tải được bảng xếp hạng.', retry: 'Thử lại',
    myRank: (rank: number, pts: number) => `Hạng hiện tại của bạn: #${rank} (${pts} pts)`,
    gap: (pts: number, name: string) => `Bạn chỉ cần thêm ${pts} điểm nữa để vượt qua ${name} và lọt vào Top 10!`,
    inTop: 'Bạn đang trong Top 10. Giữ vững phong độ nhé!',
  },
  onboarding: {
    title: 'Nhận nuôi Gumi', levelTitle: 'Mức đường hiện tại của bạn', drinksTitle: 'Số ly ngọt mỗi tuần', nameTitle: 'Tên hiển thị', avatarTitle: 'Chọn avatar',
    levels: { 100: { icon: '🧋', name: 'Hệ ngọt ngào', hint: '100% đường trở lên' }, 70: { icon: '🥤', name: 'Hệ lơ lửng', hint: '70% đường' }, 50: { icon: '🍵', name: 'Hệ trung dung', hint: '50% đường' } },
    estimate: (g: number, spoons: number) => `≈ ${g} g đường mỗi tuần (≈ ${spoons} thìa)`,
    nameHint: '2–30 ký tự', nameError: 'Tên cần từ 2 đến 30 ký tự.', submit: 'Nhận nuôi Gumi',
  },
  auth: {
    login: 'Đăng nhập', email: 'Email', password: 'Mật khẩu', submit: 'Đăng nhập', wrong: 'Email hoặc mật khẩu chưa đúng.', emailInvalid: 'Email chưa đúng định dạng.',
    forgot: 'Quên mật khẩu? Hãy nhắn cho ban tổ chức để được đặt lại.',
    inApp: 'Bạn đang mở trong ứng dụng nhúng (Zalo, Facebook…). Hãy mở bằng Chrome hoặc Safari để đăng nhập ổn định hơn.',
    consent: 'Bằng việc đăng ký, bạn đồng ý để ban tổ chức lưu và xem ảnh check-in của bạn trong thời gian chiến dịch.',
  },
  missions: [
    { day: 1, kind: 'DRINK', title: 'Bước Nhỏ Đầu Tiên', description: 'Hạ 1 nấc đường so với thói quen. Check-in ảnh tem ly hoặc hoá đơn.', points: 15 },
    { day: 2, kind: 'KNOW', title: 'Đoán Thìa Đoán Muỗng', description: 'Mini-quiz 5 câu: đoán số thìa đường trong đồ uống quen thuộc.', points: 10 },
    { day: 3, kind: 'DRINK', title: 'Nói Không Với Topping Ngọt', description: 'Chọn đồ uống không trân châu đen hoặc siro ngọt. Check-in ảnh ly.', points: 10 },
    { day: 4, kind: 'KNOW', title: 'Vạch Mặt Đường Ẩn', description: 'Tìm 3 cái tên "trá hình" của đường trên nhãn thành phần.', points: 10 },
    { day: 5, kind: 'SHARE', title: 'Khoe Ly Cùng Gumi', description: 'Chụp ly giảm đường và đăng Story kèm hashtag. Tải ảnh chụp màn hình lên.', points: 20 },
    { day: 6, kind: 'DRINK', title: 'Hạ Bậc Chạm Mốc 30%', description: 'Uống ở mức tối đa 30% đường. Check-in ảnh.', points: 20 },
    { day: 7, kind: 'KNOW', title: 'Emoji Catch', description: 'Giải mã 3 chuỗi emoji đồ uống nhiều đường và xem Sugar Crash là gì.', points: 10 },
    { day: 8, kind: 'SHARE', title: 'Buddy Challenge', description: 'Rủ một người bạn cùng uống giảm đường. Chụp ảnh hai ly cụng nhau.', points: 20 },
    { day: 9, kind: 'DRINK', title: 'Thanh Lọc Nguyên Bản', description: 'Uống một ly 0% đường: nước lọc, cold brew hoặc trà mộc. Check-in ảnh.', points: 25 },
    { day: 10, kind: 'FINAL', title: 'Lời Nhắn Tốt Nghiệp', description: 'Viết một câu cảm nhận gửi lên Bức tường cộng đồng của Gumi.', points: 15 },
  ],
} as const;

export type MissionKind = 'DRINK' | 'KNOW' | 'SHARE' | 'FINAL';
