// Chọn adapter một lần lúc nạp app: dùng Supabase nếu đã cấu hình và không ép 'mock'; ngược lại dùng dữ liệu giả.
import { supabaseConfigured } from './client';
import { createMockApi } from './mock';
import { createSupabaseApi } from './real';
import type { Api } from './types';

const forced = import.meta.env.VITE_DATA_SOURCE as string | undefined;
const useSupabase = forced !== 'mock' && supabaseConfigured;

export const api: Api = useSupabase ? createSupabaseApi() : createMockApi();

export * from './types';
