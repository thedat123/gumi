// Adapter SUPABASE thật. Chỉ dùng khi đã cấu hình VITE_SUPABASE_URL/ANON_KEY.
// HỢP ĐỒNG: mỗi RPC/bảng dưới đây phải trả JSON khớp kiểu trong ./types.ts. Nguồn sự thật điểm số nằm ở SQL.
// Các RPC (security definer, set search_path=public, kiểm auth.uid()) sẽ do task backend T-002..T-019 dựng.
import { supabase } from './client';
import { vnDateKey } from '../lib/reminders';
import type { SugarLevel } from '../lib/sugar';
import {
  ApiError,
  type AdminApi,
  type AdminCheckin,
  type AdminStats,
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
    // Có dấu "/" cuối để khớp mẫu allowlist ".../**" của Supabase (origin trần đôi khi không khớp).
    const { error } = await db().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/` } });
    if (error) throw new ApiError('server', error.message);
    return null; // trình duyệt chuyển hướng sang Google, phiên sẽ được onChange bắt sau khi quay lại
  },
  async signOut() {
    await db().auth.signOut();
  },
  async resetPassword(email) {
    // Gửi email chứa link khôi phục; link mở /reset-password (Supabase gắn token khôi phục vào URL).
    const { error } = await db().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) throw new ApiError('server', error.message);
  },
  async updatePassword(newPassword) {
    // Sau khi vào từ link khôi phục, Supabase đã có phiên tạm → đổi mật khẩu ngay.
    const { error } = await db().auth.updateUser({ password: newPassword });
    if (error) throw new ApiError('server', error.message);
  },
  async changePassword(currentPassword, newPassword) {
    const { data } = await db().auth.getUser();
    const email = data.user?.email;
    if (!email) throw new ApiError('forbidden');
    // Xác thực lại mật khẩu hiện tại trước khi cho đổi (updateUser không tự kiểm mật khẩu cũ).
    const { error: reauth } = await db().auth.signInWithPassword({ email, password: currentPassword });
    if (reauth) throw new ApiError('wrong_password');
    const { error } = await db().auth.updateUser({ password: newPassword });
    if (error) throw new ApiError('server', error.message);
  },
};

const admin: AdminApi = {
  getStats: () => rpc<AdminStats>('admin_stats'),
  listCheckins: (day) => rpc<AdminCheckin[]>('admin_list_checkins', { p_day: day }),
  listFlags: () => rpc<AdminCheckin[]>('admin_list_flags'),
  async setCheckinStatus(id, status: CheckinStatus, reason) {
    await rpc('admin_set_checkin_status', { p_id: id, p_status: status, p_reason: reason ?? null });
  },
  async photoUrl(path) {
    if (!path || !path.includes('/')) return null;         // không phải đường dẫn ảnh (mock dùng emoji)
    const { data } = await db().storage.from('checkins').createSignedUrl(path, 3600);
    return data?.signedUrl ?? null;
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
    async getReminderStatus() {
      const session = await auth.getSession();
      if (!session) throw new ApiError('forbidden');
      const [campaign, played, completed] = await Promise.all([
        rpc<CampaignState>('get_campaign_state'),
        db().from('profiles').select('last_play_date').eq('id', session.userId).single(),
        db().from('day_progress').select('created_at').eq('user_id', session.userId)
          .eq('status', 'checked').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (played.error) throw mapError(played.error.message);
      if (completed.error) throw mapError(completed.error.message);
      return {
        phase: campaign.phase,
        day: campaign.day,
        lastPlayDate: played.data.last_play_date as string | null,
        lastCompletedDate: completed.data?.created_at ? vnDateKey(new Date(completed.data.created_at)) : null,
      };
    },
    savePushSubscription: (sub) =>
      rpc<void>('save_push_subscription', {
        p_endpoint: sub.endpoint, p_p256dh: sub.p256dh, p_auth: sub.auth,
        p_ua: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      }),
    deletePushSubscription: (endpoint) => rpc<void>('delete_push_subscription', { p_endpoint: endpoint }),
    getJourney: () => rpc<Journey>('get_my_journey'),
    markPlayed: () => rpc<number>('mark_played'),
    getLeaderboard: () => rpc<Leaderboard>('get_leaderboard'),
    async submitCheckin(day, level: SugarLevel, file, needsReview = false, sugarPercent = null): Promise<CheckinResult> {
      const s = (await auth.getSession());
      if (!s) throw new ApiError('forbidden');
      const path = `${s.userId}/${day}.jpg`;
      const photo = typeof file === 'string' ? new Blob([file], { type: 'image/jpeg' }) : file;
      const { error: upErr } = await db().storage.from('checkins').upload(path, photo, { upsert: true, contentType: photo.type || 'image/jpeg' });
      if (upErr) throw new ApiError('network', upErr.message);
      return rpc<CheckinResult>('submit_checkin', { p_day: day, p_level: level, p_path: path, p_needs_review: needsReview, p_sugar_percent: sugarPercent });
    },
    useStreakFreeze: () => rpc<number>('use_streak_freeze'),
    getQuizQuestions: () => rpc<QuizQuestion[]>('get_quiz_questions'),
    submitQuiz: (guesses) => rpc<QuizResult>('submit_quiz', { p_guesses: guesses }),
    submitMinigame: (day, earnedPoints) => earnedPoints === undefined
      ? rpc<CheckinResult>('submit_minigame', { p_day: day })
      : rpc<CheckinResult>('submit_minigame_score', { p_day: day, p_points: earnedPoints }),
    async submitWallPost(text, storyProof) {
      const session = await auth.getSession();
      if (!session) throw new ApiError('forbidden');
      const storyPath = storyProof ? `${session.userId}/21-story.jpg` : null;
      if (storyProof && storyPath) {
        const { error } = await db().storage.from('checkins').upload(storyPath, storyProof, { upsert: true, contentType: storyProof.type || 'image/jpeg' });
        if (error) throw mapError(error.message);
      }
      await rpc('submit_graduation', { p_text: text, p_story_path: storyPath });
    },
    getWallPosts: () => rpc<WallPost[]>('get_wall_posts'),
    getSummary: () => rpc<Summary>('get_my_summary'),
  };
}
