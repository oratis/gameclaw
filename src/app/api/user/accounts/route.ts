import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { packCreds } from "@/lib/credentials";
import { getAdapter, hasAdapter } from "@/adapters";
import type { Credentials } from "@/adapters/types";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accounts = await prisma.gameAccount.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      gameId: true,
      uid: true,
      nickname: true,
      server: true,
      autoCheckin: true,
      isActive: true,
      needsRelink: true,
      lastCheckin: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ accounts });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { gameId } = body;

  if (!gameId) {
    return NextResponse.json({ error: "Missing gameId" }, { status: 400 });
  }
  if (!hasAdapter(gameId)) {
    return NextResponse.json({ error: "Invalid game" }, { status: 400 });
  }

  const adapter = getAdapter(gameId)!;

  // Two intake shapes:
  //   New:   { gameId, credentials: {...} }
  //   Legacy: { gameId, ltokenV2, ltuidV2 }   (HoYoLab only)
  let credentials: Credentials;
  if (body.credentials && typeof body.credentials === "object") {
    credentials = body.credentials as Credentials;
  } else if (body.ltokenV2 && body.ltuidV2) {
    credentials = { ltokenV2: body.ltokenV2, ltuidV2: body.ltuidV2 };
  } else {
    return NextResponse.json(
      { error: "Missing credentials" },
      { status: 400 }
    );
  }

  // Validate that every required adapter field is present (and non-empty).
  for (const f of adapter.credentialFields) {
    if (f.required && !credentials[f.key]) {
      return NextResponse.json(
        { error: `Missing required field: ${f.label} (${f.key})` },
        { status: 400 }
      );
    }
  }

  // Verify with the adapter — confirms credentials work and pulls account info.
  let roles: { uid: string; nickname: string; server?: string; serverName?: string }[];
  try {
    roles = await adapter.verify(credentials);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Verification failed" },
      { status: 400 }
    );
  }

  if (roles.length === 0) {
    return NextResponse.json(
      { error: `Credentials look valid but no ${adapter.displayName} role was found` },
      { status: 400 }
    );
  }

  // Optional role override; otherwise pick the first one.
  const desiredUid = typeof body.uid === "string" ? body.uid : undefined;
  const role = (desiredUid && roles.find((r) => r.uid === desiredUid)) || roles[0];

  const account = await prisma.gameAccount.create({
    data: {
      userId: session.user.id,
      gameId,
      uid: role.uid,
      nickname: role.nickname,
      server: role.serverName ?? role.server ?? null,
      credentials: packCreds(credentials),
    },
    select: {
      id: true,
      gameId: true,
      uid: true,
      nickname: true,
    },
  });

  return NextResponse.json({ account });
}
