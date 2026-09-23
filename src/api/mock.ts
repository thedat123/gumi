// Adapter DỮ LIỆU GIẢ — chạy ngay không cần backend, để phát triển UI và demo.
// Lưu ở localStorage CHỈ cho mock (khoá 'ld_mock_v1'); bản Supabase thật KHÔNG dùng localStorage.
// Mô phỏng thời gian kiểu "sandbox": hoàn thành nhiệm vụ hôm nay thì tự sang ngày kế, để bấm hết 10 ngày mà xem.
import { vi } from '../content/vi';
import { gramsPerDrink, gramsToSpoons, type SugarLevel } from '../lib/sugar';
import { computeDays, gumiStateOf, longestStreak, totalPoints, TOTAL_DAYS } from '../lib/scoring';
import {
  ApiError,
  type AdminApi,
  type AdminCheckin,
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
// Ánh xạ ngày → loại nhiệm vụ cho hành trình 21 ngày (khớp vi.missions và MissionRouter).
const LEVEL_DAYS = [1, 5, 15, 20]; // DRINK có chọn mức đường + dùng tính đường đã cắt
const DRINK_DAYS = [1, 5, 10, 15, 20]; // ngày DRINK (đếm ly healthy)
const SHARE_DAYS = [4, 8, 13]; // check-in ảnh, không chọn mức
const PHOTO_DAYS = [...DRINK_DAYS, ...SHARE_DAYS]; // mọi ngày check-in ảnh
const MINIGAME_DAYS = [3, 6, 7, 9, 11, 12, 14, 16, 17, 18, 19]; // GAME/KNOW/TRACKER (quiz Day2, wall Day21 tách riêng)

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
}

const SEED_WALL: WallPost[] = vi.wall.posts.map((p, i) => ({
  id: `seed-${i}`,
  name: p.name,
  text: p.text,
  createdAt: '2026-01-10T00:00:00+07:00',
}));

const TOP10_SEED: [string, string, number][] = [
  ['Mai Anh', '🐱', 240], ['Quang Huy', '🦊', 232], ['Bảo Ngọc', '🐰', 226], ['Thanh Tùng', '🐻', 219], ['Phương Linh', '🐼', 210],
  ['Đức Minh', '🐯', 204], ['Khánh Vy', '🐨', 197], ['Hoàng Nam', '🦁', 190], ['Ngọc Diệp', '🐸', 184], ['Gia Bảo', '🐷', 178],
];

const ADMIN_SEED: AdminCheckin[] = [
  { id: 'c1', user: 'Mai Anh', day: 3, status: 'approved', emoji: '🧋' },
  { id: 'c2', user: 'Quang Huy', day: 3, status: 'pending', emoji: '🥤' },
  { id: 'c3', user: 'Bảo Ngọc', day: 3, status: 'pending', emoji: '🍵' },
  { id: 'c4', user: 'Thanh Tùng', day: 3, status: 'rejected', emoji: '🧃' },
  { id: 'c5', user: 'Phương Linh', day: 3, status: 'pending', emoji: '☕️', flag: 'ảnh trùng ngày khác' },
  { id: 'c6', user: 'Đức Minh', day: 3, status: 'pending', emoji: '🥛', flag: 'nghi ngờ chỉnh sửa' },
];

function fresh(): Persisted {
  return { session: null, users: {}, profile: null, campaignDay: 1, completed: [], passed: [], rejected: [], levels: {}, quiz: null, wall: [...SEED_WALL], passesLeft: PASSES };
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

  const progress = () => ({
    campaignDay: state.campaignDay,
    completed: new Set(state.completed),
    passed: new Set(state.passed),
    rejected: new Set(state.rejected),
    quizScore: state.quiz?.score,
  });

  const advance = (day: number) => {
    if (!state.completed.includes(day)) state.completed.push(day);
    if (day === state.campaignDay && state.campaignDay <= TOTAL_DAYS) state.campaignDay = day + 1;
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
      const role = key.startsWith('admin') ? 'admin' : 'player';
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
      const u = state.users[key];
      // Cho phép đăng nhập demo nhanh với mật khẩu gumi1234 nếu chưa từng đăng ký.
      if (!u) {
        if (password !== 'gumi1234') throw new ApiError('wrong_password');
        const role = key.startsWith('admin') ? 'admin' : 'player';
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
      if (!state.users[key]) state.users[key] = { password: '', userId: uid(), role: 'player' };
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
  };

  const admin: AdminApi = {
    async listCheckins(day) {
      requireSession();
      if (state.profile?.role !== 'admin') throw new ApiError('forbidden');
      return delay(ADMIN_SEED.map((c) => ({ ...c, day })));
    },
    async listFlags() {
      requireSession();
      if (state.profile?.role !== 'admin') throw new ApiError('forbidden');
      return delay(ADMIN_SEED.filter((c) => c.flag));
    },
    async setCheckinStatus(_id, _status: CheckinStatus, _reason) {
      requireSession();
      if (state.profile?.role !== 'admin') throw new ApiError('forbidden');
      await delay(null, 200); // mock: không lưu; bản thật gọi admin_set_checkin_status
    },
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
      return delay({ phase: phaseOf(), day: Math.min(state.campaignDay, TOTAL_DAYS), startDate: '2026-01-01' });
    },

    async getJourney(): Promise<Journey> {
      requireSession();
      const p = progress();
      const days = computeDays(p);
      const phase = phaseOf();
      const points = totalPoints(p, days);
      const rejectedDay = state.rejected[0];
      return delay({
        phase,
        day: Math.min(state.campaignDay, TOTAL_DAYS),
        days,
        totalPoints: points,
        streak: longestStreak(days),
        rank: rankFor(points),
        passAvailable: state.passesLeft > 0,
        passesLeft: state.passesLeft,
        passHoursLeft: days.includes('dying') ? 18 : null,
        gumi: gumiStateOf(days),
        rejectedReason: rejectedDay ? 'ảnh không hợp lệ' : undefined,
      });
    },

    async getLeaderboard(): Promise<Leaderboard> {
      requireSession();
      const p = progress();
      const myPoints = totalPoints(p, computeDays(p));
      const top: LeaderRow[] = TOP10_SEED.map(([name, avatar, points], i) => ({ rank: i + 1, name, avatar, points }));
      const myRank = rankFor(myPoints);
      const inTop = myRank <= 10;
      if (inTop && top[myRank - 1]) top[myRank - 1] = { ...top[myRank - 1]!, isMe: true, points: myPoints, name: state.profile?.name ?? 'Bạn' };
      const last = top[9]!;
      return delay({
        top,
        me: { rank: myRank, points: myPoints, gapToTop10: Math.max(0, last.points - myPoints + 1), top10LastName: last.name },
      });
    },

    async submitCheckin(day, level, fileName): Promise<CheckinResult> {
      requireSession();
      await delay(null, 700);
      if (!fileName) throw new ApiError('photo_invalid');
      if (day !== state.campaignDay) throw new ApiError('not_today');
      if (!PHOTO_DAYS.includes(day)) throw new ApiError('not_today'); // ngày này không phải nhiệm vụ check-in ảnh
      if (state.completed.includes(day)) throw new ApiError('already_done');
      if (LEVEL_DAYS.includes(day) && ![70, 50, 30, 0].includes(level)) throw new ApiError('level_not_allowed');
      if (LEVEL_DAYS.includes(day)) state.levels[day] = level;
      advance(day);
      save();
      return { ok: true, points: vi.missions[day - 1]?.points ?? 0 };
    },

    async useSugarPass() {
      requireSession();
      await delay(null, 500);
      if (state.passesLeft <= 0) throw new ApiError('no_pass');
      // Cứu ngày hôm nay (bỏ lỡ): đánh dấu passed, 0 điểm, giữ chuỗi, rồi sang ngày kế. Có 3 Bùa.
      const day = state.campaignDay;
      if (!state.passed.includes(day)) state.passed.push(day);
      state.passesLeft -= 1;
      if (state.profile) state.profile.sugarPassAvailable = state.passesLeft > 0;
      if (state.campaignDay <= TOTAL_DAYS) state.campaignDay = day + 1;
      save();
    },

    async getQuizQuestions(): Promise<QuizQuestion[]> {
      requireSession();
      return delay(vi.quiz.questions.map((q, i) => ({ id: i, drink: q.drink, min: 0, max: 20 })));
    },

    async submitQuiz(guesses): Promise<QuizResult> {
      requireSession();
      await delay(null, 500);
      const items = vi.quiz.questions.map((q, i) => {
        const guess = guesses[i] ?? 0;
        const points = Math.max(0, 2 - Math.abs(guess - q.answer) * 0.4);
        return { id: i, guess, answer: q.answer, points: Math.round(points * 10) / 10 };
      });
      const score = Math.round(items.reduce((s, it) => s + it.points, 0) * 10) / 10;
      const result: QuizResult = { score, max: vi.quiz.questions.length * 2, items };
      state.quiz = result;
      advance(2);
      save();
      return result;
    },

    async submitMinigame(day): Promise<CheckinResult> {
      requireSession();
      await delay(null, 400);
      if (!MINIGAME_DAYS.includes(day)) throw new ApiError('server');
      advance(day);
      save();
      return { ok: true, points: vi.missions[day - 1]?.points ?? 0 };
    },

    async submitWallPost(text) {
      const s = requireSession();
      await delay(null, 400);
      state.wall = [{ id: uid(), name: state.profile?.name ?? s.email, text, createdAt: new Date(0).toISOString() }, ...state.wall];
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
      const eligible = days[TOTAL_DAYS - 1] === 'checked';
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
        quizMax: vi.quiz.questions.length * 2,
        streak: longestStreak(days),
        totalPoints: totalPoints(p, days),
        rank: rankFor(totalPoints(p, days)),
        rankFinal: state.campaignDay > TOTAL_DAYS,
      });
    },
  };

  function rankFor(points: number): number {
    // Xếp so với TOP10 seed; điểm cao hơn thì hạng nhỏ hơn. Ngoài Top 10 thì suy ra hạng gần đúng.
    const better = TOP10_SEED.filter(([, , p]) => p > points).length;
    if (better < 10) return better + 1;
    return 10 + Math.max(1, Math.round((TOP10_SEED[9]![2] - points) / 3));
  }
}

/** Xoá state mock (dùng cho nút "chơi lại demo" hoặc test). */
export function resetMock() {
  if (typeof localStorage !== 'undefined') localStorage.removeItem(KEY);
}
