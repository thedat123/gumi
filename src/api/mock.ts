// Adapter DỮ LIỆU GIẢ — chạy ngay không cần backend, để phát triển UI và demo.
// Lưu ở localStorage CHỈ cho mock (khoá 'ld_mock_v1'); bản Supabase thật KHÔNG dùng localStorage.
// Mô phỏng thời gian kiểu "sandbox": hoàn thành nhiệm vụ hôm nay thì tự sang ngày kế, để bấm hết 10 ngày mà xem.
import { vi } from '../content/vi';
import { gramsPerDrink, gramsToSpoons, type SugarLevel } from '../lib/sugar';
import { computeDays, gumiStateOf, totalPoints, TOTAL_DAYS } from '../lib/scoring';
import { drinkTarget } from '../lib/drinkChallenge';
import {
  ApiError,
  type AdminApi,
  type AdminCheckin,
  type AdminPlayer,
  type AdminStats,
  type Api,
  type AuthApi,
  type CampaignState,
  type CheckinResult,
  type CheckinStatus,
  type CreateProfileInput,
  type Journey,
  type Leaderboard,
  type LeaderRow,
  type Profile,
  type QuizQuestion,
  type QuizResult,
  type Session,
  type Summary,
  type WallPost,
} from './types';

const KEY = 'ld_mock_v3';
const START_LEVEL: SugarLevel = 100;
const PASSES = 3;

// Allowlist admin: CHỈ các email cấu hình ở VITE_ADMIN_EMAILS (ngăn cách dấu phẩy) mới được quyền admin.
// Không đặt biến → không có admin (an toàn mặc định). So khớp chính xác, không phân biệt hoa/thường.
const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);
const isAdminEmail = (email: string): boolean => ADMIN_EMAILS.includes(email.trim().toLowerCase());

// ⚙️ TÀI KHOẢN TEST CỐ ĐỊNH (chỉ ở mock/demo) — đăng nhập là MỞ HẾT: tự có hồ sơ (bỏ onboarding),
// mọi ngày trên bản đồ bấm được, làm nhiệm vụ ngày nào cũng chạy, xem được mọi màn (kể cả Summary/Admin).
const TEST_ACCOUNTS: Record<string, { password: string; admin?: boolean; name: string; avatar: string }> = {
  'test1@gumi.vn': { password: 'test1234', name: 'Người Test 1', avatar: '🐱' },
  'test2@gumi.vn': { password: 'test1234', name: 'Người Test 2', avatar: '🐰' },
  'test3@gumi.vn': { password: 'test1234', name: 'Người Test 3', avatar: '🐻' },
  'test4@gumi.vn': { password: 'test1234', name: 'Người Test 4', avatar: '🐼' },
  'test5@gumi.vn': { password: 'test1234', name: 'Người Test 5', avatar: '🐨' },
  'admin@gumi.vn': { password: 'test1234', admin: true, name: 'Admin Test', avatar: '🦊' },
};
const testAccount = (email: string) => TEST_ACCOUNTS[email.trim().toLowerCase()];
// Ánh xạ ngày → loại nhiệm vụ cho hành trình 21 ngày (khớp vi.missions và MissionRouter).
const LEVEL_DAYS = [1, 5, 15, 20]; // DRINK có chọn mức đường + dùng tính đường đã cắt
const DRINK_DAYS = [1, 5, 10, 15, 20]; // ngày DRINK (đếm ly healthy)
const SHARE_DAYS = [4, 8, 13]; // check-in ảnh, không chọn mức
const PHOTO_DAYS = [...DRINK_DAYS, ...SHARE_DAYS]; // mọi ngày check-in ảnh
const MINIGAME_DAYS = [3, 6, 7, 9, 11, 12, 14, 16, 17, 18, 19, 21]; // GAME/KNOW/TRACKER + 3 cửa ải boss (7,14,21 hoàn thành bằng submitMinigame). Quiz Day2 tách riêng.

interface Persisted {
  session: Session | null;
  users: Record<string, { password: string; userId: string; role: 'player' | 'admin' }>;
  profile: Profile | null;
  campaignDay: number;
  completed: number[];
  passed: number[];
  rejected: number[];
  levels: Record<number, SugarLevel>; // mức đường đã check-in mỗi ngày DRINK
  quiz: QuizResult | null;
  wall: WallPost[];
  passesLeft: number; // số Bùa Hồi Sinh còn lại (bắt đầu 3)
  lastDoneDate: string | null; // ngày (YYYY-MM-DD) hoàn thành chặng gần nhất → chốt "mỗi ngày 1 chặng"
  lastPlayDate: string | null; // ngày mở chơi gần nhất → tính streak "bắt đầu chơi"
  playStreak: number;          // số ngày liên tiếp bấm bắt đầu chơi
  storyBonus: number;
  earnedPoints: Record<number, number>;
}

// Không seed dữ liệu giả: tường bắt đầu trống, bảng xếp hạng chỉ hiển thị người chơi thật.
const SEED_WALL: WallPost[] = [];

const ADMIN_SEED: AdminCheckin[] = [
  { id: 'c1', user: 'Mai Anh', day: 3, status: 'approved', emoji: '🧋' },
  { id: 'c2', user: 'Quang Huy', day: 3, status: 'pending', emoji: '🥤' },
  { id: 'c3', user: 'Bảo Ngọc', day: 3, status: 'pending', emoji: '🍵' },
  { id: 'c4', user: 'Thanh Tùng', day: 3, status: 'rejected', emoji: '🧃' },
  { id: 'c5', user: 'Phương Linh', day: 3, status: 'pending', emoji: '☕️', flag: 'ảnh trùng ngày khác' },
  { id: 'c6', user: 'Đức Minh', day: 3, status: 'pending', emoji: '🥛', flag: 'nghi ngờ chỉnh sửa' },
];

// Ngưỡng đạt chỉ tiêu nhận quà: hoàn thành từ 14/21 ngày trở lên (theo brief mục VI).
const ELIGIBLE_MIN = 14;

// Kho tên + avatar để dựng danh sách người chơi giả cho màn quản lý của admin.
const NAME_POOL = [
  'Mai Anh', 'Quang Huy', 'Bảo Ngọc', 'Thanh Tùng', 'Phương Linh', 'Đức Minh', 'Khánh Vy', 'Hoàng Nam', 'Ngọc Diệp', 'Gia Bảo',
  'Tuấn Kiệt', 'Hà My', 'Minh Châu', 'Đăng Khoa', 'Thu Trang', 'Nhật Hào', 'Kim Oanh', 'Phú Quý', 'Diễm Quỳnh', 'Trọng Nghĩa',
  'Lan Chi', 'Việt Anh', 'Hồng Nhung', 'Anh Tú', 'Bích Phương', 'Duy Khang', 'Cẩm Tú', 'Gia Hân', 'Hải Đăng', 'Yến Nhi',
];
const AVATAR_POOL = ['🐱', '🦊', '🐰', '🐻', '🐼', '🐯', '🐨', '🦁', '🐸', '🐷', '🐹', '🐮'];

/** Sinh danh sách người chơi ổn định (không random) để thống kê nhất quán giữa các lần tải. */
function genPlayers(count: number): AdminPlayer[] {
  const list: AdminPlayer[] = [];
  for (let i = 0; i < count; i++) {
    // Phân bổ tiến độ đa dạng: một số về đích, một số đạt chỉ tiêu, phần còn lại đang chơi/bỏ giữa chừng.
    const daysDone = Math.max(0, Math.min(TOTAL_DAYS, Math.round(((i * 37 + 11) % 25) - 2)));
    const finished = daysDone >= TOTAL_DAYS;
    const eligible = daysDone >= ELIGIBLE_MIN;
    const usedPass = (i * 7) % 5 === 0;
    const streak = Math.max(0, daysDone - ((i * 3) % 4));
    const points = daysDone * 15 + (daysDone >= 5 ? 10 : 0) + (daysDone >= 10 ? 20 : 0) + (eligible ? 30 : 0) + (finished ? 50 : 0);
    list.push({
      id: `p${i + 1}`,
      name: NAME_POOL[i % NAME_POOL.length]! + (i >= NAME_POOL.length ? ` ${Math.floor(i / NAME_POOL.length) + 1}` : ''),
      avatar: AVATAR_POOL[i % AVATAR_POOL.length]!,
      daysDone, points, streak, eligible, finished, usedPass,
    });
  }
  return list.sort((a, b) => b.points - a.points);
}

const PLAYERS_SEED = genPlayers(78);

function fresh(): Persisted {
  return { session: null, users: {}, profile: null, campaignDay: 1, completed: [], passed: [], rejected: [], levels: {}, quiz: null, wall: [...SEED_WALL], passesLeft: PASSES, lastDoneDate: null, lastPlayDate: null, playStreak: 0, storyBonus: 0, earnedPoints: {} };
}

function load(): Persisted {
  if (typeof localStorage === 'undefined') return fresh();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    return { ...fresh(), ...(JSON.parse(raw) as Persisted) };
  } catch {
    return fresh();
  }
}

// Độ trễ giả để UI cảm nhận được loading; bỏ trễ khi chạy test cho nhanh.
const DELAY_ON = !import.meta.env?.TEST;
function delay<T>(v: T, ms = 260): Promise<T> {
  return DELAY_ON ? new Promise((r) => setTimeout(() => r(v), ms)) : Promise.resolve(v);
}

const uid = (() => {
  let n = 0;
  return () => `u${(n += 1)}-${Date.now().toString(36)}`;
})();

// Test seam: giả lập "sang ngày mới" trong unit test để kiểm thử luật mỗi-ngày-một-chặng.
// Ứng dụng thật không bao giờ gọi advanceMockDay → mockToday() = ngày thực.
let mockDayOffset = 0;
const mockToday = () => new Date(Date.now() + mockDayOffset * 86_400_000).toISOString().slice(0, 10);
export function advanceMockDay() { mockDayOffset += 1; }

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Ước tính đường đã cắt giảm (D7): tổng chênh g/ly trên các ngày DRINK đã check-in, 1 ly/ngày. */
function sugarCut(levels: Record<number, SugarLevel>): number {
  return LEVEL_DAYS.reduce((sum, d) => {
    const lv = levels[d];
    return lv == null ? sum : sum + (gramsPerDrink(START_LEVEL) - gramsPerDrink(lv));
  }, 0);
}

export function createMockApi(): Api {
  let state = load();
  const listeners = new Set<(s: Session | null) => void>();

  const save = () => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(state));
  };
  const requireSession = (): Session => {
    if (!state.session) throw new ApiError('forbidden', 'Chưa đăng nhập');
    return state.session;
  };
  const emitAuth = () => listeners.forEach((cb) => cb(state.session));
  // Phiên hiện tại có phải tài khoản test không → dùng để MỞ HẾT gating.
  const isTestSession = () => !!state.session && !!testAccount(state.session.email);
  // Chỉ tài khoản test được mở hết. Quyền admin không đồng nghĩa với quyền bỏ qua tiến độ.
  const isUnlocked = () => isTestSession();

  const progress = () => ({
    // Tester: coi như đã tới chặng cuối → mọi nút trên bản đồ bấm được.
    campaignDay: isUnlocked() ? TOTAL_DAYS : state.campaignDay,
    completed: new Set(state.completed),
    passed: new Set(state.passed),
    rejected: new Set(state.rejected),
    quizScore: state.quiz?.score,
    storyBonus: state.storyBonus,
    earnedPoints: state.earnedPoints,
  });

  const todayStr = mockToday;
  const yesterdayStr = () => new Date(Date.now() + (mockDayOffset - 1) * 86_400_000).toISOString().slice(0, 10);
  const twoDaysAgoStr = () => new Date(Date.now() + (mockDayOffset - 2) * 86_400_000).toISOString().slice(0, 10);
  // Streak "bắt đầu chơi": còn sống khi chơi hôm nay/hôm qua; LỠ 1 NGÀY = "hấp hối" nhưng CHƯA đứt
  // (vẫn hiện số); lỡ ≥2 ngày → đứt (về 0).
  const playStreakLive = () => {
    const last = state.lastPlayDate;
    if (!last) return 0;
    return last === todayStr() || last === yesterdayStr() || last === twoDaysAgoStr() ? state.playStreak : 0;
  };
  // Đang hấp hối (lỡ đúng 1 ngày)? Cứu được nếu còn Bùa + đang có chuỗi.
  const isDying = () => !isUnlocked() && state.playStreak > 0 && state.lastPlayDate === twoDaysAgoStr();
  const canFreeze = () => isDying() && state.passesLeft > 0;

  const advance = (day: number) => {
    if (!state.completed.includes(day)) state.completed.push(day);
    if (day === state.campaignDay && state.campaignDay <= TOTAL_DAYS) state.campaignDay = day + 1;
    state.lastDoneDate = todayStr();
  };
  const ensurePlayable = (day: number) => {
    if (!isUnlocked() && day !== state.campaignDay) throw new ApiError('not_today');
  };

  // Chiến dịch còn "đang chạy" chừng nào chưa quá ngày 10 mà chưa hoàn thành. Xong đủ 10 ngày vẫn coi là running để hiện màn tốt nghiệp.
  const phaseOf = (): CampaignState['phase'] => {
    if (state.completed.length >= TOTAL_DAYS) return 'running';
    return state.campaignDay > TOTAL_DAYS ? 'ended' : 'running';
  };

  const auth: AuthApi = {
    getSession: () => delay(state.session, 80),
    onChange(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    async signUp(email, password) {
      await delay(null, 400);
      const key = email.trim().toLowerCase();
      if (!emailRe.test(key)) throw new ApiError('wrong_password', 'Email không hợp lệ');
      if (state.users[key]) throw new ApiError('email_exists');
      const role = isAdminEmail(key) ? 'admin' : 'player';
      const userId = uid();
      state.users[key] = { password, userId, role };
      state.session = { userId, email: key };
      save();
      emitAuth();
      return state.session;
    },
    async signIn(email, password) {
      await delay(null, 400);
      const key = email.trim().toLowerCase();
      // Tài khoản test cố định: mật khẩu riêng, tự cấp hồ sơ để mở hết màn (bỏ onboarding).
      const t = testAccount(key);
      if (t) {
        if (password !== t.password) throw new ApiError('wrong_password');
        const role = t.admin || isAdminEmail(key) ? 'admin' : 'player';
        const userId = state.users[key]?.userId ?? uid();
        state.users[key] = { password: t.password, userId, role };
        state.session = { userId, email: key };
        if (!state.profile || state.profile.id !== userId) {
          state.profile = { id: userId, name: t.name, avatar: t.avatar, level: 100, drinksPerWeek: 7, role, sugarPassAvailable: true };
        } else {
          state.profile.role = role;
        }
        save();
        emitAuth();
        return state.session;
      }
      const u = state.users[key];
      // Cho phép đăng nhập demo nhanh với mật khẩu gumi1234 nếu chưa từng đăng ký.
      if (!u) {
        if (password !== 'gumi1234') throw new ApiError('wrong_password');
        const role = isAdminEmail(key) ? 'admin' : 'player';
        const userId = uid();
        state.users[key] = { password, userId, role };
        state.session = { userId, email: key };
      } else {
        if (u.password !== password) throw new ApiError('wrong_password');
        state.session = { userId: u.userId, email: key };
      }
      save();
      emitAuth();
      return state.session;
    },
    async signInWithGoogle() {
      await delay(null, 500);
      const key = 'ban.gumi@gmail.com';
      if (!state.users[key]) state.users[key] = { password: '', userId: uid(), role: isAdminEmail(key) ? 'admin' : 'player' };
      state.session = { userId: state.users[key]!.userId, email: key };
      save();
      emitAuth();
      return state.session;
    },
    async signOut() {
      await delay(null, 120);
      state.session = null;
      save();
      emitAuth();
    },
    async resetPassword(email) {
      await delay(null, 400);
      const key = email.trim().toLowerCase();
      if (!emailRe.test(key)) throw new ApiError('wrong_password', 'Email không hợp lệ');
      // Mock: luôn coi như đã gửi mail (không lộ email có tồn tại hay không). Bản thật gọi resetPasswordForEmail.
    },
    async updatePassword(newPassword) {
      const s = requireSession();
      await delay(null, 300);
      if (newPassword.length < 8) throw new ApiError('wrong_password', 'Mật khẩu quá ngắn');
      const u = state.users[s.email];
      if (u) u.password = newPassword;
      save();
    },
    async changePassword(currentPassword, newPassword) {
      const s = requireSession();
      await delay(null, 400);
      if (newPassword.length < 8) throw new ApiError('wrong_password', 'Mật khẩu quá ngắn');
      const u = state.users[s.email];
      // Xác thực lại mật khẩu hiện tại (tài khoản đăng nhập Google mock có password rỗng → bỏ qua bước này).
      if (u && u.password && u.password !== currentPassword) throw new ApiError('wrong_password');
      if (u) u.password = newPassword;
      save();
    },
  };

  const admin: AdminApi = {
    async getStats(): Promise<AdminStats> {
      requireSession();
      if (state.profile?.role !== 'admin') throw new ApiError('forbidden');
      const players = PLAYERS_SEED;
      const total = players.length;
      const sumPoints = players.reduce((s, p) => s + p.points, 0);
      const sumDays = players.reduce((s, p) => s + p.daysDone, 0);
      return delay({
        totalPlayers: total,
        activePlayers: players.filter((p) => p.daysDone > 0 && !p.finished).length,
        eligibleCount: players.filter((p) => p.eligible).length,
        finishedCount: players.filter((p) => p.finished).length,
        avgPoints: total ? Math.round(sumPoints / total) : 0,
        avgDaysDone: total ? Math.round((sumDays / total) * 10) / 10 : 0,
        pendingCheckins: ADMIN_SEED.filter((c) => c.status === 'pending').length,
        players,
      });
    },
    async listCheckins(day) {
      requireSession();
      if (state.profile?.role !== 'admin') throw new ApiError('forbidden');
      const kind = vi.missions[day - 1]?.kind;
      // Mức đường AI: chỉ minh hoạ cho ngày DRINK (giá trị giả theo mục tiêu ngày).
      const level = kind === 'DRINK' ? ({ 1: 70, 5: 50, 15: 30, 20: 0 }[day] ?? 50) : null;
      return delay(ADMIN_SEED.map((c) => ({ ...c, day, kind, level })));
    },
    async listFlags() {
      requireSession();
      if (state.profile?.role !== 'admin') throw new ApiError('forbidden');
      return delay(ADMIN_SEED.filter((c) => c.flag).map((c) => ({ ...c, kind: vi.missions[c.day - 1]?.kind })));
    },
    async setCheckinStatus(_id, _status: CheckinStatus, _reason) {
      requireSession();
      if (state.profile?.role !== 'admin') throw new ApiError('forbidden');
      await delay(null, 200); // mock: không lưu; bản thật gọi admin_set_checkin_status
    },
    async photoUrl() { return null; }, // mock dùng emoji, không có ảnh thật
  };

  return {
    source: 'mock',
    auth,
    admin,

    async getProfile() {
      requireSession();
      return delay(state.profile);
    },

    async createProfile(input: CreateProfileInput) {
      const s = requireSession();
      await delay(null, 400);
      const role = state.users[s.email]?.role ?? 'player';
      state.profile = { id: s.userId, name: input.name, avatar: input.avatar, level: input.level, drinksPerWeek: input.drinksPerWeek, role, sugarPassAvailable: true };
      save();
      return state.profile;
    },

    async updateProfile(patch) {
      requireSession();
      if (!state.profile) throw new ApiError('server');
      await delay(null, 200);
      state.profile = { ...state.profile, ...patch };
      save();
      return state.profile;
    },

    async getCampaignState(): Promise<CampaignState> {
      const unlocked = isUnlocked();
      // Cá nhân hoá: mốc bắt đầu = hôm nay (ngày người chơi "tạo tài khoản" trong phiên mock).
      const startDate = new Date().toISOString().slice(0, 10);
      const day = unlocked ? TOTAL_DAYS : Math.min(state.campaignDay, TOTAL_DAYS);
      return delay({ phase: unlocked ? 'running' : phaseOf(), day, startDate });
    },

    async getReminderStatus() {
      requireSession();
      const unlocked = isUnlocked();
      return delay({
        phase: unlocked ? 'running' as const : phaseOf(),
        day: unlocked ? TOTAL_DAYS : Math.min(state.campaignDay, TOTAL_DAYS),
        lastPlayDate: state.lastPlayDate,
        lastCompletedDate: state.lastDoneDate,
      });
    },

    // Mock không có server đẩy push — chỉ giả lập thành công để UI chạy mượt khi demo.
    async savePushSubscription() { await delay(undefined); },
    async deletePushSubscription() { await delay(undefined); },

    async getJourney(): Promise<Journey> {
      requireSession();
      const p = progress();
      const unlocked = isUnlocked();
      // Tester: mọi chặng chưa hoàn thành đều 'open'. Người thường: chỉ mở chặng kế tiếp.
      const days = unlocked
        ? computeDays(p).map((s) => (s === 'checked' || s === 'passed' || s === 'rejected' ? s : 'open'))
        : computeDays(p);
      const phase = unlocked ? 'running' : phaseOf();
      const streak = playStreakLive();
      const points = totalPoints(p, streak);
      const rejectedDay = state.rejected[0];
      return delay({
        phase,
        day: unlocked ? TOTAL_DAYS : Math.min(state.campaignDay, TOTAL_DAYS),
        days,
        totalPoints: points,
        streak,
        rank: rankFor(points),
        passAvailable: state.passesLeft > 0,
        passesLeft: state.passesLeft,
        passHoursLeft: isDying() ? 24 - new Date().getHours() : null,
        gumi: isDying() ? 'hap_hoi' : gumiStateOf(days),
        rejectedReason: rejectedDay ? 'ảnh không hợp lệ' : undefined,
        streakFreezeAvailable: canFreeze(),
        streakAtRisk: canFreeze() ? state.playStreak : 0,
        replayAll: unlocked,
      });
    },

    async markPlayed(): Promise<number> {
      requireSession();
      const t = todayStr();
      if (state.lastPlayDate !== t) {
        // CHUẨN: chỉ +1 khi chơi liên tục (hôm qua). Nghỉ ≥1 ngày mà không cứu bằng Bùa → mất chuỗi (về 1).
        state.playStreak = state.lastPlayDate === yesterdayStr() ? state.playStreak + 1 : 1;
        state.lastPlayDate = t;
        save();
      }
      return delay(playStreakLive(), 60);
    },

    async useStreakFreeze(): Promise<number> {
      requireSession();
      await delay(null, 400);
      if (state.passesLeft <= 0) throw new ApiError('no_pass');
      if (!canFreeze()) throw new ApiError('not_today'); // chỉ cứu khi lỡ đúng 1 ngày
      state.passesLeft -= 1;
      if (state.profile) state.profile.sugarPassAvailable = state.passesLeft > 0;
      state.lastPlayDate = yesterdayStr(); // nối chuỗi: coi như đã chơi hôm qua → chuỗi sống lại
      save();
      return playStreakLive();
    },

    async getLeaderboard(): Promise<Leaderboard> {
      requireSession();
      const p = progress();
      const myPoints = totalPoints(p, playStreakLive());
      // Không có đối thủ giả: chỉ có chính người chơi trên bảng (rank 1).
      const me: LeaderRow = { rank: 1, name: state.profile?.name ?? 'Bạn', avatar: state.profile?.avatar ?? '🐱', points: myPoints, isMe: true };
      return delay({
        top: [me],
        me: { rank: 1, points: myPoints, gapToTop10: 0, top10LastName: '' },
      });
    },

    async submitCheckin(day, level, file, needsReview = false): Promise<CheckinResult> {
      requireSession();
      await delay(null, 700);
      const testing = isUnlocked();
      if (!file || (typeof file !== 'string' && !file.size)) throw new ApiError('photo_invalid');
      ensurePlayable(day);
      if (!PHOTO_DAYS.includes(day)) throw new ApiError('not_today'); // ngày này không phải nhiệm vụ check-in ảnh
      if (!testing && state.completed.includes(day)) throw new ApiError('already_done');
      const points = vi.missions[day - 1]?.points ?? 0;

      if (needsReview) {
        // AI không nhận diện được → gửi admin duyệt tay. Ghi nhận tạm thời, thêm ảnh pending để demo màn Admin.
        ADMIN_SEED.unshift({ id: `c-rev-${Date.now()}`, user: state.profile?.name ?? 'Bạn', day, status: 'pending', emoji: '🥤', flag: 'AI chưa nhận diện — chờ duyệt tay' });
        if (LEVEL_DAYS.includes(day) && [70, 50, 30, 0].includes(level)) state.levels[day] = level;
        advance(day);
        save();
        return { ok: true, points, pending: true };
      }

      if (LEVEL_DAYS.includes(day) && ![70, 50, 30, 0].includes(level)) throw new ApiError('level_not_allowed');
      const maxLevel = drinkTarget(day, state.profile?.level ?? 100);
      if (maxLevel !== null && level > maxLevel) throw new ApiError('level_not_allowed');
      if (LEVEL_DAYS.includes(day)) state.levels[day] = level;
      advance(day);
      save();
      return { ok: true, points };
    },

    async getQuizQuestions(): Promise<QuizQuestion[]> {
      requireSession();
      return delay([{ id: 0, drink: vi.quiz.question, min: 0, max: 20 }]);
    },

    async submitQuiz(guesses): Promise<QuizResult> {
      requireSession();
      await delay(null, 500);
      // 1 câu (trà sữa): trúng khoảng 12–15 = đủ 10 điểm; lệch thì trừ dần.
      ensurePlayable(2);
      const guess = guesses[0] ?? 0;
      const lo = vi.quiz.correctMin, hi = vi.quiz.correctMax;
      const answer = Math.round((lo + hi) / 2);
      const dist = guess >= lo && guess <= hi ? 0 : Math.min(Math.abs(guess - lo), Math.abs(guess - hi));
      const points = Math.max(0, 10 - dist * 2);
      const result: QuizResult = { score: points, max: 10, items: [{ id: 0, guess, answer, points }] };
      state.quiz = result;
      advance(2);
      save();
      return result;
    },

    async submitMinigame(day, earnedPoints): Promise<CheckinResult> {
      requireSession();
      await delay(null, 400);
      if (!MINIGAME_DAYS.includes(day)) throw new ApiError('server');
      ensurePlayable(day);
      if (earnedPoints !== undefined) state.earnedPoints[day] = earnedPoints;
      advance(day);
      save();
      return { ok: true, points: earnedPoints ?? vi.missions[day - 1]?.points ?? 0 };
    },

    async submitWallPost(text, storyProof) {
      const s = requireSession();
      await delay(null, 400);
      ensurePlayable(TOTAL_DAYS);
      state.wall = [{ id: uid(), name: state.profile?.name ?? s.email, text, createdAt: new Date(0).toISOString() }, ...state.wall];
      state.storyBonus = storyProof ? 10 : 0;
      advance(TOTAL_DAYS);
      save();
    },

    async getWallPosts() {
      requireSession();
      return delay(state.wall);
    },

    async getSummary(): Promise<Summary> {
      requireSession();
      const p = progress();
      const days = computeDays(p);
      const eligible = isUnlocked() || days[TOTAL_DAYS - 1] === 'checked';
      const grams = sugarCut(state.levels);
      const lowest = (Object.values(state.levels).sort((a, b) => a - b)[0] ?? START_LEVEL) as SugarLevel;
      return delay({
        eligible,
        sugarCutGrams: grams,
        sugarCutSpoons: gramsToSpoons(grams),
        lowestLevel: lowest,
        healthyCount: DRINK_DAYS.filter((d) => state.completed.includes(d)).length,
        healthyTotal: DRINK_DAYS.length,
        quizScore: state.quiz?.score ?? 0,
        quizMax: 2,
        streak: playStreakLive(),
        totalPoints: totalPoints(p, playStreakLive()),
        rank: rankFor(totalPoints(p, playStreakLive())),
        rankFinal: state.campaignDay > TOTAL_DAYS,
      });
    },
  };

  function rankFor(_points: number): number {
    // Demo một người chơi: luôn là hạng 1 (không còn đối thủ giả).
    return 1;
  }
}

/** Xoá state mock (dùng cho nút "chơi lại demo" hoặc test). */
export function resetMock() {
  if (typeof localStorage !== 'undefined') localStorage.removeItem(KEY);
  mockDayOffset = 0;
}
