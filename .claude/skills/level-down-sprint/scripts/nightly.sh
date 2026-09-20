#!/usr/bin/env bash
# Chạy autopilot MỘT lượt: doctor -> run --max-tasks N -> báo cáo sprint.
# Dùng cho cron/tmux. Biến môi trường: REPO (mặc định thư mục hiện tại), MAX_TASKS (mặc định 4).
# Mã thoát: 0 bình thường | 1 doctor thất bại | 2 chạm trần ngân sách | 3 đang có lượt khác.
set -uo pipefail

REPO="${REPO:-$(pwd)}"
MAX_TASKS="${MAX_TASKS:-4}"
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$REPO" || { echo "Không vào được $REPO"; exit 1; }
mkdir -p logs
LOCK="logs/.nightly.lock"
if ! mkdir "$LOCK" 2>/dev/null; then
  echo "Đang có lượt chạy khác ($LOCK). Nếu chắc chắn không có, hãy xoá thư mục này rồi chạy lại."
  exit 3
fi
trap 'rmdir "$LOCK" 2>/dev/null' EXIT

LOG="logs/nightly-$(date +%Y%m%d-%H%M%S).log"
{
  echo "== doctor"
  node agents/run.mjs doctor || { echo "doctor thất bại, không chạy agent"; exit 1; }
  echo "== run (tối đa $MAX_TASKS task)"
  node agents/run.mjs run --max-tasks "$MAX_TASKS"
  rc=$?
  echo "== báo cáo sprint"
  node "$SKILL_DIR/scripts/sprint_report.mjs" || true
  exit $rc
} 2>&1 | tee "$LOG"
exit "${PIPESTATUS[0]}"
