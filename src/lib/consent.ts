/** Đã tick đồng ý dữ liệu lúc đăng ký → Onboarding không hỏi lại (đăng ký Google từ màn Đăng nhập thì hỏi ở Onboarding). */
export const DATA_CONSENT_KEY = 'ld_data_consent';
export const rememberDataConsent = () => { try { localStorage.setItem(DATA_CONSENT_KEY, '1'); } catch { /* private mode */ } };
