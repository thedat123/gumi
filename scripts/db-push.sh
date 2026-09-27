#!/usr/bin/env bash
# Push toàn bộ migration vào một database Postgres/Supabase theo thứ tự, dừng ngay khi lỗi.
#
# Dùng:
#   scripts/db-push.sh "postgresql://postgres:PASSWORD@db.<ref>.supabase.co:5432/postgres"
# hoặc đặt biến môi trường:
#   DATABASE_URL="postgresql://..." scripts/db-push.sh
#
# Lấy connection string ở Supabase: Settings → Database → Connection string → URI
# (dùng cổng 5432 "Session mode"/"Direct connection", KHÔNG dùng pooler 6543 cho migration).
set -euo pipefail

DB_URL="${1:-${DATABASE_URL:-}}"
if [[ -z "$DB_URL" ]]; then
  echo "Lỗi: thiếu connection string. Xem hướng dẫn ở đầu file." >&2
  exit 1
fi

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../supabase/migrations" && pwd)"

for f in "$DIR"/*.sql; do
  echo "== Áp dụng $(basename "$f") =="
  psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f "$f"
done

echo "✓ Đã push xong tất cả migration."
