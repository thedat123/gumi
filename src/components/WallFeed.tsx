import { api } from '../api';
import { AsyncView } from './AsyncView';
import { Banner } from './Banner';
import { Card } from './Card';
import { Icon } from './Icon';
import { vi } from '../content/vi';
import { useAsync } from '../app/useAsync';

function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'vừa xong';
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  if (s < 172800) return 'hôm qua';
  return `${Math.floor(s / 86400)} ngày trước`;
}

/** Feed bài đăng Tường cộng đồng — dùng trong Dashboard (read-only) và Admin (có nút xoá). */
export function WallFeed({ onDelete }: { onDelete?: (id: string) => void }) {
  const posts = useAsync(() => api.getWallPosts(), []);

  return (
    <AsyncView state={posts} empty={<Banner kind="info">{vi.wall.empty}</Banner>}>
      {(list) =>
        list.length === 0 ? (
          <Banner kind="info">{vi.wall.empty}</Banner>
        ) : (
          <ul className="flex flex-col gap-2">
            {list.map((p) => (
              <li key={p.id}>
                <Card className="flex items-start gap-3 bg-surface/95">
                  <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-body font-extrabold text-primary">
                    {p.name.charAt(0).toLocaleUpperCase('vi')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-small font-bold text-primary">{p.name}</span>
                      {'createdAt' in p && <span className="shrink-0 text-[11px] text-muted">{timeAgo((p as { createdAt: string }).createdAt)}</span>}
                    </div>
                    <p className="mt-0.5 break-words text-small leading-relaxed text-text [overflow-wrap:anywhere]">{p.text}</p>
                  </div>
                  {onDelete && (
                    <button type="button" onClick={() => onDelete(p.id)} aria-label="Xoá bài"
                      className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-danger/10 hover:text-danger">
                      <Icon name="trash" size={15} />
                    </button>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )
      }
    </AsyncView>
  );
}
