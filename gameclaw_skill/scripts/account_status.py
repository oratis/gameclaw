#!/usr/bin/env python3
"""Query HoYoLAB game account information."""

import argparse
import json
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
        return []
    except Exception as e:
        return [{"error": str(e)}]


def main():
    parser = argparse.ArgumentParser(description="Query HoYoLAB game accounts")
    parser.add_argument("--ltoken", required=True, help="ltoken_v2 cookie value")
    parser.add_argument("--ltuid", required=True, help="ltuid_v2 cookie value")

    args = parser.parse_args()
    accounts = get_accounts(args.ltoken, args.ltuid)

    print(json.dumps(accounts, indent=2))


if __name__ == "__main__":
    main()
