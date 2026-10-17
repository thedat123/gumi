#!/usr/bin/env bash
# Apply pending migrations only. See: python3 scripts/migrate.py --help
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec python3 "$ROOT/scripts/migrate.py" "$@"
