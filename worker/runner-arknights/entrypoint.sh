#!/usr/bin/env bash
# Entrypoint — boots Android, gives ADB time to come up, then hands off to runner.py.
set -euo pipefail

if [[ -z "${TASK_ID:-}" || -z "${CALLBACK_TOKEN:-}" || -z "${CALLBACK_URL:-}" ]]; then
  echo "FATAL: TASK_ID, CALLBACK_TOKEN, CALLBACK_URL env vars required" >&2
  exit 1
fi

echo "[entrypoint] starting Android emulator"
# In a redroid base layer, init.rc spawns Android. Production deploys add the
# emulator startup here (see WORKER_SETUP.md for the platform matrix).
# Sleep gives services time to come up.
sleep 30

# Connect ADB to the local Android instance.
adb start-server
adb connect 127.0.0.1:5555 || true
adb wait-for-device

echo "[entrypoint] handing off to runner.py for task ${TASK_ID}"
exec python3 /app/runner.py
