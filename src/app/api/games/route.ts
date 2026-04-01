import { NextResponse } from "next/server";
import { GAMES, GAME_SLUGS } from "@/lib/hoyolab/constants";

export async function GET() {
  const games = GAME_SLUGS.map((slug) => ({
    slug,
    name: GAMES[slug].name,
    description: GAMES[slug].description,
    icon: GAMES[slug].icon,
    color: GAMES[slug].color,
  }));

  return NextResponse.json({ games });
}
