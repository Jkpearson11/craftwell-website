/**
 * /api/mcp-sandbox — Craftwell Sandbox MCP Server
 *
 * Identical to /api/mcp but runs entirely against mock data.
 * No Google Sheets or Apps Script endpoint is ever called.
 * Every response is stamped with a [SANDBOX MODE] banner.
 *
 * Register as a second connector in Claude:
 *   URL: https://craftwellconstruction.com/api/mcp-sandbox
 *
 * Use this connector to test all 16 tools safely before using
 * the live Craftwell Admin connector.
 */

import { NextRequest, NextResponse } from "next/server";
import { CORS, createMcpHandler }    from "@/lib/craftwell-mcp-server";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export const GET    = (req: NextRequest) => createMcpHandler(req, true);
export const POST   = (req: NextRequest) => createMcpHandler(req, true);
export const DELETE = (req: NextRequest) => createMcpHandler(req, true);
