// Toàn bộ chữ hiển thị nằm ở đây (không rải trong component) để team duyệt và sửa một chỗ.
// Các câu về sức khoẻ được đánh dấu [PHÁP LÝ] để nhờ người có chuyên môn xem lại trước khi launch.
// Bản prototype 21 NGÀY theo hướng cốt truyện phiêu lưu (3 hồi / 3 vùng đất).

export type Speaker = 'gumi' | 'boss' | 'narrator';
export interface Line { who: Speaker; text: string }
export interface Chapter { day: number; intro: Line[]; win: Line[]; tease: string }

export const vi = {
  app: { name: 'Level Down', tagline: '21 ngày bớt ngọt' },
  nav: { home: 'Bản đồ', leaderboard: 'Xếp hạng' },
  journey: { title: 'HÀNH TRÌNH CỦA BẠN', unit: 'NGÀY', total: 21, progress: (n: number) => `${n} / 21 NGÀY` },
  hero: { message: 'Cùng Gumi reset vị giác, cứu lấy động mạch!' /* [PHÁP LÝ] */ },
  day: { today: 'Hôm nay', done: 'Đã xong', open: 'Chưa làm', dying: 'Sắp mất chuỗi', missed: 'Đã lỡ', passed: 'Đã dùng Bùa', rejected: 'Ảnh bị gỡ', future: 'Sắp tới', checked: 'Đã xong' },

  // Nhãn dùng trên bản đồ hành trình
  map: {
    locked: 'Chưa mở',
    replay: 'Xem lại chương',
    todayCta: 'Vào chương hôm nay',
    bossCta: 'Thử thách cửa ải',
    nodeAria: (day: number, title: string, state: string) => `Ngày ${day}: ${title} — ${state}`,
    actAria: (name: string) => `Vùng đất: ${name}`,
  },

  banners: {
    before: (date: string) => `Hành trình bắt đầu ngày ${date}. Hãy chuẩn bị hồ sơ nhé!`,
    dying: (hours: number) => `Cơn Thèm vừa quật ngã Gumi! Bạn còn ${hours} giờ để dùng Bùa Hồi Sinh cứu chuỗi.`,
    missedNoPass: 'Chuỗi đã đứt và bạn đã dùng hết Bùa Hồi Sinh. Vẫn còn nhiều ngày để ghi điểm!',
    rejected: (reason: string) => `Ảnh của bạn bị gỡ: ${reason}. Bạn vẫn có thể dùng Bùa Hồi Sinh nếu còn thời hạn.`,
    finished: 'Bạn đã tốt nghiệp 21 ngày bớt ngọt! Gumi đã tiến hoá. Tải card khoe với bạn bè nhé.',
    ended: 'Hành trình đã khép lại. Cảm ơn bạn đã đồng hành cùng Gumi!',
  },

  gumi: {
    bubbles: {
      bo_pho: ['Mình no đường quá…', 'Cho mình bớt ngọt nha!', 'Hôm nay bớt một nấc nhé?'],
      hap_hoi: ['Cứu mình bằng Bùa Hồi Sinh!', 'Cơn Thèm mạnh quá… X_X'],
      tien_hoa: ['Chiến thần 0% đường!', 'Boss Đường xong đời rồi!'],
    },
    caption: { bo_pho: 'Gumi bơ phờ', hap_hoi: 'Gumi bị Cơn Thèm quật ngã', tien_hoa: 'Gumi đã tiến hoá' },
  },

  pass: { button: 'Dùng Bùa Hồi Sinh', title: 'Dùng Bùa Hồi Sinh?', body: 'Ngày bị lỡ sẽ nhận 0 điểm nhiệm vụ nhưng chuỗi ngày của bạn được giữ. Bạn chỉ có 1 Bùa.', confirm: 'Dùng Bùa', cancel: 'Để sau', success: 'Gumi bật dậy! Chuỗi của bạn được giữ.' },

  // ——— CỐT TRUYỆN ———
  story: {
    villain: { name: 'Boss Đường', alias: 'Cơn Thèm' },
    ui: {
      chapterOf: (day: number) => `CHƯƠNG ${day} / 21`,
      skip: 'Bỏ qua truyện',
      next: 'Tiếp ▸',
      startMission: 'Bắt đầu nhiệm vụ',
      doneMock: 'Hoàn thành (bản thử)',
      backToMap: 'Về bản đồ',
      tomorrow: 'Ngày mai',
      earned: (pts: number) => `+${pts} điểm`,
      speaker: { gumi: 'Gumi', boss: 'Boss Đường', narrator: '' } as Record<Speaker, string>,
    },
    acts: [
      { n: 1, name: 'Đầm Lầy Ngọt', range: 'Ngày 1–7', icon: '🫧', blurb: 'Nơi Gumi kẹt lại vì đường lỏng. Từng bước lội ra.' },
      { n: 2, name: 'Rừng Đường Ẩn', range: 'Ngày 8–14', icon: '🌫️', blurb: 'Đường cải trang khắp nơi. Học cách vạch mặt và giữ vững.' },
      { n: 3, name: 'Đỉnh 0%', range: 'Ngày 15–21', icon: '🏔️', blurb: 'Chặng cuối. Chạm mốc 0% và lột xác thành Chiến Thần.' },
    ],
    chapters: [
      { day: 1, intro: [
          { who: 'narrator', text: 'Gumi mở mắt giữa Đầm Lầy Ngọt, bụng nặng trịch vì đường lỏng.' },
          { who: 'gumi', text: 'Ơ… chân mình lún hết rồi. Nhưng mình phải bước ra thôi!' },
        ], win: [ { who: 'gumi', text: 'Bước đầu tiên nhẹ hơn mình tưởng. Đầm lầy, chờ đấy!' } ],
        tease: 'Mai Gumi sẽ học cách "đọc vị" kẻ thù — đo xem mình nạp bao nhiêu đường.' },
      { day: 2, intro: [
          { who: 'gumi', text: 'Muốn thắng thì phải hiểu đối thủ. Một ly quen thuộc có bao nhiêu thìa đường nhỉ?' },
        ], win: [ { who: 'gumi', text: 'Trời… nhiều hơn mình đoán. Giờ thì mình cảnh giác hơn rồi.' } ],
        tease: 'Mai Boss Đường sẽ thả topping ra dụ dỗ.' },
      { day: 3, intro: [
          { who: 'boss', text: 'Gumi ơi~ thêm chút trân châu, chút siro cho vui đời nào 🧋' },
          { who: 'gumi', text: 'Không. Hôm nay mình uống trơn thôi. Cất topping đi, Boss.' },
        ], win: [ { who: 'gumi', text: 'Boss Đường tiu nghỉu bỏ đi. Ly của mình gọn gàng hẳn!' } ],
        tease: 'Mai có kẻ đội lốt trên nhãn thành phần chờ mình vạch mặt.' },
      { day: 4, intro: [
          { who: 'narrator', text: 'Trên nhãn chai xuất hiện những cái tên lạ hoắc.' },
          { who: 'gumi', text: 'HFCS? Dextrose? Toàn là đường đội lốt! Để mình lột mặt nạ tụi nó.' },
        ], win: [ { who: 'gumi', text: 'Bắt được cả ba! Từ nay đường có trốn cũng không thoát mắt mình.' } ],
        tease: 'Mai mình hạ thêm một nấc đường nữa.' },
      { day: 5, intro: [
          { who: 'gumi', text: 'Hôm nay mình dấn thêm một nấc. Vị nhạt hơn, nhưng đầu óc mình tỉnh hơn hẳn.' },
        ], win: [ { who: 'gumi', text: 'Đầm lầy đã ở ngang lưng mình rồi. Sắp ra tới bờ!' } ],
        tease: 'Mai mình sẽ lên tiếng, rủ thêm đồng minh.' },
      { day: 6, intro: [
          { who: 'gumi', text: 'Một mình thì cô đơn lắm. Mình khoe ly hôm nay lên Story, biết đâu có bạn cùng đi!' },
        ], win: [ { who: 'gumi', text: 'Đã có người thả tim và hỏi cách làm. Đội quân bớt ngọt bắt đầu đông rồi!' } ],
        tease: 'Mai là CỬA ẢI đầu tiên: thoát khỏi Đầm Lầy Ngọt.' },
      { day: 7, intro: [
          { who: 'boss', text: 'Định bỏ ta mà đi hả Gumi? Đầm lầy này giữ chân ngươi mãi mãi!' },
          { who: 'gumi', text: 'Sáu ngày qua mình đã khác rồi, Boss. Xem mình bước qua cửa này nè!' },
        ], win: [ { who: 'narrator', text: 'Gumi loé sáng, mắt bớt lờ đờ, bụng nhẹ đi một nấc.' },
          { who: 'gumi', text: 'CỬA ẢI 1 hoàn thành! Tạm biệt Đầm Lầy Ngọt.' } ],
        tease: 'Chặng sau: Rừng Đường Ẩn — nơi cám dỗ tinh vi hơn.' },

      { day: 8, intro: [
          { who: 'narrator', text: 'Bước vào Rừng Đường Ẩn, sương mù ngòn ngọt phủ khắp nơi.' },
          { who: 'gumi', text: 'Hôm nay mình chạm mốc 30% đường. Rừng này không doạ được mình đâu!' },
        ], win: [ { who: 'gumi', text: '30% thôi mà vẫn ngon. Mình đang quen dần với vị thật.' } ],
        tease: 'Mai mình học chiêu "Sugar Crash" của Boss.' },
      { day: 9, intro: [
          { who: 'boss', text: 'Uống ngọt vào đi, phê lắm~ (rồi tí nữa mệt rũ ta không chịu trách nhiệm đâu nhé)' },
          { who: 'gumi', text: 'À, đây chính là đòn Sugar Crash. Dụ mình lên cao rồi bỏ mình rơi. Biết tỏng!' },
        ], win: [ { who: 'gumi', text: 'Hiểu chiêu rồi thì hết sợ. Boss mất một vũ khí lớn.' } ],
        tease: 'Mai là ngày dễ sa ngã: đi chơi, tiệc tùng.' },
      { day: 10, intro: [
          { who: 'narrator', text: 'Cả bàn tiệc toàn nước ngọt và trà sữa.' },
          { who: 'gumi', text: 'Cám dỗ khắp nơi… nhưng mình chọn ly ít đường. Giữ vững nào!' },
        ], win: [ { who: 'gumi', text: 'Vượt qua rồi! Hoá ra từ chối cũng chẳng khó như mình nghĩ.' } ],
        tease: 'Mai rủ một người bạn cùng chiến.' },
      { day: 11, intro: [
          { who: 'gumi', text: 'Có đồng đội thì đi xa hơn. Mình rủ một buddy cùng uống giảm đường và cụng ly!' },
        ], win: [ { who: 'gumi', text: 'Hai đứa cụng ly "cheers"! Có bạn đồng hành, tự nhiên bền hơn hẳn.' } ],
        tease: 'Mai mình luyện đọc nhãn ở cấp khó hơn.' },
      { day: 12, intro: [
          { who: 'gumi', text: 'Rừng càng sâu, đường trốn càng kỹ. Mình đọc nhãn kỹ hơn một bậc.' },
        ], win: [ { who: 'gumi', text: 'Giờ nhìn nhãn là mình đoán được độ ngọt luôn. Lên trình rồi!' } ],
        tease: 'Mai giữ mức thấp thật vững.' },
      { day: 13, intro: [
          { who: 'gumi', text: 'Không cần kỷ lục mới. Hôm nay mình chỉ cần GIỮ mức thấp thật đều.' },
        ], win: [ { who: 'gumi', text: 'Giữ vững cũng là chiến thắng. Rừng sắp hết rồi!' } ],
        tease: 'Mai là CỬA ẢI 2: vượt khỏi Rừng Đường Ẩn.' },
      { day: 14, intro: [
          { who: 'boss', text: 'Ngươi đi được nửa đường rồi… nhưng nửa còn lại mới là địa ngục!' },
          { who: 'gumi', text: 'Mình không đơn độc nữa đâu Boss. Cả đội đứng sau mình nè!' },
        ], win: [ { who: 'narrator', text: 'Gumi loé sáng lần hai, thân hình thon lại rõ rệt.' },
          { who: 'gumi', text: 'CỬA ẢI 2 hoàn thành! Rừng Đường Ẩn, tạm biệt.' } ],
        tease: 'Chặng cuối: Đỉnh 0% — nơi Gumi lột xác.' },

      { day: 15, intro: [
          { who: 'narrator', text: 'Không khí trên Đỉnh 0% trong veo, mát lạnh.' },
          { who: 'gumi', text: 'Ly đầu tiên hoàn toàn 0% đường. Hồi hộp ghê… mà cũng tự hào ghê!' },
        ], win: [ { who: 'gumi', text: 'Nước lọc mà mình thấy… ngọt nhẹ thật! Vị giác mình reset rồi.' } ],
        tease: 'Mai mình kiểm tra xem vị giác đã đổi tới đâu.' },
      { day: 16, intro: [
          { who: 'gumi', text: 'Thử lại mấy món ngày xưa mình mê xem sao. Liệu còn thấy ngon như trước?' },
        ], win: [ { who: 'gumi', text: 'Ngọt gắt quá, mình uống không nổi nữa! Cơ thể mình đã chọn phe rồi.' } ],
        tease: 'Mai giữ vững phong độ 0%.' },
      { day: 17, intro: [
          { who: 'gumi', text: 'Đỉnh cao là giữ được điều tốt mỗi ngày. Hôm nay lại một ly 0% nữa.' },
        ], win: [ { who: 'gumi', text: 'Đều đặn và nhẹ tênh. Boss Đường gần như hết đất diễn.' } ],
        tease: 'Mai mình lan toả hành trình cho nhiều người hơn.' },
      { day: 18, intro: [
          { who: 'gumi', text: 'Mình muốn kể lại cả hành trình, để ai đang do dự cũng dám bắt đầu.' },
        ], win: [ { who: 'gumi', text: 'Nhiều người nhắn "mình cũng muốn thử"! Cảm giác truyền cảm hứng đã thật.' } ],
        tease: 'Mai mình sáng tạo ly "signature" của riêng mình.' },
      { day: 19, intro: [
          { who: 'gumi', text: 'Sau 18 ngày, mình tự pha được ly healthy hợp gu nhất. Đây là chân ái mới!' },
        ], win: [ { who: 'gumi', text: 'Ly của riêng mình, không cần nhiều đường vẫn tuyệt. Đây mới là thói quen bền.' } ],
        tease: 'Mai mình ngồi lại, tổng kết cả chặng đường.' },
      { day: 20, intro: [
          { who: 'narrator', text: 'Gumi nhìn lại bản đồ đã đi gần trọn.' },
          { who: 'gumi', text: 'Bao nhiêu gram đường mình đã cắt được rồi nhỉ? Nhìn con số mà nổi da gà.' },
        ], win: [ { who: 'gumi', text: 'Nhiều hơn mình tưởng! Chỉ còn một bước tới đỉnh nữa thôi.' } ],
        tease: 'Mai là TỐT NGHIỆP: Gumi tiến hoá thành Chiến Thần 0% Đường.' },
      { day: 21, intro: [
          { who: 'boss', text: 'Không… ngươi đã hết cần tới ta rồi sao?!' },
          { who: 'gumi', text: 'Cảm ơn vì đã làm kẻ thù xứng tầm, Boss. Nhưng đường ai nấy đi.' },
          { who: 'narrator', text: 'Ánh sáng bùng lên trên Đỉnh 0%…' },
        ], win: [ { who: 'gumi', text: 'CHIẾN THẦN 0% ĐƯỜNG đã thức tỉnh! 21 ngày, cảm ơn bạn đã dắt mình đi.' } ],
        tease: 'Viết một câu cảm nhận gửi lên Bức tường cộng đồng của Gumi nhé!' },
    ] as Chapter[],
  },

  checkin: {
    title: 'Check-in bằng ảnh', pick: 'Chọn hoặc chụp ảnh', change: 'Đổi ảnh', level: 'Mức đường bạn đã uống', submit: 'Gửi check-in',
    uploading: 'Đang tải ảnh lên…', success: (pts: number) => `Xong! Bạn nhận +${pts} điểm.`,
    errors: { network: 'Mất kết nối. Ảnh của bạn vẫn được giữ, hãy thử lại.', notToday: 'Nhiệm vụ này không phải của hôm nay.', already: 'Bạn đã check-in ngày này rồi.', tooLarge: 'Ảnh quá lớn hoặc không phải ảnh. Hãy chọn ảnh khác.', level: 'Mức đường này không hợp lệ cho nhiệm vụ hôm nay.' },
    retry: 'Thử lại', back: 'Về bản đồ',
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
    { day: 2, kind: 'KNOW', title: 'Đoán Thìa Đoán Muỗng', description: 'Mini-quiz: đoán số thìa đường trong đồ uống quen thuộc.', points: 10 },
    { day: 3, kind: 'DRINK', title: 'Nói Không Với Topping Ngọt', description: 'Chọn đồ uống không trân châu đen hoặc siro ngọt. Check-in ảnh ly.', points: 10 },
    { day: 4, kind: 'KNOW', title: 'Vạch Mặt Đường Ẩn', description: 'Tìm 3 cái tên "trá hình" của đường trên nhãn thành phần.', points: 10 },
    { day: 5, kind: 'DRINK', title: 'Hạ Thêm Một Nấc', description: 'Hạ tiếp một nấc đường so với hôm qua. Check-in ảnh.', points: 15 },
    { day: 6, kind: 'SHARE', title: 'Khoe Ly Cùng Gumi', description: 'Chụp ly giảm đường và đăng Story kèm hashtag. Tải ảnh chụp màn hình lên.', points: 20 },
    { day: 7, kind: 'BOSS', title: 'Thoát Đầm Lầy Ngọt', description: 'Nhìn lại tuần đầu và vượt cửa ải. Gumi loé sáng, mạnh lên một nấc.', points: 30 },
    { day: 8, kind: 'DRINK', title: 'Hạ Bậc Chạm Mốc 30%', description: 'Uống ở mức tối đa 30% đường. Check-in ảnh.', points: 20 },
    { day: 9, kind: 'KNOW', title: 'Vạch Mặt Sugar Crash', description: 'Hiểu chiêu "Sugar Crash": ngọt dụ lên cao rồi bỏ rơi bạn mệt lả.', points: 10 },
    { day: 10, kind: 'DRINK', title: 'Vượt Cám Dỗ Tiệc Tùng', description: 'Giữa bàn tiệc toàn đồ ngọt, chọn ly ít đường. Check-in ảnh.', points: 15 },
    { day: 11, kind: 'SHARE', title: 'Buddy Challenge', description: 'Rủ một người bạn cùng uống giảm đường. Chụp ảnh hai ly cụng nhau.', points: 20 },
    { day: 12, kind: 'KNOW', title: 'Đọc Nhãn Cấp Cao', description: 'Luyện đọc nhãn khó hơn: xếp hạng độ ngọt của vài sản phẩm.', points: 10 },
    { day: 13, kind: 'DRINK', title: 'Giữ Mức Thấp', description: 'Không cần phá kỷ lục — giữ mức đường thấp thật đều. Check-in ảnh.', points: 15 },
    { day: 14, kind: 'BOSS', title: 'Vượt Rừng Đường Ẩn', description: 'Vượt cửa ải giữa chặng. Gumi loé sáng lần hai, thon lại rõ.', points: 40 },
    { day: 15, kind: 'DRINK', title: 'Thanh Lọc Nguyên Bản', description: 'Uống một ly 0% đường: nước lọc, cold brew hoặc trà mộc. Check-in ảnh.', points: 25 },
    { day: 16, kind: 'KNOW', title: 'Vị Giác Đã Đổi', description: 'Thử lại món ngọt cũ và tự chấm: giờ còn thấy ngon như xưa không?', points: 10 },
    { day: 17, kind: 'DRINK', title: 'Giữ Vững 0%', description: 'Thêm một ngày 0% đường. Đều đặn là siêu năng lực. Check-in ảnh.', points: 20 },
    { day: 18, kind: 'SHARE', title: 'Lan Toả Hành Trình', description: 'Kể lại hành trình của bạn để truyền cảm hứng cho người khác.', points: 20 },
    { day: 19, kind: 'DRINK', title: 'Ly Signature Của Bạn', description: 'Tự sáng tạo ly healthy hợp gu nhất. Check-in ảnh thành phẩm.', points: 20 },
    { day: 20, kind: 'KNOW', title: 'Tổng Kết Đường Đã Cắt', description: 'Xem lại tổng lượng đường bạn đã cắt giảm suốt hành trình.', points: 10 },
    { day: 21, kind: 'FINAL', title: 'Tốt Nghiệp & Tiến Hoá', description: 'Viết một câu cảm nhận gửi lên Bức tường cộng đồng. Gumi tiến hoá thành Chiến Thần 0% đường.', points: 50 },
  ],
} as const;

export type MissionKind = 'DRINK' | 'KNOW' | 'SHARE' | 'FINAL' | 'BOSS';
