import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Gumi } from './Gumi';

const html = (state: 'bo_pho' | 'hap_hoi' | 'tien_hoa', extra: Record<string, unknown> = {}) => renderToStaticMarkup(<Gumi state={state} {...extra} />);

describe('Gumi', () => {
  it('ba trạng thái có lớp và data-state khác nhau', () => {
    expect(html('bo_pho')).toContain('gumi--bo-pho');
    expect(html('hap_hoi')).toContain('gumi--hap-hoi');
    expect(html('tien_hoa')).toContain('gumi--tien-hoa');
    expect(html('hap_hoi')).toContain('data-state="hap_hoi"');
  });
  it('mỗi trạng thái có nét mặt riêng: bơ phờ có mắt chớp, hấp hối có mắt X và giọt mồ hôi, tiến hoá có kính râm', () => {
    expect(html('bo_pho')).toContain('g-eyes-open');
    expect(html('bo_pho')).not.toContain('g-lens');
    expect(html('hap_hoi')).toContain('g-sweat');
    expect(html('hap_hoi')).not.toContain('g-eyes-open');
    expect(html('tien_hoa')).toContain('g-lens');
  });
  it('bơ phờ có bụng bự hơn dạng tiến hoá (fit)', () => {
    const rx = (h: string) => Number(/class="g-body" cx="100" cy="150" rx="(\d+)"/.exec(h)?.[1]);
    expect(rx(html('bo_pho'))).toBeGreaterThan(rx(html('tien_hoa')));
  });
  it('là trang trí: ẩn khỏi trình đọc màn hình và không tải ảnh ngoài', () => {
    const h = html('bo_pho');
    expect(h).toContain('aria-hidden="true"');
    expect(h).not.toMatch(/<img|https?:\/\//);
  });
  it('sự kiện chạy một lần được gắn thành lớp is-*', () => {
    expect(html('bo_pho', { event: 'cheer', eventKey: 1 })).toContain('is-cheer');
    expect(html('hap_hoi', { event: 'revive', eventKey: 1 })).toContain('is-revive');
    expect(html('tien_hoa', { event: 'evolve', eventKey: 1 })).toContain('is-evolve');
    expect(html('bo_pho')).not.toMatch(/is-(cheer|revive|evolve)/);
  });
  it('tiến hoá bắt đầu bằng dạng cũ (bơ phờ) rồi mới đổi sang dạng mới', () => {
    const h = html('tien_hoa', { event: 'evolve', eventKey: 1 });
    expect(h).toContain('data-state="bo_pho"');
  });
  it('kích thước được truyền qua biến CSS', () => {
    expect(html('bo_pho', { size: 120 })).toContain('--gumi-size:120px');
  });
});
