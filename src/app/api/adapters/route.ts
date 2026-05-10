import { NextResponse } from "next/server";
import { listAdapters } from "@/adapters";

/**
 * Expose registered adapters and their credential schemas to the frontend
 * (link page builds the form dynamically) and to the OpenClaw skill.
 *
 * Public — no credentials are returned, only metadata about what each
 * adapter requires.
 */
export async function GET() {
  return NextResponse.json({
    adapters: listAdapters().map((a) => ({
      slug: a.slug,
      vendor: a.vendor,
      displayName: a.displayName,
      authMethod: a.authMethod,
      capabilities: a.capabilities,
      credentialFields: a.credentialFields,
    })),
  });
}
