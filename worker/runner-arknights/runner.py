#!/usr/bin/env python3
"""
GameClaw L3 Worker — Arknights runner.

Lifecycle:
  1. Read TASK_ID + CALLBACK_TOKEN + CALLBACK_URL from env.
  2. POST {CALLBACK_URL}/api/internal/worker-creds with the token to fetch
     credentials + capability + payload.
  3. Use ADB to push credentials into Arknights, launch the game, run MAA
     according to the requested capability.
  4. Capture screenshots at key checkpoints, upload to GCS.
  5. POST {CALLBACK_URL}/api/internal/worker-callback with terminal status.

If MAA fails or the screen state doesn't match expected templates, fall back
to Claude vision via the helper at the bottom (`vision_fallback_decide`).

Note: this runner is INTENTIONALLY a scaffold. The real-game-driving steps
(`run_capability_*`) need access to a working ADB connection to a running
Arknights instance, plus MAA configured per-capability. Both are deployment-
side concerns documented in ../WORKER_SETUP.md.
"""

from __future__ import annotations

import json
import os
import sys
import subprocess
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import requests


CALLBACK_URL = os.environ["CALLBACK_URL"].rstrip("/")
CALLBACK_TOKEN = os.environ["CALLBACK_TOKEN"]
TASK_ID = os.environ["TASK_ID"]
GCS_BUCKET = os.environ.get("GCS_SCREENSHOT_BUCKET", "")


@dataclass
class Brief:
    """Everything the worker needs to do its job, fetched from the API."""

    game_slug: str
    capability: str
    payload: dict
    credentials: dict
    account: dict


# ---------------------------------------------------------------------------
# API helpers
# ---------------------------------------------------------------------------


def _post(path: str, body: dict, *, timeout: int = 30) -> dict:
    url = f"{CALLBACK_URL}{path}"
    res = requests.post(url, json=body, timeout=timeout)
    res.raise_for_status()
    return res.json()


def fetch_brief() -> Brief:
    data = _post(
        "/api/internal/worker-creds",
        {"taskId": TASK_ID, "callbackToken": CALLBACK_TOKEN},
    )
    return Brief(
        game_slug=data["gameSlug"],
        capability=data["capability"],
        payload=data.get("payload") or {},
        credentials=data["credentials"],
        account=data.get("account") or {},
    )


def report(
    *,
    status: str,
    message: str | None = None,
    reward: str | None = None,
    error_message: str | None = None,
    screenshot_urls: list[str] | None = None,
    result_data: dict | None = None,
) -> None:
    body: dict[str, Any] = {
        "taskId": TASK_ID,
        "callbackToken": CALLBACK_TOKEN,
        "status": status,
    }
    if message is not None:
        body["message"] = message
    if reward is not None:
        body["reward"] = reward
    if error_message is not None:
        body["errorMessage"] = error_message
    if screenshot_urls is not None:
        body["screenshotUrls"] = screenshot_urls
    if result_data is not None:
        body["resultData"] = result_data
    _post("/api/internal/worker-callback", body)


# ---------------------------------------------------------------------------
# ADB / screenshots
# ---------------------------------------------------------------------------


def adb(*args: str, timeout: int = 30) -> subprocess.CompletedProcess:
    return subprocess.run(["adb", *args], capture_output=True, text=True, timeout=timeout)


def capture_screenshot(label: str) -> Path:
    """Capture the current screen via `adb exec-out screencap -p` and save."""
    local_path = Path(f"/tmp/gameclaw_{TASK_ID}_{label}.png")
    res = subprocess.run(
        ["adb", "exec-out", "screencap", "-p"],
        capture_output=True,
        timeout=20,
    )
    if res.returncode != 0:
        raise RuntimeError(f"screencap failed: {res.stderr!r}")
    local_path.write_bytes(res.stdout)
    return local_path


def upload_screenshot(local: Path) -> str | None:
    """Upload to GCS and return the public URL (or None if GCS not configured)."""
    if not GCS_BUCKET:
        return None
    try:
        from google.cloud import storage  # type: ignore
    except ImportError:
        return None

    client = storage.Client()
    bucket = client.bucket(GCS_BUCKET)
    blob_name = f"l3/{TASK_ID}/{uuid.uuid4().hex}-{local.name}"
    blob = bucket.blob(blob_name)
    blob.upload_from_filename(str(local), content_type="image/png")
    # Use signed URL to avoid making the bucket public.
    return blob.generate_signed_url(version="v4", expiration=3600 * 24)


# ---------------------------------------------------------------------------
# Per-capability runners
# ---------------------------------------------------------------------------


def run_maa(task_chain: list[str]) -> dict:
    """
    Drive MAA with a chain of tasks. Returns parsed log output.
    See https://github.com/MaaAssistantArknights/MaaAssistantArknights/blob/master/docs
    """
    cmd = [
        "/opt/maa/MaaCore",  # adjust to whatever the binary is called in the release
        "--task",
        ",".join(task_chain),
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, timeout=1800)
    return {
        "exit_code": res.returncode,
        "stdout_tail": res.stdout[-4000:],
        "stderr_tail": res.stderr[-2000:],
    }


def run_capability_weekly_dungeon(brief: Brief) -> tuple[bool, str, dict]:
    log = run_maa(["StartUp", "Fight"])
    return (log["exit_code"] == 0, "MAA Fight chain finished", log)


def run_capability_infrastructure_shift(brief: Brief) -> tuple[bool, str, dict]:
    log = run_maa(["StartUp", "Infrast"])
    return (log["exit_code"] == 0, "MAA Infrast chain finished", log)


def run_capability_material_farm(brief: Brief) -> tuple[bool, str, dict]:
    stage = brief.payload.get("stage")
    if not stage:
        return (False, "material_farm requires payload.stage", {})
    log = run_maa(["StartUp", f"Fight:{stage}"])
    return (log["exit_code"] == 0, f"MAA farmed {stage}", log)


CAPABILITY_RUNNERS = {
    "weekly_dungeon": run_capability_weekly_dungeon,
    "infrastructure_shift": run_capability_infrastructure_shift,
    "material_farm": run_capability_material_farm,
    "auto_battle": run_capability_weekly_dungeon,  # alias for now
}


# ---------------------------------------------------------------------------
# Vision fallback
# ---------------------------------------------------------------------------


def vision_fallback_decide(reason: str, screenshot_path: Path) -> str | None:
    """
    When MAA / template matching gets stuck, ask the platform's AI Verifier
    endpoint what to do. The endpoint will respond with one of: "retry",
    "skip", "abort", or a UI action description.

    Returns the recommended action, or None if vision is unavailable.

    NOTE: this is a scaffold — the actual /api/internal/worker-vision-help
    endpoint is M3 milestone item 7's deeper extension. For v0 we just log
    and return None so the runner falls back to "abort + report failure".
    """
    print(f"[vision_fallback_decide] would consult LLM: {reason}", file=sys.stderr)
    return None


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> int:
    print(f"[runner] task={TASK_ID} starting", flush=True)
    try:
        brief = fetch_brief()
    except Exception as e:
        report(status="failed", error_message=f"fetch_brief failed: {e}")
        return 1

    print(f"[runner] capability={brief.capability} game={brief.game_slug}", flush=True)
    report(status="running", message=f"booting capability {brief.capability}")

    runner = CAPABILITY_RUNNERS.get(brief.capability)
    if runner is None:
        report(
            status="failed",
            error_message=f"runner for capability '{brief.capability}' not implemented",
        )
        return 2

    # Pre-screenshot
    pre_path = capture_screenshot("pre")
    pre_url = upload_screenshot(pre_path)

    try:
        ok, message, log_data = runner(brief)
    except Exception as e:
        report(
            status="failed",
            error_message=f"runner exception: {e}",
            screenshot_urls=[u for u in [pre_url] if u],
        )
        return 3

    # Post-screenshot
    post_path = capture_screenshot("post")
    post_url = upload_screenshot(post_path)

    urls = [u for u in [pre_url, post_url] if u]
    report(
        status="succeeded" if ok else "failed",
        message=message,
        screenshot_urls=urls,
        result_data={"log": log_data},
    )
    return 0 if ok else 4


if __name__ == "__main__":
    sys.exit(main())
