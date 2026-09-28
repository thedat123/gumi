#!/usr/bin/env bash
# =====================================================================
# CHẠY 1 PHÁT: áp dụng TẤT CẢ migration (schema + RPC + nội dung + tài khoản demo)
# lên một database Supabase/Postgres, theo đúng thứ tự, dừng ngay khi lỗi.
#
# Dùng (chọn 1 trong 3):
#   scripts/seed-all.sh "postgresql://postgres:PASSWORD@db.<ref>.supabase.co:5432/postgres"
#   DATABASE_URL="postgresql://..." scripts/seed-all.sh
#   # hoặc đặt SUPABASE_DB_URL=... trong .env.local rồi chạy:  scripts/seed-all.sh
#
# Connection string: Supabase → Settings → Database → Connection string → URI
# (cổng 5432 "Session mode"/"Direct connection", KHÔNG dùng pooler 6543 cho migration).
# =====================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIG_DIR="$ROOT/supabase/migrations"

# ---- Tìm connection string: tham số → biến môi trường → .env.local ----
DB_URL="${1:-${DATABASE_URL:-${SUPABASE_DB_URL:-}}}"
if [[ -z "$DB_URL" && -f "$ROOT/.env.local" ]]; then
  DB_URL="$(grep -E '^SUPABASE_DB_URL=' "$ROOT/.env.local" | head -1 | cut -d= -f2- || true)"
fi
if [[ -z "$DB_URL" ]]; then
  cat >&2 <<'EOF'
✗ Thiếu connection string.
  Cách 1: scripts/seed-all.sh "postgresql://postgres:PASSWORD@db.<ref>.supabase.co:5432/postgres"
  Cách 2: DATABASE_URL="postgresql://..." scripts/seed-all.sh
  Cách 3: thêm dòng  SUPABASE_DB_URL=postgresql://...  vào .env.local  rồi chạy lại.
EOF
  exit 1
fi

command -v psql >/dev/null 2>&1 || { echo "✗ Cần cài 'psql' (PostgreSQL client)." >&2; exit 1; }

echo "== Áp dụng migration lên database =="
for f in "$MIG_DIR"/*.sql; do
  echo "  → $(basename "$f")"
  psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f "$f"
done

cat <<'EOF'

✓ Xong! Đã seed toàn bộ (schema + RPC + nội dung mới + tài khoản demo).

Tài khoản demo (mật khẩu: test1234) — mở khoá MỌI màn, bỏ chặn "chỉ chơi hôm nay":
  • test1@gumi.vn … test5@gumi.vn   (tester)
  • admin@gumi.vn                     (admin + tester → vào /admin)

Đổi/huỷ mật khẩu sau ở Supabase → Authentication.
EOF
