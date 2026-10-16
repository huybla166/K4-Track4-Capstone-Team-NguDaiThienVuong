#!/usr/bin/env bash
# Chạy backend DriverGuard (kèm AI worker) trên macOS/Linux. Dùng: ./scripts/run_backend.sh [--simulate] [port]
# Bản tương đương của run_backend.ps1. Lần đầu dùng camera, macOS sẽ hỏi quyền Camera cho ứng dụng Terminal.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
simulate=0
port=8000
for arg in "$@"; do
  case "$arg" in
    --simulate) simulate=1 ;;
    *) port="$arg" ;;
  esac
done

export PYTHONPATH="$root"
export DRIVERGUARD_SIMULATE="$simulate"
export DRIVERGUARD_DB="${DRIVERGUARD_DB:-$root/data/driverguard.db}"
# Ảnh camera kiểu soi gương; đặt DRIVERGUARD_MIRROR=0 để tắt
export DRIVERGUARD_MIRROR="${DRIVERGUARD_MIRROR:-1}"

cd "$root/apps/backend"
exec "$root/.venv/bin/python" -m uvicorn app.main:app --host 127.0.0.1 --port "$port"
