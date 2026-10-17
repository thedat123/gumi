#!/usr/bin/env bash
# Compatibility entry point: seeds run only once, tracked with other migrations.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec bash "$ROOT/scripts/db-push.sh" "$@"
