import { useState } from 'react';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { DayStrip } from '../components/DayStrip';
import { Gumi } from '../components/Gumi';
import { Input } from '../components/Input';
import { MissionCard } from '../components/MissionCard';
import { vi } from '../content/vi';
import { useScenario, type GumiEvent } from '../mock/ScenarioContext';
import type { DayState, GumiState } from '../mock/scenarios';
import tokens from '../../tokens.json';

const STATES: GumiState[] = ['bo_pho', 'hap_hoi', 'tien_hoa'];
const ALL_DAYS: DayState[] = ['checked', 'passed', 'open', 'dying', 'missed', 'rejected', 'future', 'checked', 'open', 'future'];

/** Trang duyệt bằng mắt: mọi thành phần ở mọi trạng thái. Playwright chụp trang này để làm ảnh ghép. */
export function Styleguide() {
  const { event, fireEvent } = useScenario();
  const [demo, setDemo] = useState<GumiState>('bo_pho');
  const events: GumiEvent[] = ['cheer', 'revive', 'evolve'];
  return (
    <div className="flex flex-col gap-6 pt-2">
      <h1 className="text-headline font-bold">Styleguide</h1>

      <section className="flex flex-col gap-2"><h2 className="text-title font-bold">Màu</h2>
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(tokens.colors).map(([k, v]) => (
            <div key={k} className="text-caption"><div className="h-11 rounded-control border border-border" style={{ background: v }} /><div className="mt-1 font-semibold">{k}</div><div className="text-muted">{v}</div></div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-1"><h2 className="text-title font-bold">Chữ</h2>
        <p className="text-headline font-bold">Headline 28</p><p className="text-title font-bold">Title 20</p><p className="text-body">Body 16: Hôm nay bạn uống ly nước mấy phần trăm đường?</p><p className="text-small text-muted">Small 14 (chữ phụ)</p><p className="text-caption text-muted">Caption 13</p>
      </section>

      <section className="flex flex-col gap-3" data-testid="gumi-section"><h2 className="text-title font-bold">Gumi: ba trạng thái</h2>
        <div className="grid grid-cols-3 gap-2 text-center">
          {STATES.map((s) => (<div key={s}><Gumi state={s} size={100} /><p className="text-caption">{vi.gumi.caption[s]}</p></div>))}
        </div>
        <div className="flex flex-col items-center gap-2">
          <Gumi state={demo} size={160} interactive event={event?.name ?? null} eventKey={event?.key ?? 0} />
          <div className="flex gap-2">{STATES.map((s) => <Button key={s} variant={demo === s ? 'primary' : 'secondary'} onClick={() => setDemo(s)}>{s}</Button>)}</div>
          <div className="flex gap-2">{events.map((e) => <Button key={e} variant="secondary" onClick={() => fireEvent(e)}>▶ {e}</Button>)}</div>
        </div>
      </section>

      <section className="flex flex-col gap-2"><h2 className="text-title font-bold">Nút</h2>
        <div className="flex flex-wrap gap-2"><Button>Chính</Button><Button variant="secondary">Phụ</Button><Button variant="danger">Nguy hiểm</Button><Button variant="ghost">Liên kết</Button><Button loading>Đang tải</Button><Button disabled>Khoá</Button></div>
      </section>

      <section className="flex flex-col gap-2"><h2 className="text-title font-bold">Ô nhập</h2>
        <Input label="Bình thường" hint="Gợi ý ngắn" defaultValue="Mai Anh" /><Input label="Có lỗi" error="Tên cần từ 2 đến 30 ký tự." defaultValue="A" />
      </section>

      <section className="flex flex-col gap-2"><h2 className="text-title font-bold">Thông báo</h2>
        <Banner kind="success">Xong! Bạn nhận +15 điểm.</Banner><Banner kind="error">Mất kết nối. Ảnh vẫn được giữ.</Banner><Banner kind="info">Chiến dịch bắt đầu ngày 01/10.</Banner>
      </section>

      <section className="flex flex-col gap-2"><h2 className="text-title font-bold">Dải 10 ngày (7 trạng thái)</h2><Card><DayStrip days={ALL_DAYS} today={3} /></Card></section>
      <section className="flex flex-col gap-2"><h2 className="text-title font-bold">Thẻ nhiệm vụ</h2><MissionCard day={5} /><MissionCard day={2} done /></section>
    </div>
  );
}
