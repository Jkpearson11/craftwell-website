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
  const res = await fetch(`${BUDGET_URL}?action=${action}`, {
    signal: AbortSignal.timeout(20_000),
  });
  return res.json();
}

async function budgetPost(action: string, body: Record<string, unknown>) {
  if (!BUDGET_URL) throw new Error("APPS_SCRIPT_URL is not configured.");
  const res = await fetch(BUDGET_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...body }),
    signal: AbortSignal.timeout(55_000),
  });
  return res.json();
}

async function crmGet(action: string) {
  if (!CRM_URL) throw new Error("CRM_SCRIPT_URL is not configured.");
  const res = await fetch(`${CRM_URL}?action=${action}`, {
    signal: AbortSignal.timeout(20_000),
  });
  return res.json();
}

async function crmPost(action: string, body: Record<string, unknown>) {
  if (!CRM_URL) throw new Error("CRM_SCRIPT_URL is not configured.");
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
function fail(text: string) {
  return { content: [{ type: "text" as const, text: `❌ ${text}` }], isError: true };
}

// ── Fuzzy job name resolver ───────────────────────────────────────────────────
// Accepts partial addresses (e.g. "11302 Goddard") and resolves to the exact name.

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

async function resolveJobName(input: string): Promise<string> {
  const data = await budgetGet("getDropdownData");
  const jobs: string[] = data.jobs ?? [];
  if (!jobs.length) throw new Error("No jobs found in spreadsheet.");

  // 1. Exact match — fast path
  if (jobs.includes(input)) return input;

  // 2. Case-insensitive exact
  const lower = input.toLowerCase();
  const ci = jobs.find(j => j.toLowerCase() === lower);
  if (ci) return ci;

  // 3. Normalized exact (strips punctuation/extra spaces)
  const normIn = normalize(input);
  const norm = jobs.find(j => normalize(j) === normIn);
  if (norm) return norm;

  // 4. Input is a substring of job name ("11302 Goddard" ⊂ "11302 Goddard CT")
  const sub = jobs.filter(j => j.toLowerCase().includes(lower));

  // 5. Job name is a substring of input (user typed extra words)
  const rev = jobs.filter(j => lower.includes(j.toLowerCase()));

  // 6. All significant words in input appear somewhere in the job name
  const words = normIn.split(" ").filter(w => w.length > 1);
  const wordMatch = jobs.filter(j => {
    const nj = normalize(j);
    return words.every(w => nj.includes(w));
  });

  // Deduplicate candidates across strategies
  const candidates = [...new Set([...sub, ...rev, ...wordMatch])];

  if (candidates.length === 1) return candidates[0];

  if (candidates.length > 1) {
    const list = candidates.slice(0, 6).join(", ");
    throw new Error(`"${input}" matches multiple jobs: ${list}. Please be more specific.`);
  }

  // No match — provide helpful suggestions using partial word overlap
  const anyWord = jobs.filter(j => words.some(w => normalize(j).includes(w))).slice(0, 5);
  const hint = anyWord.length ? ` Similar jobs: ${anyWord.join(", ")}` : ` Available jobs: ${jobs.slice(0, 8).join(", ")}`;
  throw new Error(`Job "${input}" not found.${hint}`);
}

// ── Budget warning type ───────────────────────────────────────────────────────

interface BudgetWarning {
  itemCode: string;
  budgeted: number;
  actual: number;
  overBy: number;
}

// ── Build MCP server (stateless — new instance per request is fine) ────────

function buildServer() {
  const server = new Server(
    { name: "craftwell", version: "1.1.0" },
    { capabilities: { tools: {} } }
  );

  // ── Tool list ──────────────────────────────────────────────────────────────

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      // ── READ ──────────────────────────────────────────────────────────────
      {
        name: "list_jobs",
        description: "List all job names in the Craftwell Budget spreadsheet.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "list_cost_codes",
        description: "List all available cost codes / item codes from the Cost Codes sheet.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "list_crm_leads",
        description: "List all active CRM leads (excludes completed, dead, and lost).",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "get_job_budget",
        description: "Return the current budget table for a job — cost codes, budgeted amounts, sub/vendor bids, actuals, and remaining balance. Always check this before entering transactions.",
        inputSchema: {
          type: "object",
          required: ["jobName"],
          properties: {
            jobName: { type: "string", description: "Job name or partial address — the system will find the best match (e.g. '11302 Goddard' will match '11302 Goddard CT')" },
          },
        },
      },
      {
        name: "get_job_transactions",
        description: "List all expense transactions recorded on a job — date, cost code, vendor, amount, and description. Optionally filter to a single cost code.",
        inputSchema: {
          type: "object",
          required: ["jobName"],
          properties: {
            jobName:  { type: "string", description: "Exact job name as it appears in the spreadsheet" },
            itemCode: { type: "string", description: "Filter to a specific cost code (optional)" },
          },
        },
      },

      // ── CRM ───────────────────────────────────────────────────────────────
      {
        name: "create_lead",
        description: "Create a new CRM lead. Lead ID is auto-generated (CW- or IP- prefix based on pipeline stage).",
        inputSchema: {
          type: "object",
          properties: {
            fields: {
              type: "object",
              description: "Column header → value pairs. Use exact column names from the CRM sheet (e.g. {'CLIENT NAME': 'John Smith', 'PIPELINE STAGE': '1 - New Lead', 'PHONE': '817-555-0100', 'ADDRESS': '123 Main St', 'CITY': 'Dallas', 'PROJECT DESCRIPTION': 'Kitchen remodel', 'LEAD SOURCE': 'Referral'}). Lead ID is always auto-generated.",
              additionalProperties: { type: "string" },
            },
          },
        },
      },
      {
        name: "update_lead",
        description: "Update an existing CRM lead by Lead ID (e.g. 'CW-264009'). Only provided fields change. Use PIPELINE STAGE values like: '1 - New Lead', '3 - Walk Scheduled', '5 - Estimate Delivered', '9 - Closed Won', '10 - Closed Lost', '12 - Contract signed', '15 - Project Completed'. Setting to '9 - Closed Won', '10 - Closed Lost', '11 - Dead', or '12 - Contract signed' will stop the lead from appearing in the active list.",
        inputSchema: {
          type: "object",
          required: ["leadId"],
          properties: {
            leadId: { type: "string", description: "Lead ID to update (e.g. 'CW-264009')" },
            fields: {
              type: "object",
              description: "Fields to update. Common updates: {'PIPELINE STAGE': '12 - Contract signed'} to mark sold, {'PIPELINE STAGE': '10 - Closed Lost'} to mark lost, {'DATE ESTIMATE DELIVERED': '2026-05-20', 'PIPELINE STAGE': '5 - Estimate Delivered'} after sending estimate, {'DATE SITE WALK SCHEDULED': '2026-05-22', 'PIPELINE STAGE': '3 - Walk Scheduled'} when walk is booked.",
              additionalProperties: { type: "string" },
            },
          },
        },
      },

      // ── CALENDAR ──────────────────────────────────────────────────────────
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

      // ── BUDGET ────────────────────────────────────────────────────────────
      {
        name: "create_job",
        description: "Create a new job — copies Template sheet, fills in details, and optionally writes budget allocation.",
        inputSchema: {
          type: "object",
          required: ["jobName", "clientName", "address"],
          properties: {
            jobName:         { type: "string",  description: "Name for the job tab (e.g. '841 Villa Ridge'). For multiple projects at the same address use 'Address - Room' format, e.g. '7343 Edgerton - Kitchen' and '7343 Edgerton - Master Bath'." },
            clientName:      { type: "string",  description: "Client full name" },
            address:         { type: "string",  description: "Job site address" },
            scopeOfWork:     { type: "string",  description: "Description of the work" },
            contractValue:   { type: "number",  description: "Contract value in dollars" },
            operatingBudget: { type: "number",  description: "Operating budget in dollars" },
            startingMargin:  { type: "number",  description: "Starting margin as a percentage (e.g. 20 for 20%)" },
            budgetLines: {
              type: "array",
              description: "Initial cost-code budget allocation. Leave empty to add budget lines later with add_budget_lines.",
              items: {
                type: "object",
                properties: {
                  itemCode: { type: "string", description: "Cost code name" },
                  budget:   { type: "number", description: "Budget amount in dollars" },
                },
              },
            },
          },
        },
      },
      {
        name: "add_budget_lines",
        description: "Add cost-code budget lines to an existing job's budget table. Use list_cost_codes to see available codes first.",
        inputSchema: {
          type: "object",
          required: ["jobName", "budgetLines"],
          properties: {
            jobName: { type: "string", description: "Job name or partial address — partial match is OK" },
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
        name: "add_transactions",
        description: "Add expense transactions to an existing job. Use negative amounts for credits/returns. You will be ALERTED (not blocked) if a transaction causes a cost code to go over budget. IMPORTANT: Before calling this tool, call get_job_transactions to check whether the same transaction (same amount, vendor, date, and cost code) already exists — if it does, do NOT add it again. When reading a receipt with multiple line items, record each line item at its own individual amount, NOT at the receipt total repeated for each item. Never extract a number from a product name or SKU (e.g. '511' from '511 Impregnator Qt') as an amount — only use the actual dollar figures on the receipt.",
        inputSchema: {
          type: "object",
          required: ["jobName", "transactions"],
          properties: {
            jobName: { type: "string", description: "Job name or partial address — partial match is OK" },
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

      // ── COST CODE MANAGEMENT ──────────────────────────────────────────────
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

      // ── SUB BID ───────────────────────────────────────────────────────────
      {
        name: "update_sub_bid",
        description: "Fill in the negotiated vendor or sub-contractor bid amount for a cost code on an existing job. ONLY call this when you have received a formal quote or bid from a subcontractor or supplier BEFORE work begins — for example, a plumber quoting $3,500 for rough-in work. NEVER call this when recording store receipts, material purchases, or any expense that should go in add_transactions. subBidAmount must be a dollar figure from a bid or quote — never a product SKU, model number, item count, or any number extracted from a product name (e.g. never use '511' from '511 Impregnator Qt' as a bid amount).",
        inputSchema: {
          type: "object",
          required: ["jobName", "itemCode", "subBidAmount"],
          properties: {
            jobName:      { type: "string", description: "Job name or partial address — partial match is OK" },
            itemCode:     { type: "string", description: "Cost code to update (e.g. 'Subcontractor - HVAC')" },
            subBidAmount: { type: "number", description: "Vendor/sub bid amount in dollars" },
            vendorName:   { type: "string", description: "Vendor or sub-contractor name" },
          },
        },
      },

      // ── JOB LIFECYCLE ─────────────────────────────────────────────────────
      {
        name: "mark_job_complete",
        description: "Mark a job as completed in the budget sheet summary section. Use when the project is finished.",
        inputSchema: {
          type: "object",
          required: ["jobName"],
          properties: {
            jobName:        { type: "string", description: "Job name or partial address — partial match is OK" },
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
            jobName:     { type: "string", description: "Job name or partial address — partial match is OK" },
            amount:      { type: "number", description: "Draw amount in dollars (positive number)" },
            date:        { type: "string", description: "Date as YYYY-MM-DD (defaults to today)" },
            description: { type: "string", description: "Reason or description for the draw (e.g. 'Personal draw - covering expenses')" },
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

        // ── READ ──────────────────────────────────────────────────────────────

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

        case "get_job_budget": {
          const { jobName: jobInput } = args as { jobName: string };
          const jobName = await resolveJobName(jobInput);
          const data = await budgetGet(`getJobBudget&jobName=${encodeURIComponent(jobName)}`);
          if (data.error) return fail(data.error);
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

        case "get_job_transactions": {
          const { jobName, itemCode } = args as { jobName: string; itemCode?: string };
          let action = `getJobTransactions&jobName=${encodeURIComponent(jobName)}`;
          if (itemCode) action += `&itemCode=${encodeURIComponent(itemCode)}`;
          const data = await budgetGet(action);
          if (data.error) return fail(data.error);
          const { headers = [], rows = [] } = data;
          if (!rows.length) {
            return ok(itemCode
              ? `No transactions found for "${itemCode}" on "${jobName}".`
              : `No transactions found for "${jobName}".`);
          }
          const colWidths = (headers as string[]).map((h: string, i: number) =>
            Math.max(h.length, ...(rows as string[][]).map((r: string[]) => String(r[i] ?? "").length))
          );
          const fmt = (row: string[]) =>
            row.map((cell, i) => String(cell ?? "").padEnd(colWidths[i])).join("  |  ");
          const divider = colWidths.map((w: number) => "-".repeat(w)).join("--+--");
          const lines = [fmt(headers as string[]), divider, ...(rows as string[][]).map(fmt)];
          const title = itemCode
            ? `Transactions for "${itemCode}" on "${jobName}" (${(rows as string[][]).length} rows):`
            : `Transactions for "${jobName}" (${(rows as string[][]).length} rows):`;
          return ok(`${title}\n\n${lines.join("\n")}`);
        }

        // ── CRM ───────────────────────────────────────────────────────────────

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

        // ── CALENDAR ──────────────────────────────────────────────────────────

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
            : fail(result.error);
        }

        // ── BUDGET ────────────────────────────────────────────────────────────

        case "create_job": {
          const result = await budgetPost("createJob", args as Record<string, unknown>);
          return result.success ? ok(`✅ ${result.message}`) : fail(result.error);
        }

        case "add_budget_lines": {
          const { jobName: jobInput, budgetLines } = args as {
            jobName: string;
            budgetLines: Array<{ itemCode: string; budget: number }>;
          };
          const jobName = await resolveJobName(jobInput);
          const result = await budgetPost("addBudgetLines", { jobName, budgetLines });
          return result.success ? ok(`✅ ${result.message}`) : fail(result.error);
        }

        case "add_transactions": {
          const { jobName: jobInput, transactions } = args as {
            jobName: string;
            transactions: Array<Record<string, unknown>>;
          };
          const jobName = await resolveJobName(jobInput);
          const today = new Date().toISOString().split("T")[0];
          const txWithDate = transactions.map(tx => ({ date: today, ...tx }));
          const result = await budgetPost("addTransactions", { jobName, transactions: txWithDate });
          if (!result.success) return fail(result.error);

          let msg = `✅ ${result.message}`;

          // Over-budget alert — not a blocker, just a warning
          const warnings: BudgetWarning[] = result.budgetWarnings ?? [];
          if (warnings.length > 0) {
            msg += "\n\n⚠️  OVER-BUDGET ALERT — The following cost codes have exceeded their budget:";
            for (const w of warnings) {
              msg += `\n  • ${w.itemCode}: budgeted $${w.budgeted.toFixed(2)}, actual $${w.actual.toFixed(2)} — OVER by $${w.overBy.toFixed(2)}`;
            }
            msg += "\n\nTransactions were recorded. Please review the budget.";
          }
          return ok(msg);
        }

        // ── COST CODE MANAGEMENT ──────────────────────────────────────────────

        case "add_cost_code": {
          const { code, category, description } = args as {
            code: string;
            category?: string;
            description?: string;
          };
          const result = await budgetPost("addCostCode", { code, category, description });
          return result.success ? ok(`✅ Cost code "${code}" added successfully.`) : fail(result.error);
        }

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
            : fail(result.error);
        }

        // ── SUB BID ───────────────────────────────────────────────────────────

        case "update_sub_bid": {
          const { jobName: jobInput, itemCode, subBidAmount, vendorName } = args as {
            jobName: string;
            itemCode: string;
            subBidAmount: number;
            vendorName?: string;
          };
          const jobName = await resolveJobName(jobInput);
          const result = await budgetPost("updateSubBid", { jobName, itemCode, subBidAmount, vendorName });
          return result.success
            ? ok(`✅ Sub bid updated for "${itemCode}" on "${jobName}": $${subBidAmount.toFixed(2)}${vendorName ? ` (${vendorName})` : ""}.`)
            : fail(result.error);
        }

        // ── JOB LIFECYCLE ─────────────────────────────────────────────────────

        case "mark_job_complete": {
          const { jobName: jobInput, completionDate, notes } = args as {
            jobName: string;
            completionDate?: string;
            notes?: string;
          };
          const jobName = await resolveJobName(jobInput);
          const date = completionDate ?? new Date().toISOString().split("T")[0];
          const result = await budgetPost("markJobComplete", { jobName, completionDate: date, notes });
          return result.success
            ? ok(`✅ Job "${jobName}" marked as completed on ${date}.`)
            : fail(result.error);
        }

        case "add_profit_draw": {
          const { jobName: jobInput, amount, date, description } = args as {
            jobName: string;
            amount: number;
            date?: string;
            description?: string;
          };
          const jobName = await resolveJobName(jobInput);
          const drawDate = date ?? new Date().toISOString().split("T")[0];
          const result = await budgetPost("addProfitDraw", {
            jobName,
            amount,
            date: drawDate,
            description: description ?? "Profit draw",
          });
          return result.success
            ? ok(`✅ Profit draw of $${amount.toFixed(2)} recorded for "${jobName}" on ${drawDate}.`)
            : fail(result.error);
        }

        default:
          return fail(`Unknown tool: ${name}`);
      }
    } catch (e) {
      if (e instanceof Error && e.name === "TimeoutError") {
        if (name === "create_job") {
          return ok(
            "⏳ Job creation is taking longer than expected (Google Sheets template copy can exceed 60s). " +
            "Check your spreadsheet — the job tab may already be there. If not, wait 30 seconds and retry."
          );
        }
        return fail(
          "Request timed out waiting for Google Apps Script. The script may be cold-starting — wait 30 seconds and try again."
        );
      }
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
