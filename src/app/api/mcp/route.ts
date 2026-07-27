/**
 * /api/mcp — Craftwell Live MCP Server
 *
 * Remote MCP endpoint for the Craftwell Admin connector.
 * Register in Claude as: https://craftwellconstruction.com/api/mcp
 *
 * For safe testing without touching real data, use /api/mcp-sandbox instead.
 */

import { NextRequest, NextResponse } from "next/server";
import { CORS, createMcpHandler }    from "@/lib/craftwell-mcp-server";

export const maxDuration = 60;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export const GET    = (req: NextRequest) => createMcpHandler(req, false);
export const POST   = (req: NextRequest) => createMcpHandler(req, false);
export const DELETE = (req: NextRequest) => createMcpHandler(req, false);
