/**
 * Admin gate. Two sources are honored:
 *   1. process.env.ADMIN_EMAILS — comma-separated list of admin emails
 *   2. user.role === "admin" in DB
 *
 * (1) means we can grant admin without a DB write. Useful for the first
 * admin in a fresh deploy. (2) is the durable record once the DB has data.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface AdminCheck {
  ok: boolean;
  userId?: string;
  email?: string | null;
  reason?: string;
}

function envAdmins(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

export async function requireAdmin(): Promise<AdminCheck> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, reason: "unauthorized" };
  }
  const email = session.user.email?.toLowerCase();
  if (email && envAdmins().has(email)) {
    return { ok: true, userId: session.user.id, email: session.user.email };
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role === "admin") {
    return { ok: true, userId: session.user.id, email: session.user.email };
  }
  return { ok: false, reason: "forbidden", userId: session.user.id, email: session.user.email };
}
