/**
 * /api/warm — Lightweight warmup endpoint
 *
 * Hit by the keepalive scheduled function every 9 minutes and by the
 * self-ping inside createMcpHandler after every real user request.
 * Returns in <5ms — no heavy imports, no Apps Script calls.
 */

import { NextResponse } from "next/server";
import { CORS }        from "@/lib/craftwell-mcp-server";

export async function GET() {
  return NextResponse.json(
    { status: "warm", ts: Date.now() },
    { headers: CORS }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
