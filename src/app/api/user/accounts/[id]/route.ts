import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const account = await prisma.gameAccount.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!account) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const autoCheckin = typeof body.autoCheckin === "boolean" ? body.autoCheckin : account.autoCheckin;
  const isActive = typeof body.isActive === "boolean" ? body.isActive : account.isActive;

  const updated = await prisma.gameAccount.update({
    where: { id },
    data: {
      autoCheckin,
      isActive,
    },
    select: {
      id: true,
      autoCheckin: true,
      isActive: true,
    },
  });

  return NextResponse.json({ account: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const account = await prisma.gameAccount.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!account) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.gameAccount.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
