// Chuyển lỗi API (có mã) thành thông điệp tiếng Việt cho người dùng.
import { ApiError, type ApiErrorCode } from '../api/types';
import { vi } from '../content/vi';

const MSG: Record<ApiErrorCode, string> = {
  network: vi.checkin.errors.network,
  not_today: vi.checkin.errors.notToday,
  already_done: vi.checkin.errors.already,
  level_not_allowed: vi.checkin.errors.level,
  photo_invalid: vi.checkin.errors.tooLarge,
  email_exists: vi.signup.errors.emailExists,
  wrong_password: vi.auth.wrong,
  forbidden: vi.admin.forbidden,
  no_pass: vi.banners.missedNoPass,
  server: vi.errors.server,
};

export function errorCode(e: unknown): ApiErrorCode | null {
  return e instanceof ApiError ? e.code : null;
}

export function messageFor(e: unknown): string {
  if (e instanceof ApiError) return MSG[e.code];
  return vi.common.genericError;
}
