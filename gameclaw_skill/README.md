# GameClaw - OpenClaw Skill

Auto check-in for HoYoLAB games (Genshin Impact, Honkai: Star Rail, ZZZ, and more).

## Installation

```bash
# Via ClawHub
clawhub install gameclaw

# Or manually
cp -r gameclaw_skill ~/.claude/skills/gameclaw
```

## Usage

```
/gameclaw checkin all          # Check in to all games
/gameclaw checkin genshin      # Check in to Genshin Impact
/gameclaw status genshin       # View check-in status
/gameclaw games                # List supported games
```

## Supported Games

- Genshin Impact (`genshin`)
- Honkai: Star Rail (`starrail`)
- Zenless Zone Zero (`zzz`)
- Honkai Impact 3rd (`honkai3rd`)
- Tears of Themis (`tears`)

## Standalone Scripts

```bash
pip install -r scripts/requirements.txt

# Check-in
python scripts/hoyolab_checkin.py --ltoken "TOKEN" --ltuid "UID" --game genshin

# Account info
python scripts/account_status.py --ltoken "TOKEN" --ltuid "UID"
```

## License

MIT
