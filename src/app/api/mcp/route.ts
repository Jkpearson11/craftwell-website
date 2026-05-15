/**
 * /api/mcp — Craftwell Remote MCP Server
 *
 * Implements the MCP Streamable HTTP protocol so Claude on any device
 * (phone, tablet, desktop) can call Craftwell tools without a local server.
 *
 * Register in Claude as a remote MCP server:
 *   URL: https://craftwellconstruction.com/api/mcp
 */

import { NextRequest, NextResponse } from "next/server";
import { Server }   from "@modelcontextprotocol/sdk/server/index.js";
import { WebStandardStreamableHTTPServerTransport }
  from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// ── Google Apps Script URLs (set in Netlify environment variables) ─────────

const BUDGET_URL = process.env.APPS_SCRIPT_URL ?? "";
const CRM_URL    = process.env.CRM_SCRIPT_URL  ?? "";

// ── HTTP helpers ──────────────────────────────────────────────────────────────

async function budgetGet(action: string) {
  if (!BUDGET_URL) throw new Error("APPS_SCRIPT_URL is not configured.");
  const res = await fetch(`${BUDGET_URL}?action=${action}`);
  return res.json();
}

async function budgetPost(action: string, body: Record<string, unknown>) {
  if (!BUDGET_URL) throw new Error("APPS_SCRIPT_URL is not configured.");
  const res = await fetch(BUDGET_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...body }),
  });
  return res.json();
}

async function crmGet(action: string) {
  if (!CRM_URL) throw new Error("CRM_SCRIPT_URL is not configured.");
  const res = await fetch(`${CRM_URL}?action=${action}`);
  return res.json();
}

async function crmPost(action: string, body: Record<string, unknown>) {
  if (!CRM_URL) throw new Error("CRM_SCRIPT_URL is not configured.");
  const res = await fetch(CRM_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...body }),
  });
  return res.json();
}

// ── Tool response helpers ─────────────────────────────────────────────────────

function ok(text: string) {
  return { content: [{ type: "text" as const, text }] };
}
function fail(text: string) {
  return { content: [{ type: "text" as const, text: `❌ ${text}` }], isError: true };
}

// ── Build MCP server (stateless — new instance per request is fine) ────────

function buildServer() {
  const server = new Server(
    { name: "craftwell", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  // ── Tool list ──────────────────────────────────────────────────────────────

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "list_jobs",
        description: "List all job names in the Craftwell Budget spreadsheet.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "list_cost_codes",
        description: "List all available cost codes from the Cost Codes sheet.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "list_crm_leads",
        description: "List all active CRM leads (excludes completed, dead, and lost).",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "create_job",
        description: "Create a new job — copies Template sheet, fills in details, and optionally writes budget allocation.",
        inputSchema: {
          type: "object",
          required: ["jobName", "clientName", "address"],
          properties: {
            jobName:         { type: "string",  description: "Name for the job tab" },
            clientName:      { type: "string",  description: "Client full name" },
            address:         { type: "string",  description: "Job site address" },
            scopeOfWork:     { type: "string",  description: "Description of the work" },
            contractValue:   { type: "number",  description: "Contract value in dollars" },
            operatingBudget: { type: "number",  description: "Operating budget in dollars" },
            startingMargin:  { type: "number",  description: "Starting margin as a percentage" },
            budgetLines: {
              type: "array",
              description: "Initial cost-code budget allocation",
              items: {
                type: "object",
                properties: {
                  itemCode: { type: "string" },
                  budget:   { type: "number" },
                },
              },
            },
          },
        },
      },
      {
        name: "add_transactions",
        description: "Add expense transactions to an existing job. Use negative amounts for credits/returns.",
        inputSchema: {
          type: "object",
          required: ["jobName", "transactions"],
          properties: {
            jobName: { type: "string", description: "Exact job name" },
            transactions: {
              type: "array",
              items: {
                type: "object",
                required: ["itemCode", "amount"],
                properties: {
                  itemCode:    { type: "string" },
                  amount:      { type: "number" },
                  vendor:      { type: "string" },
                  date:        { type: "string", description: "YYYY-MM-DD, defaults to today" },
                  description: { type: "string" },
                },
              },
            },
          },
        },
      },
      {
        name: "create_lead",
        description: "Create a new CRM lead. Lead ID is auto-generated (CW- or IP- prefix based on pipeline stage).",
        inputSchema: {
          type: "object",
          properties: {
            fields: {
              type: "object",
              description: "Column header → value pairs (e.g. {'CLIENT NAME': 'John Smith', 'PIPELINE STAGE': '1 - New Lead'})",
              additionalProperties: { type: "string" },
            },
          },
        },
      },
      {
        name: "update_lead",
        description: "Update an existing CRM lead by Lead ID (e.g. 'CW-264009'). Only provided fields change.",
        inputSchema: {
          type: "object",
          required: ["leadId"],
          properties: {
            leadId: { type: "string", description: "Lead ID to update" },
            fields: {
              type: "object",
              description: "Fields to update (e.g. {'PIPELINE STAGE': '5 - Estimate Delivered'})",
              additionalProperties: { type: "string" },
            },
          },
        },
      },
    ],
  }));

  // ── Tool handlers ──────────────────────────────────────────────────────────

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    try {
      switch (name) {

        case "list_jobs": {
          const data = await budgetGet("getDropdownData");
          const jobs: string[] = data.jobs ?? [];
          return ok(jobs.length ? `${jobs.length} jobs:\n\n${jobs.join("\n")}` : "No jobs found.");
        }

        case "list_cost_codes": {
          const data  = await budgetGet("getDropdownData");
          const codes = (data.costCodes ?? []).map((c: { code: string }) => c.code);
          return ok(codes.length ? `${codes.length} cost codes:\n\n${codes.join("\n")}` : "No cost codes found.");
        }

        case "list_crm_leads": {
          const data     = await crmGet("getCrmData");
          const EXCLUDED = ["COMPLETED", "DEAD", "LOST"];
          const active   = (data.crmLeads ?? []).filter((l: { data: Record<string, string> }) => {
            const stage = (l.data["PIPELINE STAGE"] ?? "").toUpperCase();
            return !EXCLUDED.some(kw => stage.includes(kw));
          });
          if (!active.length) return ok("No active leads found.");
          const lines = active.map((l: { leadId: string; clientName: string; data: Record<string, string> }) =>
            `${l.leadId}  |  ${(l.data["PIPELINE STAGE"] ?? "").padEnd(30)}  |  ${l.clientName}`
          );
          return ok(`${active.length} active leads:\n\n${lines.join("\n")}`);
        }

        case "create_job": {
          const result = await budgetPost("createJob", args as Record<string, unknown>);
          return result.success ? ok(`✅ ${result.message}`) : fail(result.error);
        }

        case "add_transactions": {
          const { jobName, transactions } = args as {
            jobName: string;
            transactions: Array<Record<string, unknown>>;
          };
          const today = new Date().toISOString().split("T")[0];
          const txWithDate = transactions.map(tx => ({ date: today, ...tx }));
          const result = await budgetPost("addTransactions", { jobName, transactions: txWithDate });
          return result.success ? ok(`✅ ${result.message}`) : fail(result.error);
        }

        case "create_lead": {
          const { fields = {} } = args as { fields?: Record<string, string> };
          const result = await crmPost("addLead", { fields });
          return result.success
            ? ok(`✅ ${result.message}\nLead ID: ${result.leadId}`)
            : fail(result.error);
        }

        case "update_lead": {
          const { leadId, fields = {} } = args as { leadId: string; fields?: Record<string, string> };
          const data = await crmGet("getCrmData");
          const lead = (data.crmLeads ?? []).find(
            (l: { leadId: string }) => l.leadId.toUpperCase() === leadId.toUpperCase()
          );
          if (!lead) {
            const ids = (data.crmLeads ?? []).map((l: { leadId: string }) => l.leadId).join(", ");
            return fail(`Lead "${leadId}" not found. Available: ${ids || "none"}`);
          }
          const result = await crmPost("updateLead", { rowIndex: lead.rowIndex, fields });
          return result.success ? ok(`✅ ${result.message}`) : fail(result.error);
        }

        default:
          return fail(`Unknown tool: ${name}`);
      }
    } catch (e) {
      return fail(e instanceof Error ? e.message : String(e));
    }
  });

  return server;
}

// ── CORS headers (required for Claude to connect cross-origin) ─────────────

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id, Last-Event-Id",
};

// ── Route handlers ────────────────────────────────────────────────────────────

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

async function handleMcp(req: NextRequest) {
  try {
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless — works with serverless functions
      enableJsonResponse: true,      // return JSON instead of SSE for simple calls
    });

    const server = buildServer();
    await server.connect(transport);

    const response = await transport.handleRequest(req);

    // Merge CORS headers into the response
    const headers = new Headers(response.headers);
    Object.entries(CORS).forEach(([k, v]) => headers.set(k, v));

    return new NextResponse(response.body, {
      status:  response.status,
      headers,
    });
  } catch (err) {
    console.error("MCP error:", err);
    return NextResponse.json(
      { error: "MCP server error", detail: String(err) },
      { status: 500, headers: CORS }
    );
  }
}

export const GET    = handleMcp;
export const POST   = handleMcp;
export const DELETE = handleMcp;
