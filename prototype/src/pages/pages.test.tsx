// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { vi as vn } from '../content/vi';
import { ScenarioProvider } from '../mock/ScenarioContext';
import { ChapterFlow } from './ChapterFlow';
import { CheckIn } from './CheckIn';
import { Journey } from './Journey';
import { Leaderboard } from './Leaderboard';
import { Login } from './Login';
import { Onboarding } from './Onboarding';

function at(url: string, routePath = '/', el = <Journey />) {
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

describe('Bản đồ hành trình theo kịch bản', () => {
  it('hôm nay chưa làm: tiến độ 3/21, Gumi bơ phờ, có chặng hôm nay dẫn vào chương', () => {
    at('/?s=today_open');
    expect(screen.getByTestId('journey-progress').textContent).toBe('3 / 21 NGÀY');
    expect(screen.getByTestId('gumi-caption').textContent).toBe(vn.gumi.caption.bo_pho);
    const today = screen.getByLabelText(/^Ngày 4:/);
    expect(today.getAttribute('href')).toBe('/chapter/4');
  });
  it('bản đồ có đủ 21 chặng, mỗi chặng có nhãn chữ (không chỉ màu)', () => {
    at('/?s=dying');
    const nodes = screen.getAllByLabelText(/^Ngày \d+:/);
    expect(nodes).toHaveLength(21);
    expect(screen.getByLabelText(/^Ngày 4:/).getAttribute('aria-label')).toContain(vn.day.dying);
  });
  it('trước ngày bắt đầu: thấy thông báo và các chặng đều khoá', () => {
    at('/?s=before_start');
    expect(screen.getByText(/Hành trình bắt đầu ngày/)).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
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
  it('lỡ và hết Bùa: không có nút Bùa Hồi Sinh', () => {
    at('/?s=missed_no_pass');
    expect(screen.queryByText(vn.pass.button)).toBeNull();
    expect(screen.getByText(vn.banners.missedNoPass)).toBeTruthy();
  });
  it('bị quật ngã → dùng Bùa Hồi Sinh → Gumi bật dậy (thành bơ phờ, chạy hoạt ảnh hồi sinh)', () => {
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
  it('hộp Bùa đóng bằng phím Esc và nút "Để sau"', () => {
    at('/?s=dying');
    fireEvent.click(screen.getByText(vn.pass.button));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByText(vn.pass.button));
    fireEvent.click(screen.getByText(vn.pass.cancel));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('Chương truyện (3 nhịp)', () => {
  it('Chương 3: mở truyện → nhiệm vụ → kết chương có phản ứng, điểm và hé lộ mai', () => {
    const { container } = at('/chapter/3', '/chapter/:day', <ChapterFlow />);
    expect(screen.getByText(/CHƯƠNG 3 \/ 21/)).toBeTruthy();
    expect(screen.getByText(/thêm chút trân châu/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: vn.story.ui.startMission }));
    expect(screen.getByText(/Nói Không Với Topping Ngọt/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: vn.story.ui.doneMock }));
    expect(screen.getByText(/tiu nghỉu/)).toBeTruthy();
    expect(screen.getByText(/kẻ đội lốt/)).toBeTruthy();
    expect(container.querySelector('.gumi.is-cheer')).not.toBeNull();
  });
  it('Chương 21 (cuối): hoàn thành thì Gumi tiến hoá (hoạt ảnh evolve)', () => {
    const { container } = at('/chapter/21', '/chapter/:day', <ChapterFlow />);
    fireEvent.click(screen.getByRole('button', { name: vn.story.ui.startMission }));
    fireEvent.click(screen.getByRole('button', { name: vn.story.ui.doneMock }));
    expect(container.querySelector('.gumi.is-evolve')).not.toBeNull();
  });
  it('chương không tồn tại: báo lỗi và có lối về bản đồ', () => {
    at('/chapter/99', '/chapter/:day', <ChapterFlow />);
    expect(screen.getByText('Không có chương này.')).toBeTruthy();
    expect(screen.getByText(vn.story.ui.backToMap)).toBeTruthy();
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
  it('chỉ ngày DRINK có bộ chọn mức đường', () => {
    at('/mission/2', '/mission/:day', <CheckIn />);
    expect(screen.queryByText(vn.checkin.level)).toBeNull();
    cleanup();
    at('/mission/1', '/mission/:day', <CheckIn />);
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
