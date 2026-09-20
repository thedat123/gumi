// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { vi as vn } from '../content/vi';
import { ScenarioProvider } from '../mock/ScenarioContext';
import { CheckIn } from './CheckIn';
import { Dashboard } from './Dashboard';
import { Leaderboard } from './Leaderboard';
import { Login } from './Login';
import { Onboarding } from './Onboarding';

function at(url: string, routePath = '/', el = <Dashboard />) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <ScenarioProvider>
        <Routes><Route path={routePath} element={el} /><Route path="*" element={<p>đã điều hướng</p>} /></Routes>
      </ScenarioProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('Dashboard theo kịch bản', () => {
  it('hôm nay chưa làm: tiêu đề 3/10, Gumi bơ phờ, có thẻ nhiệm vụ Day 4', () => {
    at('/?s=today_open');
    expect(screen.getByTestId('journey-title').textContent).toBe('MY SUGAR JOURNEY: 3 / 10 DAYS');
    expect(screen.getByTestId('gumi-caption').textContent).toBe(vn.gumi.caption.bo_pho);
    expect(screen.getByText(/Ngày 4: Vạch Mặt Đường Ẩn/)).toBeTruthy();
  });
  it('trước ngày bắt đầu: thấy thông báo và không có thẻ nhiệm vụ', () => {
    at('/?s=before_start');
    expect(screen.getByText(/Chiến dịch bắt đầu ngày/)).toBeTruthy();
    expect(screen.queryByText(/Bắt đầu$/)).toBeNull();
  });
  it('đã tốt nghiệp: Gumi tiến hoá và thông báo chúc mừng', () => {
    at('/?s=finished');
    expect(screen.getByTestId('gumi-caption').textContent).toBe(vn.gumi.caption.tien_hoa);
    expect(screen.getByText(vn.banners.finished)).toBeTruthy();
  });
  it('ảnh bị gỡ: hiện lý do', () => {
    at('/?s=rejected_day');
    expect(screen.getByRole('alert').textContent).toContain('ảnh không phải ly nước');
  });
  it('lỡ và hết Pass: không có nút Sugar Pass', () => {
    at('/?s=missed_no_pass');
    expect(screen.queryByText(vn.pass.button)).toBeNull();
    expect(screen.getByText(vn.banners.missedNoPass)).toBeTruthy();
  });
  it('hấp hối → dùng Sugar Pass → Gumi hồi sinh (thành bơ phờ, chạy hoạt ảnh hồi sinh)', () => {
    const { container } = at('/?s=dying');
    expect(screen.getByTestId('gumi-caption').textContent).toBe(vn.gumi.caption.hap_hoi);
    expect(screen.getByRole('alert').textContent).toContain('9 giờ');
    fireEvent.click(screen.getByText(vn.pass.button));
    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toContain('Còn 9 giờ');
    fireEvent.click(within(dialog).getByText(vn.pass.confirm));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText(vn.pass.success)).toBeTruthy();
    expect(screen.getByTestId('gumi-caption').textContent).toBe(vn.gumi.caption.bo_pho);
    act(() => { vi.advanceTimersByTime(400); });
    expect(container.querySelector('.gumi.is-revive')).not.toBeNull();
  });
  it('hộp Sugar Pass đóng bằng phím Esc và nút "Để sau"', () => {
    at('/?s=dying');
    fireEvent.click(screen.getByText(vn.pass.button));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByText(vn.pass.button));
    fireEvent.click(screen.getByText(vn.pass.cancel));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('dải 10 ngày: mỗi ngày có nhãn chữ (không chỉ màu)', () => {
    at('/?s=dying');
    const items = screen.getAllByRole('listitem').filter((li) => li.getAttribute('aria-label')?.startsWith('Ngày'));
    expect(items).toHaveLength(10);
    expect(items[3]!.getAttribute('aria-label')).toBe(`Ngày 4: ${vn.day.dying}`);
  });
});

describe('Onboarding', () => {
  it('chọn Hệ ngọt ngào + 7 ly → ước tính ≈ 280 g (≈ 70 thìa); đổi số ly cập nhật ngay', () => {
    at('/onboarding', '/onboarding', <Onboarding />);
    expect(screen.queryByTestId('estimate')).toBeNull();
    fireEvent.click(screen.getByText('Hệ ngọt ngào'));
    expect(screen.getByTestId('estimate').textContent).toBe('≈ 280 g đường mỗi tuần (≈ 70 thìa)');
    fireEvent.click(screen.getByLabelText('Giảm 1 ly'));
    expect(screen.getByTestId('estimate').textContent).toBe('≈ 240 g đường mỗi tuần (≈ 60 thìa)');
  });
  it('gửi thiếu tên/mức đường thì báo lỗi bằng chữ, đủ thì điều hướng sau khi khoá nút', () => {
    at('/onboarding', '/onboarding', <Onboarding />);
    fireEvent.click(screen.getByRole('button', { name: vn.onboarding.submit }));
    expect(screen.getByText(/Hãy chọn một mức đường/)).toBeTruthy();
    expect(screen.getByText(/Tên cần từ 2 đến 30 ký tự/)).toBeTruthy();
    fireEvent.click(screen.getByText('Hệ trung dung'));
    fireEvent.change(screen.getByLabelText(vn.onboarding.nameTitle), { target: { value: 'Mai Anh' } });
    fireEvent.click(screen.getByRole('button', { name: vn.onboarding.submit }));
    expect((screen.getByRole('button', { name: vn.onboarding.submit }) as HTMLButtonElement).disabled).toBe(true);
    act(() => { vi.advanceTimersByTime(800); });
    expect(screen.getByText('đã điều hướng')).toBeTruthy();
  });
});

describe('Đăng nhập', () => {
  it('email sai định dạng → lỗi; sai mật khẩu → cảnh báo; đúng → điều hướng', () => {
    at('/login', '/login', <Login />);
    fireEvent.change(screen.getByLabelText(vn.auth.email), { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: vn.auth.submit }));
    expect(screen.getByText(new RegExp(vn.auth.emailInvalid))).toBeTruthy();
    fireEvent.change(screen.getByLabelText(vn.auth.email), { target: { value: 'a@b.vn' } });
    fireEvent.change(screen.getByLabelText(vn.auth.password), { target: { value: 'sai' } });
    fireEvent.click(screen.getByRole('button', { name: vn.auth.submit }));
    act(() => { vi.advanceTimersByTime(700); });
    expect(screen.getByRole('alert').textContent).toContain(vn.auth.wrong);
    fireEvent.change(screen.getByLabelText(vn.auth.password), { target: { value: 'gumi1234' } });
    fireEvent.click(screen.getByRole('button', { name: vn.auth.submit }));
    act(() => { vi.advanceTimersByTime(700); });
    expect(screen.getByText('đã điều hướng')).toBeTruthy();
  });
  it('luôn có hướng dẫn quên mật khẩu (không gửi email) và đoạn đồng ý xử lý ảnh', () => {
    at('/login', '/login', <Login />);
    expect(screen.getByText(vn.auth.forgot)).toBeTruthy();
    expect(screen.getByText(vn.auth.consent)).toBeTruthy();
  });
});

describe('Bảng xếp hạng', () => {
  it('ngoài Top 10: câu "cần thêm X điểm để vượt qua [tên]"', () => {
    at('/leaderboard?s=today_open', '/leaderboard', <Leaderboard />);
    expect(screen.getByText(/Hạng hiện tại của bạn: #24 \(50 pts\)/)).toBeTruthy();
    expect(screen.getByText(/Bạn chỉ cần thêm 129 điểm nữa để vượt qua Gia Bảo và lọt vào Top 10!/)).toBeTruthy();
  });
  it('trong Top 10: lời chúc thay cho câu cần thêm điểm', () => {
    at('/leaderboard?s=finished', '/leaderboard', <Leaderboard />);
    expect(screen.getByText(vn.leaderboard.inTop)).toBeTruthy();
    expect(screen.queryByText(/cần thêm/)).toBeNull();
  });
  it('trạng thái rỗng, đang tải, lỗi có giao diện riêng', () => {
    at('/leaderboard?lmode=empty', '/leaderboard', <Leaderboard />);
    expect(screen.getByText(vn.leaderboard.empty)).toBeTruthy();
    cleanup();
    at('/leaderboard?lmode=loading', '/leaderboard', <Leaderboard />);
    expect(screen.getByText(vn.leaderboard.loading)).toBeTruthy();
    cleanup();
    at('/leaderboard?lmode=error', '/leaderboard', <Leaderboard />);
    expect(screen.getByRole('alert').textContent).toContain(vn.leaderboard.error);
  });
});

describe('Check-in', () => {
  it('chỉ Day 1, 3, 6, 9 có bộ chọn mức đường', () => {
    at('/mission/5', '/mission/:day', <CheckIn />);
    expect(screen.queryByText(vn.checkin.level)).toBeNull();
    cleanup();
    at('/mission/6', '/mission/:day', <CheckIn />);
    expect(screen.getByText(vn.checkin.level)).toBeTruthy();
  });
  it('nút gửi bị khoá khi chưa chọn ảnh', () => {
    at('/mission/3', '/mission/:day', <CheckIn />);
    expect((screen.getByText(vn.checkin.submit).closest('button') as HTMLButtonElement).disabled).toBe(true);
  });
  it('mất mạng: có lỗi bằng chữ và nút thử lại', () => {
    at('/mission/3?cmode=error_network', '/mission/:day', <CheckIn />);
    expect(screen.getByRole('alert').textContent).toContain(vn.checkin.errors.network);
    expect(screen.getByText(vn.checkin.retry)).toBeTruthy();
  });
  it('đang tải: nút khoá và có aria-busy (chống bấm đúp)', () => {
    at('/mission/3?cmode=uploading', '/mission/:day', <CheckIn />);
    const btn = screen.getByText(vn.checkin.uploading).closest('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute('aria-busy')).toBe('true');
  });
  it('thành công: hiện điểm nhận được và Gumi nhảy mừng', () => {
    const { container } = at('/mission/3?cmode=success', '/mission/:day', <CheckIn />);
    expect(screen.getByText(vn.checkin.success(10))).toBeTruthy();
    expect(container.querySelector('.gumi.is-cheer')).not.toBeNull();
  });
});
