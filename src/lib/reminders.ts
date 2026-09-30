const REMINDERS = [
  { minute: 0, text: '👻 Bạn có thấy bóng dáng ai đó vừa bỏ lỡ challenge hôm nay không? Chính là bạn đấyy!!!!, nhanh tay vào khôi phục lại chuỗi nào.' },
  { minute: 8 * 60, text: 'Thử thách hôm nay đang chờ bạn chinh phục đấy, Dành ít phút cho Gumi trước khi bắt đầu một ngày bận rộn nào.' },
  { minute: 15 * 60, text: 'Gumi nhớ bạn rồi đấy, vào thăm Gumi một xíu được hong' },
  { minute: 16 * 60, text: 'Đến giờ giải lao òi, đừng quên giảm đường cùng Gumi nhé bạn ơi 🐱' },
  { minute: 17 * 60, text: 'Hãy thực hiện thử thách hôm nay đi nhé, coi như là vì tớ đi☺️' },
  { minute: 20 * 60, text: 'Biết là bận rồi nhưng mà để ý Gumi một tí đi🥲' },
  { minute: 21 * 60, text: 'Cả ngày trôi qua rồi mà bạn vẫn chưa ghé thăm tôi? Đừng để tôi phải đến tận nhà gõ cửa nhé đấy nhé!' },
  { minute: 23 * 60 + 30, text: 'Đừng hòng đi ngủ yên ổn nếu chưa hoàn thành challenge hôm nay. Hoàn thành ngay trước khi quá muộn!' },
] as const;

export interface DueReminder { date: string; minute: number; text: string }

function vnParts(now: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)!.value;
  return { date: `${value('year')}-${value('month')}-${value('day')}`, minute: Number(value('hour')) * 60 + Number(value('minute')) };
}

export function vnDateKey(now: Date): string { return vnParts(now).date; }

export function dueReminder(now: Date, lastPlayDate: string | null, campaignDay: number, lastCompletedDate: string | null): DueReminder | null {
  const { date, minute } = vnParts(now);
  if (lastPlayDate === date || lastCompletedDate === date) return null;
  if (minute < 8 * 60) {
    if (campaignDay <= 1) return null;
    const yesterday = new Date(`${date}T00:00:00Z`);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    if (lastPlayDate === yesterday.toISOString().slice(0, 10) || lastCompletedDate === yesterday.toISOString().slice(0, 10)) return null;
    return { date, ...REMINDERS[0]! };
  }
  const reminder = [...REMINDERS].reverse().find((item) => item.minute <= minute)!;
  return { date, ...reminder };
}
