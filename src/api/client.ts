// Khởi tạo Supabase client từ biến môi trường. Thiếu biến = null (khi đó dùng mock adapter).
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && anon);

// Session sống LIÊN TỤC như Messenger: lưu vào localStorage + tự làm mới access token khi mở lại,
// nên qua ngày / qua lần đóng mở trình duyệt vẫn đăng nhập; chỉ mất khi người dùng bấm Đăng xuất.
export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url!, anon!, {
      auth: {
        persistSession: true,        // ghi session xuống localStorage
        autoRefreshToken: true,      // tự refresh token → không rớt phiên
        detectSessionInUrl: true,    // bắt session sau redirect OAuth (Google)
        storageKey: 'gumi-auth',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
    })
  : null;
