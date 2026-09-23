// Adapter SUPABASE thật. Chỉ dùng khi đã cấu hình VITE_SUPABASE_URL/ANON_KEY.
// HỢP ĐỒNG: mỗi RPC/bảng dưới đây phải trả JSON khớp kiểu trong ./types.ts. Nguồn sự thật điểm số nằm ở SQL.
// Các RPC (security definer, set search_path=public, kiểm auth.uid()) sẽ do task backend T-002..T-019 dựng.
import { supabase } from './client';
import type { SugarLevel } from '../lib/sugar';
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
  type Profile,
  type QuizQuestion,
  type QuizResult,
  type Session,
  type Summary,
  type WallPost,
} from './types';

function db() {
  if (!supabase) throw new ApiError('server', 'Supabase chưa được cấu hình');
  return supabase;
}

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await db().rpc(fn, args ?? {});
  if (error) throw mapError(error.message);
  return data as T;
}

function mapError(msg: string): ApiError {
  const m = msg.toLowerCase();
  if (m.includes('not_today')) return new ApiError('not_today');
  if (m.includes('already')) return new ApiError('already_done');
  if (m.includes('level')) return new ApiError('level_not_allowed');
  if (m.includes('no_pass')) return new ApiError('no_pass');
  if (m.includes('forbidden') || m.includes('permission')) return new ApiError('forbidden');
  return new ApiError('server', msg);
}

const auth: AuthApi = {
  async getSession() {
    const { data } = await db().auth.getSession();
    const u = data.session?.user;
    return u ? { userId: u.id, email: u.email ?? '' } : null;
  },
  onChange(cb) {
    const { data } = db().auth.onAuthStateChange((_e, session) => {
      const u = session?.user;
      cb(u ? { userId: u.id, email: u.email ?? '' } : null);
    });
    return () => data.subscription.unsubscribe();
  },
  async signUp(email, password): Promise<Session> {
    const { data, error } = await db().auth.signUp({ email, password });
    if (error) throw error.message.toLowerCase().includes('registered') ? new ApiError('email_exists') : new ApiError('server', error.message);
    const u = data.user;
    if (!u) throw new ApiError('server');
    return { userId: u.id, email: u.email ?? email };
  },
  async signIn(email, password): Promise<Session> {
    const { data, error } = await db().auth.signInWithPassword({ email, password });
    if (error) throw new ApiError('wrong_password');
    return { userId: data.user.id, email: data.user.email ?? email };
  },
  async signInWithGoogle(): Promise<Session | null> {
    const { error } = await db().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
    if (error) throw new ApiError('server', error.message);
    return null; // trình duyệt chuyển hướng sang Google, phiên sẽ được onChange bắt sau khi quay lại
  },
  async signOut() {
    await db().auth.signOut();
  },
};

const admin: AdminApi = {
  listCheckins: (day) => rpc<AdminCheckin[]>('admin_list_checkins', { p_day: day }),
  listFlags: () => rpc<AdminCheckin[]>('admin_list_flags'),
  async setCheckinStatus(id, status: CheckinStatus, reason) {
    await rpc('admin_set_checkin_status', { p_id: id, p_status: status, p_reason: reason ?? null });
  },
};

export function createSupabaseApi(): Api {
  return {
    source: 'supabase',
    auth,
    admin,
    getProfile: () => rpc<Profile | null>('get_profile'),
    createProfile: (input: CreateProfileInput) =>
      rpc<Profile>('create_profile', { p_name: input.name, p_avatar: input.avatar, p_level: input.level, p_drinks: input.drinksPerWeek }),
    updateProfile: (patch) => rpc<Profile>('update_profile', { p_patch: patch }),
    getCampaignState: () => rpc<CampaignState>('get_campaign_state'),
    getJourney: () => rpc<Journey>('get_my_journey'),
    getLeaderboard: () => rpc<Leaderboard>('get_leaderboard'),
    async submitCheckin(day, level: SugarLevel, fileName): Promise<CheckinResult> {
      // Ảnh đã nén ở client trước khi gọi (browser-image-compression) — ở đây chỉ minh hoạ đường dẫn.
      const s = (await auth.getSession());
      if (!s) throw new ApiError('forbidden');
      const path = `${s.userId}/${day}.jpg`;
      const { error: upErr } = await db().storage.from('checkins').upload(path, new Blob([fileName]), { upsert: true });
      if (upErr) throw new ApiError('network', upErr.message);
      return rpc<CheckinResult>('submit_checkin', { p_day: day, p_level: level, p_path: path });
    },
    async useSugarPass() {
      await rpc('use_sugar_pass');
    },
    getQuizQuestions: () => rpc<QuizQuestion[]>('get_quiz_questions'),
    submitQuiz: (guesses) => rpc<QuizResult>('submit_quiz', { p_guesses: guesses }),
    submitMinigame: (day) => rpc<CheckinResult>('submit_minigame', { p_day: day }),
    async submitWallPost(text) {
      await rpc('submit_wall_post', { p_text: text });
    },
    getWallPosts: () => rpc<WallPost[]>('get_wall_posts'),
    getSummary: () => rpc<Summary>('get_my_summary'),
  };
}
