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
  const res = await fetch(`${BUDGET_URL}?action=${action}`, {
    signal: AbortSignal.timeout(20_000),
  });
  return res.json();
}

async function budgetPost(action: string, body: Record<string, unknown>) {
  if (!BUDGET_URL) throw new Error("APPS_SCRIPT_URL is not set in .env.local");
  const res = await fetch(BUDGET_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...body }),
    signal: AbortSignal.timeout(55_000),
  });
  return res.json();
}

async function crmGet(action: string) {
  if (!CRM_URL) throw new Error("CRM_SCRIPT_URL is not set in .env.local");
  const res = await fetch(`${CRM_URL}?action=${action}`, {
    signal: AbortSignal.timeout(20_000),
  });
  return res.json();
}

async function crmPost(action: string, body: Record<string, unknown>) {
  if (!CRM_URL) throw new Error("CRM_SCRIPT_URL is not set in .env.local");
  const res = await fetch(CRM_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...body }),
    signal: AbortSignal.timeout(20_000),
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
  { name: "craftwell", version: "1.1.0" },
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

    // ── BUDGET LINES ──
    {
      name: "add_budget_lines",
      description:
        "Add cost-code budget lines to an existing job. " +
        "Each line sets a budget amount for one cost code in the job's budget table.",
      inputSchema: {
        type: "object",
        required: ["jobName", "budgetLines"],
        properties: {
          jobName: { type: "string", description: "Exact job name as it appears in the spreadsheet" },
          budgetLines: {
            type: "array",
            description: "Cost-code budget lines to add",
            items: {
              type: "object",
              required: ["itemCode", "budget"],
              properties: {
                itemCode: { type: "string", description: "Cost code (e.g. 'Labor - Tile')" },
                budget:   { type: "number", description: "Budget amount in dollars" },
              },
            },
          },
        },
      },
    },
    {
      name: "get_job_budget",
      description:
        "Return the current budget table for a job — shows cost codes, budgeted amounts, " +
        "actual spend, committed costs, and remaining balance.",
      inputSchema: {
        type: "object",
        required: ["jobName"],
        properties: {
          jobName: { type: "string", description: "Exact job name as it appears in the spreadsheet" },
        },
      },
    },

    // ── COST CODE MANAGEMENT ──
    {
      name: "add_cost_code",
      description: "Add a new item/cost code to the Cost Codes sheet. Use this when a needed cost code does not exist in the list.",
      inputSchema: {
        type: "object",
        required: ["code"],
        properties: {
          code:        { type: "string", description: "Cost code name (e.g. 'Labor - Plumbing', 'Materials - Lumber')" },
          category:    { type: "string", description: "Category (e.g. 'Labor', 'Materials', 'Subcontractor', 'Equipment')" },
          description: { type: "string", description: "Brief description of what this code covers" },
        },
      },
    },
    {
      name: "update_cost_code",
      description: "Edit an existing cost code in the Cost Codes sheet — rename it, change its category, or update its description.",
      inputSchema: {
        type: "object",
        required: ["existingCode"],
        properties: {
          existingCode: { type: "string", description: "Current name of the cost code to edit" },
          newCode:      { type: "string", description: "New name for the cost code (leave blank to keep current name)" },
          category:     { type: "string", description: "New category" },
          description:  { type: "string", description: "New description" },
        },
      },
    },

    // ── SUB BID ──
    {
      name: "update_sub_bid",
      description: "Fill in the vendor/sub bid amount for a cost code on an existing job. Use this when you receive a sub-contractor bid after the initial budget was created.",
      inputSchema: {
        type: "object",
        required: ["jobName", "itemCode", "subBidAmount"],
        properties: {
          jobName:      { type: "string", description: "Exact job name" },
          itemCode:     { type: "string", description: "Cost code to update (e.g. 'Subcontractor - HVAC')" },
          subBidAmount: { type: "number", description: "Vendor/sub bid amount in dollars" },
          vendorName:   { type: "string", description: "Vendor or sub-contractor name" },
        },
      },
    },

    // ── JOB LIFECYCLE ──
    {
      name: "mark_job_complete",
      description: "Mark a job as completed in the budget sheet summary section. Use when the project is finished.",
      inputSchema: {
        type: "object",
        required: ["jobName"],
        properties: {
          jobName:        { type: "string", description: "Exact job name" },
          completionDate: { type: "string", description: "Completion date as YYYY-MM-DD (defaults to today)" },
          notes:          { type: "string", description: "Any completion notes" },
        },
      },
    },
    {
      name: "add_profit_draw",
      description: "Record a profit draw taken from a job before project close. IMPORTANT: Always record draws so you know your true remaining profit at final accounting.",
      inputSchema: {
        type: "object",
        required: ["jobName", "amount"],
        properties: {
          jobName:     { type: "string", description: "Exact job name" },
          amount:      { type: "number", description: "Draw amount in dollars (positive number)" },
          date:        { type: "string", description: "Date as YYYY-MM-DD (defaults to today)" },
          description: { type: "string", description: "Reason or description for the draw" },
        },
      },
    },

    // ── CALENDAR ──
    {
      name: "create_calendar_event",
      description: "Create a Google Calendar event in the Craftwell Projects calendar. Use for site walks, pre-construction meetings, and project milestones.",
      inputSchema: {
        type: "object",
        required: ["title", "date"],
        properties: {
          title:           { type: "string",  description: "Event title (e.g. 'Site Walk – John Smith – 123 Main St')" },
          date:            { type: "string",  description: "Date as YYYY-MM-DD" },
          time:            { type: "string",  description: "Start time in 24-hour format HH:MM (e.g. '09:00'). Omit for all-day event." },
          durationMinutes: { type: "number",  description: "Duration in minutes (default: 60)" },
          description:     { type: "string",  description: "Event notes or description" },
          location:        { type: "string",  description: "Address or location" },
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

      // ── add_budget_lines ───────────────────────────────────────────────────
      case "add_budget_lines": {
        const { jobName, budgetLines } = args as {
          jobName: string;
          budgetLines: Array<{ itemCode: string; budget: number }>;
        };
        const result = await budgetPost("addBudgetLines", { jobName, budgetLines });
        return result.success ? ok(`✅ ${result.message}`) : err(result.error);
      }

      // ── get_job_budget ─────────────────────────────────────────────────────
      case "get_job_budget": {
        const { jobName } = args as { jobName: string };
        const data = await budgetGet(`getJobBudget&jobName=${encodeURIComponent(jobName)}`);
        if (data.error) return err(data.error);
        const { headers = [], rows = [] } = data;
        if (!rows.length) return ok(`No budget lines found for "${jobName}".`);
        const colWidths = (headers as string[]).map((h: string, i: number) =>
          Math.max(h.length, ...(rows as string[][]).map((r: string[]) => String(r[i] ?? "").length))
        );
        const fmt = (row: string[]) =>
          row.map((cell, i) => String(cell ?? "").padEnd(colWidths[i])).join("  |  ");
        const divider = colWidths.map((w: number) => "-".repeat(w)).join("--+--");
        const lines = [fmt(headers as string[]), divider, ...(rows as string[][]).map(fmt)];
        return ok(`Budget for "${jobName}":\n\n${lines.join("\n")}`);
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

      // ── add_cost_code ──────────────────────────────────────────────────────
      case "add_cost_code": {
        const { code, category, description } = args as {
          code: string;
          category?: string;
          description?: string;
        };
        const result = await budgetPost("addCostCode", { code, category, description });
        return result.success ? ok(`✅ Cost code "${code}" added successfully.`) : err(result.error);
      }

      // ── update_cost_code ───────────────────────────────────────────────────
      case "update_cost_code": {
        const { existingCode, newCode, category, description } = args as {
          existingCode: string;
          newCode?: string;
          category?: string;
          description?: string;
        };
        const result = await budgetPost("updateCostCode", { existingCode, newCode, category, description });
        return result.success
          ? ok(`✅ Cost code updated: "${existingCode}"${newCode ? ` → "${newCode}"` : ""}.`)
          : err(result.error);
      }

      // ── update_sub_bid ─────────────────────────────────────────────────────
      case "update_sub_bid": {
        const { jobName, itemCode, subBidAmount, vendorName } = args as {
          jobName: string;
          itemCode: string;
          subBidAmount: number;
          vendorName?: string;
        };
        const result = await budgetPost("updateSubBid", { jobName, itemCode, subBidAmount, vendorName });
        return result.success
          ? ok(`✅ Sub bid updated for "${itemCode}" on "${jobName}": $${subBidAmount.toFixed(2)}${vendorName ? ` (${vendorName})` : ""}.`)
          : err(result.error);
      }

      // ── mark_job_complete ──────────────────────────────────────────────────
      case "mark_job_complete": {
        const { jobName, completionDate, notes } = args as {
          jobName: string;
          completionDate?: string;
          notes?: string;
        };
        const date = completionDate ?? new Date().toISOString().split("T")[0];
        const result = await budgetPost("markJobComplete", { jobName, completionDate: date, notes });
        return result.success
          ? ok(`✅ Job "${jobName}" marked as completed on ${date}.`)
          : err(result.error);
      }

      // ── add_profit_draw ────────────────────────────────────────────────────
      case "add_profit_draw": {
        const { jobName, amount, date, description } = args as {
          jobName: string;
          amount: number;
          date?: string;
          description?: string;
        };
        const drawDate = date ?? new Date().toISOString().split("T")[0];
        const result = await budgetPost("addProfitDraw", {
          jobName,
          amount,
          date: drawDate,
          description: description ?? "Profit draw",
        });
        return result.success
          ? ok(`✅ Profit draw of $${amount.toFixed(2)} recorded for "${jobName}" on ${drawDate}.`)
          : err(result.error);
      }

      // ── create_calendar_event ──────────────────────────────────────────────
      case "create_calendar_event": {
        const { title, date, time, durationMinutes = 60, description, location } = args as {
          title: string;
          date: string;
          time?: string;
          durationMinutes?: number;
          description?: string;
          location?: string;
        };
        const result = await budgetPost("createCalendarEvent", {
          title, date, time, durationMinutes, description, location,
        });
        return result.success
          ? ok(`✅ Calendar event created: "${title}" on ${date}${time ? ` at ${time}` : ""}\n${result.eventUrl ? `Event link: ${result.eventUrl}` : ""}`)
          : err(result.error);
      }

      default:
        return err(`Unknown tool: ${name}`);
    }
  } catch (e) {
    if (e instanceof Error && e.name === "TimeoutError") {
      if (name === "create_job") {
        return ok(
          "⏳ Job creation is taking longer than expected (Google Sheets template copy can exceed 60s). " +
          "Check your spreadsheet — the job tab may already be there. If not, wait 30 seconds and retry."
        );
      }
      return err(
        "Request timed out waiting for Google Apps Script. The script may be cold-starting — wait 30 seconds and try again."
      );
    }
    return err(e instanceof Error ? e.message : String(e));
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
