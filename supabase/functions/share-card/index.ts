// Edge Function: share-card
// Trang "mồi" cho Facebook/Messenger: desktop KHÔNG gửi được file ảnh lên FB —
// sharer.php chỉ đọc thẻ og:image của URL được chia sẻ. Hàm này trả HTML có og:image
// trỏ tới ảnh card công khai (bucket 'cards'), để FB hiện ĐÚNG ảnh card trên wall.
// Người thật mở link sẽ được redirect về app.
//
// Triển khai (PHẢI public để crawler FB fetch được — không verify JWT):
//   supabase functions deploy share-card --no-verify-jwt
//   (SUPABASE_URL được Supabase tự tiêm vào runtime)
//
// Dùng: https://<project>.functions.supabase.co/share-card?i=<uid>/<file>.png&t=<title>&d=<desc>&u=<appUrl>

const APP_FALLBACK = 'https://matdo.pages.dev';

// Chỉ nhận đường dẫn 'cards/<uid>/<file>.(png|jpg)' để không biến thành open-proxy og:image.
const PATH_RE = /^[0-9a-fA-F-]+\/[\w.-]+\.(png|jpg|jpeg)$/;

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

Deno.serve((req) => {
  const base = Deno.env.get('SUPABASE_URL') ?? '';
  const q = new URL(req.url).searchParams;
  const img = (q.get('i') ?? '').trim();
  const title = esc((q.get('t') ?? 'Level Down — Thử thách 21 ngày bớt ngọt').slice(0, 120));
  const desc = esc((q.get('d') ?? 'Mình vừa hoàn thành hành trình bớt ngọt cùng Gumi 🐱').slice(0, 200));
  // Chỉ cho redirect về đúng app (http/https), tránh open-redirect.
  const appRaw = (q.get('u') ?? '').trim();
  const app = /^https?:\/\//.test(appRaw) ? appRaw : APP_FALLBACK;

  const imageUrl = PATH_RE.test(img) && base
    ? `${base}/storage/v1/object/public/cards/${img}`
    : `${app}/og-image.png`; // dự phòng: ảnh og mặc định nếu path lạ

  const pageUrl = esc(req.url);
  const html = `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<meta property="og:type" content="website" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${desc}" />
<meta property="og:image" content="${esc(imageUrl)}" />
<meta property="og:image:width" content="1080" />
<meta property="og:image:height" content="1920" />
<meta property="og:url" content="${pageUrl}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${desc}" />
<meta name="twitter:image" content="${esc(imageUrl)}" />
<meta http-equiv="refresh" content="0; url=${esc(app)}" />
</head>
<body style="margin:0;font-family:system-ui,sans-serif;background:#B83556;color:#fff;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;padding:24px">
<div>
<img src="${esc(imageUrl)}" alt="" style="max-width:280px;width:100%;border-radius:16px" />
<p>Đang mở Level Down… <a href="${esc(app)}" style="color:#FFE08A">bấm vào đây nếu không tự chuyển</a>.</p>
</div>
<script>location.replace(${JSON.stringify(app)});</script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // Cho crawler/CDN cache nhẹ; ảnh public nên không nhạy cảm.
      'cache-control': 'public, max-age=300',
    },
  });
});
