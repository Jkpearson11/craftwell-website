#!/usr/bin/env npx tsx
/**
 * craftwell-mcp.ts
 *
 * MCP server for the Craftwell back office.
 * Registers as a Claude Code tool so you can describe budget and CRM
 * tasks in plain English and Claude executes them directly — no browser needed.
 *
 * Requirements: add your script URLs to .env.local (see .env.local.example)
 */

import { Server }               from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
// Env vars are injected by claude_desktop_config.json — no dotenv needed.

const BUDGET_URL = process.env.APPS_SCRIPT_URL ?? "";
const CRM_URL    = process.env.CRM_SCRIPT_URL  ?? "";

// ── HTTP helpers ──────────────────────────────────────────────────────────────

async function budgetGet(action: string) {
  if (!BUDGET_URL) throw new Error("APPS_SCRIPT_URL is not set in .env.local");
  const res = await fetch(`${BUDGET_URL}?action=${action}`);
  return res.json();
}

async function budgetPost(action: string, body: Record<string, unknown>) {
  if (!BUDGET_URL) throw new Error("APPS_SCRIPT_URL is not set in .env.local");
  const res = await fetch(BUDGET_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...body }),
  });
  return res.json();
}

async function crmGet(action: string) {
  if (!CRM_URL) throw new Error("CRM_SCRIPT_URL is not set in .env.local");
  const res = await fetch(`${CRM_URL}?action=${action}`);
  return res.json();
}

async function crmPost(action: string, body: Record<string, unknown>) {
  if (!CRM_URL) throw new Error("CRM_SCRIPT_URL is not set in .env.local");
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
function err(text: string) {
  return { content: [{ type: "text" as const, text: `❌ ${text}` }], isError: true };
}

// ── Server setup ──────────────────────────────────────────────────────────────

const server = new Server(
  { name: "craftwell", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// ── Tool definitions ──────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    // ── READ ──
    {
      name: "list_jobs",
      description: "List all job names currently in the Craftwell Budget spreadsheet.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "list_cost_codes",
      description: "List all cost codes (item codes) from the Cost Codes sheet.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "list_crm_leads",
      description: "List all active CRM leads. Completed, dead, and lost leads are excluded.",
      inputSchema: { type: "object", properties: {} },
    },

    // ── BUDGET ──
    {
      name: "create_job",
      description:
        "Create a new job in the Craftwell Budget spreadsheet. Copies the Template sheet, " +
        "fills in job details, and optionally writes initial budget allocation lines.",
      inputSchema: {
        type: "object",
        required: ["jobName", "clientName", "address"],
        properties: {
          jobName:         { type: "string",  description: "Name for the new job tab (e.g. '841 Villa Ridge')" },
          clientName:      { type: "string",  description: "Client full name" },
          address:         { type: "string",  description: "Job site address" },
          scopeOfWork:     { type: "string",  description: "Description of the work" },
          contractValue:   { type: "number",  description: "Total contract value in dollars" },
          operatingBudget: { type: "number",  description: "Operating budget in dollars" },
          startingMargin:  { type: "number",  description: "Starting margin as a percentage (e.g. 20 for 20%)" },
          budgetLines: {
            type: "array",
            description: "Initial cost-code budget allocation",
            items: {
              type: "object",
              properties: {
                itemCode: { type: "string", description: "Cost code (e.g. 'Labor - Tile')" },
                budget:   { type: "number", description: "Budget amount for this cost code" },
              },
            },
          },
        },
      },
    },
    {
      name: "add_transactions",
      description:
        "Add one or more expense transactions to an existing job. " +
        "Use a negative amount for credits or returns.",
      inputSchema: {
        type: "object",
        required: ["jobName", "transactions"],
        properties: {
          jobName: { type: "string", description: "Exact job name as it appears in the spreadsheet" },
          transactions: {
            type: "array",
            description: "List of transactions to record",
            items: {
              type: "object",
              required: ["itemCode", "amount"],
              properties: {
                itemCode:    { type: "string", description: "Cost code for this expense" },
                amount:      { type: "number", description: "Dollar amount (negative = credit/return)" },
                vendor:      { type: "string", description: "Vendor name (e.g. 'Home Depot')" },
                date:        { type: "string", description: "Date as YYYY-MM-DD — defaults to today" },
                description: { type: "string", description: "Short description of the expense" },
              },
            },
          },
        },
      },
    },

    // ── CRM ──
    {
      name: "create_lead",
      description:
        "Create a new lead in the Pipedrive CRM sheet. " +
        "The Lead ID is auto-generated (CW- or IP- prefix based on pipeline stage).",
      inputSchema: {
        type: "object",
        properties: {
          fields: {
            type: "object",
            description:
              "Column header → value pairs. Use the exact header names from your CRM sheet " +
              "(e.g. {'CLIENT NAME': 'John Smith', 'PIPELINE STAGE': '1 - New Lead', " +
              "'PROJECT DESCRIPTION': 'Kitchen remodel', 'PHONE': '817-555-0100'}). " +
              "All fields are optional — Lead ID is always auto-generated.",
            additionalProperties: { type: "string" },
          },
        },
      },
    },
    {
      name: "update_lead",
      description:
        "Update an existing CRM lead by its Lead ID (e.g. 'CW-264009'). " +
        "Only the fields you provide will change — everything else stays as-is.",
      inputSchema: {
        type: "object",
        required: ["leadId"],
        properties: {
          leadId: { type: "string", description: "Lead ID to update (e.g. 'CW-264009' or 'IP-264021')" },
          fields: {
            type: "object",
            description:
              "Column header → new value pairs " +
              "(e.g. {'PIPELINE STAGE': '5 - Estimate Delivered', 'NOTES': 'Called client — interested'}). " +
              "Lead ID is never overwritten.",
            additionalProperties: { type: "string" },
          },
        },
      },
    },
  ],
}));

// ── Tool handlers ─────────────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    switch (name) {

      // ── list_jobs ──────────────────────────────────────────────────────────
      case "list_jobs": {
        const data = await budgetGet("getDropdownData");
        const jobs: string[] = data.jobs ?? [];
        return ok(jobs.length
          ? `${jobs.length} jobs:\n\n${jobs.join("\n")}`
          : "No jobs found.");
      }

      // ── list_cost_codes ────────────────────────────────────────────────────
      case "list_cost_codes": {
        const data  = await budgetGet("getDropdownData");
        const codes = (data.costCodes ?? []).map((c: { code: string }) => c.code);
        return ok(codes.length
          ? `${codes.length} cost codes:\n\n${codes.join("\n")}`
          : "No cost codes found.");
      }

      // ── list_crm_leads ─────────────────────────────────────────────────────
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

      // ── create_job ─────────────────────────────────────────────────────────
      case "create_job": {
        const result = await budgetPost("createJob", args as Record<string, unknown>);
        return result.success ? ok(`✅ ${result.message}`) : err(result.error);
      }

      // ── add_transactions ───────────────────────────────────────────────────
      case "add_transactions": {
        const { jobName, transactions } = args as {
          jobName: string;
          transactions: Array<Record<string, unknown>>;
        };
        const today = new Date().toISOString().split("T")[0];
        const txWithDate = transactions.map(tx => ({ date: today, ...tx }));
        const result = await budgetPost("addTransactions", { jobName, transactions: txWithDate });
        return result.success ? ok(`✅ ${result.message}`) : err(result.error);
      }

      // ── create_lead ────────────────────────────────────────────────────────
      case "create_lead": {
        const { fields = {} } = args as { fields?: Record<string, string> };
        const result = await crmPost("addLead", { fields });
        return result.success
          ? ok(`✅ ${result.message}\nLead ID: ${result.leadId}`)
          : err(result.error);
      }

      // ── update_lead ────────────────────────────────────────────────────────
      case "update_lead": {
        const { leadId, fields = {} } = args as { leadId: string; fields?: Record<string, string> };
        // Resolve leadId → rowIndex by fetching current data
        const data = await crmGet("getCrmData");
        const lead = (data.crmLeads ?? []).find(
          (l: { leadId: string }) => l.leadId.toUpperCase() === leadId.toUpperCase()
        );
        if (!lead) {
          const ids = (data.crmLeads ?? []).map((l: { leadId: string }) => l.leadId).join(", ");
          return err(`Lead "${leadId}" not found. Available IDs: ${ids || "none"}`);
        }
        const result = await crmPost("updateLead", { rowIndex: lead.rowIndex, fields });
        return result.success ? ok(`✅ ${result.message}`) : err(result.error);
      }

      default:
        return err(`Unknown tool: ${name}`);
    }
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
