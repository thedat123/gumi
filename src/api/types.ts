// Mô hình miền + hợp đồng API. UI chỉ phụ thuộc file này, không biết dữ liệu đến từ mock hay Supabase.
import type { SugarLevel } from '../lib/sugar';

// Khớp ràng buộc missions.kind trong supabase/migrations/0001_init.sql.
export type MissionKind = 'DRINK' | 'KNOW' | 'SHARE' | 'GAME' | 'FINAL';
export type DayState = 'checked' | 'passed' | 'open' | 'dying' | 'missed' | 'rejected' | 'future';
export type GumiState = 'bo_pho' | 'hap_hoi' | 'tien_hoa';
export type GumiEvent = 'cheer' | 'revive' | 'evolve';
export type CampaignPhase = 'before' | 'running' | 'ended';
export type CheckinStatus = 'approved' | 'rejected' | 'pending';
export type Role = 'player' | 'admin';

export interface Session {
  userId: string;
  email: string;
}

export interface Profile {
  id: string;
  name: string;
  avatar: string;
  level: SugarLevel;
  drinksPerWeek: number;
  role: Role;
  sugarPassAvailable: boolean;
}

export interface CampaignState {
  phase: CampaignPhase;
  /** 0 khi chưa bắt đầu; 1..10 khi đang chạy; >10 khi đã kết thúc. */
  day: number;
  startDate: string; // ISO date (Asia/Ho_Chi_Minh)
}

/** Tổng hợp cho Dashboard: get_my_journey + get_campaign_state + get_my_rank. */
export interface Journey {
  phase: CampaignPhase;
  day: number;
  days: DayState[];
  totalPoints: number;
  streak: number;
  rank: number;
  passAvailable: boolean;
  passesLeft: number; // số Bùa Hồi Sinh còn lại (0..3)
  passHoursLeft: number | null;
  gumi: GumiState;
  rejectedReason?: string;
}

export interface LeaderRow {
  rank: number;
  name: string;
  avatar: string;
  points: number;
  isMe?: boolean;
}

export interface Leaderboard {
  top: LeaderRow[];
  me: { rank: number; points: number; gapToTop10: number; top10LastName: string } | null;
}

export interface QuizQuestion {
  id: number;
  drink: string;
  min: number;
  max: number;
}

export interface QuizOutcomeItem {
  id: number;
  guess: number;
  answer: number;
  points: number;
}

export interface QuizResult {
  score: number;
  max: number;
  items: QuizOutcomeItem[];
}

export interface WallPost {
  id: string;
  name: string;
  text: string;
  createdAt: string;
}

export interface Summary {
  eligible: boolean;
  sugarCutGrams: number;
  sugarCutSpoons: number;
  lowestLevel: SugarLevel;
  healthyCount: number;
  healthyTotal: number;
  quizScore: number;
  quizMax: number;
  streak: number;
  totalPoints: number;
  rank: number;
  rankFinal: boolean;
}

export interface CheckinResult {
  ok: true;
  points: number;
}

export interface AdminCheckin {
  id: string;
  user: string;
  day: number;
  status: CheckinStatus;
  emoji: string; // ảnh thật: URL có chữ ký; ở mock là emoji minh hoạ
  flag?: string;
}

/** Một dòng người chơi trong bảng quản lý của admin. */
export interface AdminPlayer {
  id: string;
  name: string;
  avatar: string;
  daysDone: number;   // số ngày đã hoàn thành (duyệt)
  points: number;
  streak: number;
  eligible: boolean;  // đạt chỉ tiêu nhận quà (>= 14/21 ngày)
  finished: boolean;  // hoàn thành đủ 21 ngày
  usedPass: boolean;  // đã từng dùng Sugar Pass (ảnh hưởng ưu tiên xếp hạng)
}

/** Thống kê tổng quan cho màn Admin. */
export interface AdminStats {
  totalPlayers: number;
  activePlayers: number;   // đang chơi (đã làm >=1 ngày, chưa hoàn thành)
  eligibleCount: number;   // đạt chỉ tiêu >= 14/21 ngày
  finishedCount: number;   // hoàn thành đủ 21 ngày
  avgPoints: number;
  avgDaysDone: number;
  pendingCheckins: number; // số ảnh đang chờ duyệt (gồm cả cần duyệt tay)
  players: AdminPlayer[];
}

export interface CreateProfileInput {
  name: string;
  avatar: string;
  level: SugarLevel;
  drinksPerWeek: number;
}

/** Lỗi có mã để UI hiển thị đúng thông điệp (mất mạng, không phải hôm nay, đã làm rồi...). */
export type ApiErrorCode =
  | 'network'
  | 'not_today'
  | 'already_done'
  | 'level_not_allowed'
  | 'photo_invalid'
  | 'email_exists'
  | 'wrong_password'
  | 'forbidden'
  | 'no_pass'
  | 'server';

export class ApiError extends Error {
  code: ApiErrorCode;
  constructor(code: ApiErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
    this.name = 'ApiError';
  }
}

export interface AuthApi {
  getSession(): Promise<Session | null>;
  onChange(cb: (s: Session | null) => void): () => void;
  signUp(email: string, password: string): Promise<Session>;
  signIn(email: string, password: string): Promise<Session>;
  /** Đăng nhập Google. Mock trả Session ngay; Supabase chuyển hướng OAuth rồi trả null (onChange bắt sau khi quay lại). */
  signInWithGoogle(): Promise<Session | null>;
  signOut(): Promise<void>;
  /** Gửi email đặt lại mật khẩu. Không tiết lộ email có tồn tại hay không (chống dò tài khoản). */
  resetPassword(email: string): Promise<void>;
  /** Đặt mật khẩu mới cho phiên hiện tại (sau khi bấm link khôi phục trong email, hoặc khi đã đăng nhập). */
  updatePassword(newPassword: string): Promise<void>;
  /** Đổi mật khẩu khi đang đăng nhập: xác thực lại mật khẩu hiện tại rồi mới đặt mật khẩu mới. */
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
}

export interface AdminApi {
  getStats(): Promise<AdminStats>;
  listCheckins(day: number): Promise<AdminCheckin[]>;
  listFlags(): Promise<AdminCheckin[]>;
  setCheckinStatus(id: string, status: CheckinStatus, reason?: string): Promise<void>;
}

export interface Api {
  readonly source: 'mock' | 'supabase';
  auth: AuthApi;
  getProfile(): Promise<Profile | null>;
  createProfile(input: CreateProfileInput): Promise<Profile>;
  updateProfile(patch: Partial<CreateProfileInput>): Promise<Profile>;
  getCampaignState(): Promise<CampaignState>;
  getJourney(): Promise<Journey>;
  getLeaderboard(): Promise<Leaderboard>;
  submitCheckin(day: number, level: SugarLevel, fileName: string): Promise<CheckinResult>;
  useSugarPass(): Promise<void>;
  getQuizQuestions(): Promise<QuizQuestion[]>;
  submitQuiz(guesses: Record<number, number>): Promise<QuizResult>;
  submitMinigame(day: number): Promise<CheckinResult>;
  submitWallPost(text: string): Promise<void>;
  getWallPosts(): Promise<WallPost[]>;
  getSummary(): Promise<Summary>;
  admin: AdminApi;
}
