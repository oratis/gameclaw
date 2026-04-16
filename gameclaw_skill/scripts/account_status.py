#!/usr/bin/env python3
"""Query HoYoLAB game account information."""

import argparse
import json
import os
import sys
import requests

GAME_ROLES_URL = "https://api-os-takumi.mihoyo.com/binding/api/getUserGameRolesByCookie"

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


def get_accounts(ltoken: str, ltuid: str) -> list:
    """Get all game accounts linked to the HoYoLAB account."""
    cookies = f"ltoken_v2={ltoken}; ltuid_v2={ltuid}"
    headers = {**HEADERS, "Cookie": cookies}

    try:
        resp = requests.get(GAME_ROLES_URL, headers=headers, timeout=30)
        resp.raise_for_status()
        data = resp.json()

        if data["retcode"] == 0 and data["data"]["list"]:
            return [
                {
                    "game_biz": role["game_biz"],
                    "region": role["region"],
                    "uid": role["game_uid"],
                    "nickname": role["nickname"],
                    "level": role["level"],
                    "region_name": role["region_name"],
                }
                for role in data["data"]["list"]
            ]
        if data["retcode"] in (-100, -10001):
            print(f"Error: Invalid or expired cookies (retcode {data['retcode']})", file=sys.stderr)
            sys.exit(1)
        return []
    except requests.HTTPError as e:
        print(f"Error: HTTP {e.response.status_code}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Query HoYoLAB game accounts")
    parser.add_argument("--ltoken", default=None, help="ltoken_v2 cookie value (or set LTOKEN_V2 env)")
    parser.add_argument("--ltuid", default=None, help="ltuid_v2 cookie value (or set LTUID_V2 env)")

    args = parser.parse_args()

    # Prefer env vars over CLI args for security (CLI args visible in ps)
    ltoken = args.ltoken or os.environ.get("LTOKEN_V2")
    ltuid = args.ltuid or os.environ.get("LTUID_V2")

    if not ltoken or not ltuid:
        print("Error: Provide credentials via --ltoken/--ltuid or LTOKEN_V2/LTUID_V2 env vars", file=sys.stderr)
        sys.exit(1)

    accounts = get_accounts(ltoken, ltuid)
    print(json.dumps(accounts, indent=2))


if __name__ == "__main__":
    main()
