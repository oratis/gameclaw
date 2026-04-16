#!/usr/bin/env python3
"""HoYoLAB daily check-in script for all supported games."""

import argparse
import json
import os
import sys
import requests

GAMES = {
    "genshin": {
        "name": "Genshin Impact",
        "act_id": "e202102251931481",
        "sign_url": "https://sg-hk4e-api.hoyolab.com/event/sol/sign",
        "info_url": "https://sg-hk4e-api.hoyolab.com/event/sol/info",
    },
    "starrail": {
        "name": "Honkai: Star Rail",
        "act_id": "e202303301540311",
        "sign_url": "https://sg-public-api.hoyolab.com/event/luna/os/sign",
        "info_url": "https://sg-public-api.hoyolab.com/event/luna/os/info",
    },
    "honkai3rd": {
        "name": "Honkai Impact 3rd",
        "act_id": "e202110291205111",
        "sign_url": "https://sg-public-api.hoyolab.com/event/mani/sign",
        "info_url": "https://sg-public-api.hoyolab.com/event/mani/info",
    },
    "zzz": {
        "name": "Zenless Zone Zero",
        "act_id": "e202406031448091",
        "sign_url": "https://sg-act-nap-api.hoyolab.com/event/luna/zzz/os/sign",
        "info_url": "https://sg-act-nap-api.hoyolab.com/event/luna/zzz/os/info",
    },
    "tears": {
        "name": "Tears of Themis",
        "act_id": "e202202281857121",
        "sign_url": "https://sg-public-api.hoyolab.com/event/luna/os/sign",
        "info_url": "https://sg-public-api.hoyolab.com/event/luna/os/info",
    },
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.5",
    "Origin": "https://act.hoyolab.com",
    "Referer": "https://act.hoyolab.com/",
    "x-rpc-app_version": "2.34.1",
    "x-rpc-client_type": "4",
    "x-rpc-language": "en-us",
}


def checkin(game_slug: str, ltoken: str, ltuid: str) -> dict:
    """Perform check-in for a specific game."""
    if game_slug not in GAMES:
        return {"success": False, "status": "failed", "message": f"Unknown game: {game_slug}"}

    game = GAMES[game_slug]
    cookies = f"ltoken_v2={ltoken}; ltuid_v2={ltuid}"
    headers = {**HEADERS, "Cookie": cookies, "Content-Type": "application/json;charset=UTF-8"}

    try:
        url = f"{game['sign_url']}?act_id={game['act_id']}"
        resp = requests.post(url, headers=headers, json={"act_id": game["act_id"]}, timeout=30)
        resp.raise_for_status()
        data = resp.json()

        if data["retcode"] == 0:
            return {"success": True, "status": "success", "message": f"Checked in for {game['name']}"}
        elif data["retcode"] == -5003:
            return {"success": True, "status": "already_claimed", "message": f"Already checked in for {game['name']}"}
        elif data["retcode"] in (-1002, -1071):
            return {"success": False, "status": "rate_limited", "message": "Rate limited. Try again later."}
        else:
            return {"success": False, "status": "failed", "message": data.get("message", f"Error {data['retcode']}")}
    except requests.HTTPError as e:
        return {"success": False, "status": "failed", "message": f"HTTP error: {e.response.status_code}"}
    except Exception as e:
        return {"success": False, "status": "failed", "message": str(e)}


def get_info(game_slug: str, ltoken: str, ltuid: str) -> dict:
    """Get check-in info for a specific game."""
    if game_slug not in GAMES:
        return {"error": f"Unknown game: {game_slug}"}

    game = GAMES[game_slug]
    cookies = f"ltoken_v2={ltoken}; ltuid_v2={ltuid}"
    headers = {**HEADERS, "Cookie": cookies}

    try:
        url = f"{game['info_url']}?act_id={game['act_id']}"
        resp = requests.get(url, headers=headers, timeout=30)
        resp.raise_for_status()
        data = resp.json()

        if data["retcode"] == 0:
            return {
                "game": game["name"],
                "total_sign_day": data["data"]["total_sign_day"],
                "today": data["data"]["today"],
                "is_sign": data["data"]["is_sign"],
            }
        return {"error": data.get("message", f"Error {data['retcode']}")}
    except requests.HTTPError as e:
        return {"error": f"HTTP error: {e.response.status_code}"}
    except Exception as e:
        return {"error": str(e)}


def main():
    parser = argparse.ArgumentParser(description="HoYoLAB daily check-in")
    parser.add_argument("--ltoken", default=None, help="ltoken_v2 cookie value (or set LTOKEN_V2 env)")
    parser.add_argument("--ltuid", default=None, help="ltuid_v2 cookie value (or set LTUID_V2 env)")
    parser.add_argument("--game", required=True, choices=list(GAMES.keys()) + ["all"], help="Game to check in")
    parser.add_argument("--info", action="store_true", help="Get check-in info instead of signing")

    args = parser.parse_args()

    # Prefer env vars over CLI args for security (CLI args visible in ps)
    ltoken = args.ltoken or os.environ.get("LTOKEN_V2")
    ltuid = args.ltuid or os.environ.get("LTUID_V2")

    if not ltoken or not ltuid:
        print("Error: Provide credentials via --ltoken/--ltuid or LTOKEN_V2/LTUID_V2 env vars", file=sys.stderr)
        sys.exit(1)

    games_to_process = list(GAMES.keys()) if args.game == "all" else [args.game]
    results = []

    for i, game_slug in enumerate(games_to_process):
        if args.info:
            result = get_info(game_slug, ltoken, ltuid)
        else:
            result = checkin(game_slug, ltoken, ltuid)
        results.append(result)
        # Delay between games to avoid rate limiting
        if i < len(games_to_process) - 1:
            import time
            time.sleep(1.5)

    print(json.dumps(results if len(results) > 1 else results[0], indent=2))


if __name__ == "__main__":
    main()
