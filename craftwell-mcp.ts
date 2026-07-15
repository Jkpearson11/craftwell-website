#!/usr/bin/env npx tsx
/**
 * craftwell-mcp.ts
 *
 * MCP server for the Craftwell back office.
 * Registers as a Claude Code tool so you can describe budget and CRM
 * tasks in plain English and Claude executes them directly — no browser needed.
 *
 * Requirements: add your script URLs to .env.local (see .env.local.example)
 *
 * Sandbox mode: set CRAFTWELL_SANDBOX=true to run all tools against realistic
 * mock data without touching any Google Sheets or Apps Script endpoint.
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
const SANDBOX    = process.env.CRAFTWELL_SANDBOX === "true";

// ── Startup validation ────────────────────────────────────────────────────────

const APPS_SCRIPT_ORIGIN = "https://script.google.com";

function assertConfig() {
  if (SANDBOX) {
    console.error("craftwell-mcp: ⚠️  SANDBOX MODE — no real data will be read or written.");
    return;
  }
  const errs: string[] = [];
  if (!BUDGET_URL) {
    errs.push("APPS_SCRIPT_URL is not set");
  } else if (!BUDGET_URL.startsWith(APPS_SCRIPT_ORIGIN)) {
    errs.push("APPS_SCRIPT_URL must be a Google Apps Script URL (https://script.google.com/…)");
  }
  if (!CRM_URL) {
    errs.push("CRM_SCRIPT_URL is not set");
  } else if (!CRM_URL.startsWith(APPS_SCRIPT_ORIGIN)) {
    errs.push("CRM_SCRIPT_URL must be a Google Apps Script URL (https://script.google.com/…)");
  }
  if (errs.length) {
    console.error("craftwell-mcp: configuration errors:\n" + errs.map(e => `  • ${e}`).join("\n"));
    process.exit(1);
  }
}

// ── Input validation helpers ──────────────────────────────────────────────────

const MAX_STR = 500;
const MAX_MSG = 2000;

function safeStr(v: unknown, max = MAX_STR): string {
  if (typeof v !== "string") throw new Error("Expected a string value");
  const s = v.trim();
  if (s.length === 0) throw new Error("Value must not be empty");
  if (s.length > max) throw new Error(`Value exceeds maximum length of ${max} characters`);
  return s;
}

function safeOptStr(v: unknown, max = MAX_STR): string | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  return safeStr(v, max);
}

function safeNum(v: unknown): number {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  if (typeof n !== "number" || !isFinite(n)) throw new Error("Expected a finite number");
  return n;
}

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

const SANDBOX_BANNER = "\n\n⚠️  [SANDBOX MODE — no real data was read or written]";

function ok(text: string) {
  return { content: [{ type: "text" as const, text }] };
}
function err(text: string) {
  return { content: [{ type: "text" as const, text: `❌ ${text}` }], isError: true };
}
function sandboxOk(text: string) {
  return ok(text + SANDBOX_BANNER);
}

// ── Sandbox mock data ─────────────────────────────────────────────────────────

const MOCK_JOBS = ["841 Villa Ridge", "123 Oakwood Dr", "2240 Lakeview Terrace"];
const MOCK_COST_CODES = [
  "Labor - Tile", "Labor - Demo", "Labor - Framing", "Labor - Paint",
  "Materials - Lumber", "Materials - Concrete", "Materials - Tile",
  "Subcontractor - Plumbing", "Subcontractor - HVAC", "Subcontractor - Electrical",
  "Equipment - Rental", "Permits & Fees",
];
const MOCK_LEADS = [
  { leadId: "CW-264009", stage: "3 - Estimate In Progress", client: "John Smith" },
  { leadId: "CW-264021", stage: "1 - New Lead",             client: "Maria Garcia" },
  { leadId: "IP-264033", stage: "5 - Estimate Delivered",   client: "Robert Chen" },
];

// ── Server setup ──────────────────────────────────────────────────────────────

const server = new Server(
  { name: "craftwell", version: "1.2.0" },
  { capabilities: { tools: {} } }
);

// ── Tool definitions ──────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    // ── READ ──
    {
      name: "list_jobs",
      description:
        "CRAFTWELL (Google Sheets) — List all construction job names in the Craftwell Budget spreadsheet. " +
        "Use this, NOT any QuickBooks tool, when the user asks what jobs or projects exist in Craftwell.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "list_cost_codes",
      description:
        "CRAFTWELL (Google Sheets) — List all cost codes (item codes) from the Craftwell Cost Codes sheet. " +
        "These are construction cost categories like 'Labor - Tile' or 'Subcontractor - HVAC', " +
        "not QuickBooks products or chart-of-accounts items.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "list_crm_leads",
      description:
        "CRAFTWELL CRM (Google Sheets) — List all active leads from the Craftwell Pipedrive CRM sheet. " +
        "Active means not Completed, Dead, or Lost. Use this, NOT QuickBooks customer tools, " +
        "when the user asks about Craftwell leads or prospects.",
      inputSchema: { type: "object", properties: {} },
    },

    // ── BUDGET ──
    {
      name: "create_job",
      description:
        "CRAFTWELL (Google Sheets) — Create a new construction job in the Craftwell Budget spreadsheet. " +
        "Copies the Template sheet, fills in job details, and optionally writes initial budget allocation lines. " +
        "Use this, NOT any QuickBooks invoice or project tool, when setting up a new Craftwell job.",
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
        "CRAFTWELL (Google Sheets) — Record expense transactions against a construction job in the " +
        "Craftwell Budget spreadsheet. This writes to Google Sheets, NOT to QuickBooks. " +
        "Use this when the user says 'add expenses', 'record a receipt', or 'log costs' for a Craftwell job. " +
        "Use a negative amount for credits or returns. " +
        "IMPORTANT: Before calling this tool, call get_job_transactions to check whether the same " +
        "transaction (same amount, vendor, date, and cost code) already exists — if it does, do NOT " +
        "add it again. When reading a receipt with multiple line items, record each line item at its " +
        "own individual dollar amount, NOT the receipt total repeated for each item. Never extract a " +
        "number from a product name or SKU (e.g. '511' from '511 Impregnator Qt') as an amount — " +
        "only use the actual dollar figures printed on the receipt.",
      inputSchema: {
        type: "object",
        required: ["jobName", "transactions"],
        properties: {
          jobName: { type: "string", description: "Exact job name as it appears in the Craftwell spreadsheet" },
          transactions: {
            type: "array",
            description: "List of transactions to record in the Craftwell Budget sheet",
            items: {
              type: "object",
              required: ["itemCode", "amount"],
              properties: {
                itemCode:    { type: "string", description: "Craftwell cost code for this expense" },
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
        "CRAFTWELL CRM (Google Sheets) — Create a new lead in the Craftwell Pipedrive CRM sheet. " +
        "This is for construction leads/prospects, NOT a QuickBooks customer. " +
        "Use this when adding a new potential client or project inquiry to the Craftwell pipeline. " +
        "The Lead ID is auto-generated (CW- or IP- prefix based on pipeline stage).",
      inputSchema: {
        type: "object",
        properties: {
          fields: {
            type: "object",
            description:
              "Column header → value pairs for the Craftwell CRM sheet. Use the exact header names " +
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
        "CRAFTWELL CRM (Google Sheets) — Update an existing lead in the Craftwell Pipedrive CRM sheet " +
        "by its Lead ID (e.g. 'CW-264009'). This updates Google Sheets, NOT QuickBooks. " +
        "Only the fields you provide will change — everything else stays as-is.",
      inputSchema: {
        type: "object",
        required: ["leadId"],
        properties: {
          leadId: { type: "string", description: "Craftwell Lead ID to update (e.g. 'CW-264009' or 'IP-264021')" },
          fields: {
            type: "object",
            description:
              "Column header → new value pairs for the Craftwell CRM sheet " +
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
        "CRAFTWELL (Google Sheets) — Add cost-code budget lines to an existing job in the Craftwell " +
        "Budget spreadsheet. Each line sets a budget amount for one cost code in the job's budget table.",
      inputSchema: {
        type: "object",
        required: ["jobName", "budgetLines"],
        properties: {
          jobName: { type: "string", description: "Exact job name as it appears in the Craftwell spreadsheet" },
          budgetLines: {
            type: "array",
            description: "Cost-code budget lines to add to the Craftwell job",
            items: {
              type: "object",
              required: ["itemCode", "budget"],
              properties: {
                itemCode: { type: "string", description: "Craftwell cost code (e.g. 'Labor - Tile')" },
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
        "CRAFTWELL (Google Sheets) — Return the current budget table for a job from the Craftwell " +
        "Budget spreadsheet. Shows cost codes, budgeted amounts, actual spend, committed costs, and " +
        "remaining balance. Use this, NOT QuickBooks reports, for Craftwell job budget status.",
      inputSchema: {
        type: "object",
        required: ["jobName"],
        properties: {
          jobName: { type: "string", description: "Exact job name as it appears in the Craftwell spreadsheet" },
        },
      },
    },
    {
      name: "get_job_transactions",
      description:
        "CRAFTWELL (Google Sheets) — List all expense transactions recorded on a Craftwell job in Google " +
        "Sheets — date, cost code, vendor, amount, and description. Optionally filter to a single cost code. " +
        "Use this, NOT QuickBooks invoice tools, when looking up expenses on a specific Craftwell job.",
      inputSchema: {
        type: "object",
        required: ["jobName"],
        properties: {
          jobName:  { type: "string", description: "Exact job name as it appears in the Craftwell spreadsheet" },
          itemCode: { type: "string", description: "Filter to a specific cost code (optional)" },
        },
      },
    },

    // ── COST CODE MANAGEMENT ──
    {
      name: "add_cost_code",
      description:
        "CRAFTWELL (Google Sheets) — Add a new construction cost code to the Craftwell Cost Codes sheet. " +
        "Use when a needed cost code does not exist in the Craftwell list. " +
        "These are Craftwell-specific categories, not QuickBooks products or accounts.",
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
      description:
        "CRAFTWELL (Google Sheets) — Edit an existing cost code in the Craftwell Cost Codes sheet — " +
        "rename it, change its category, or update its description. " +
        "This is for Craftwell cost codes only, not QuickBooks products or accounts.",
      inputSchema: {
        type: "object",
        required: ["existingCode"],
        properties: {
          existingCode: { type: "string", description: "Current name of the Craftwell cost code to edit" },
          newCode:      { type: "string", description: "New name for the cost code (leave blank to keep current name)" },
          category:     { type: "string", description: "New category" },
          description:  { type: "string", description: "New description" },
        },
      },
    },

    // ── SUB BID ──
    {
      name: "update_sub_bid",
      description:
        "CRAFTWELL (Google Sheets) — Fill in the negotiated vendor or sub-contractor bid amount for a " +
        "cost code on an existing Craftwell job. " +
        "ONLY call this when you have received a formal quote or bid from a subcontractor or supplier " +
        "BEFORE work begins — for example, a plumber quoting $3,500 for rough-in work. " +
        "NEVER call this when recording store receipts, material purchases, or any expense that should " +
        "go in add_transactions. subBidAmount must be a dollar figure from a bid or quote — never a " +
        "product SKU, model number, item count, or any number extracted from a product name " +
        "(e.g. never use '511' from '511 Impregnator Qt' as a bid amount).",
      inputSchema: {
        type: "object",
        required: ["jobName", "itemCode", "subBidAmount"],
        properties: {
          jobName:      { type: "string", description: "Exact Craftwell job name" },
          itemCode:     { type: "string", description: "Cost code to update (e.g. 'Subcontractor - HVAC')" },
          subBidAmount: { type: "number", description: "Vendor/sub bid amount in dollars" },
          vendorName:   { type: "string", description: "Vendor or sub-contractor name" },
        },
      },
    },

    // ── JOB LIFECYCLE ──
    {
      name: "mark_job_complete",
      description:
        "CRAFTWELL (Google Sheets) — Mark a Craftwell job as completed in the budget sheet summary section. " +
        "Use when the construction project is finished.",
      inputSchema: {
        type: "object",
        required: ["jobName"],
        properties: {
          jobName:        { type: "string", description: "Exact Craftwell job name" },
          completionDate: { type: "string", description: "Completion date as YYYY-MM-DD (defaults to today)" },
          notes:          { type: "string", description: "Any completion notes" },
        },
      },
    },
    {
      name: "add_profit_draw",
      description:
        "CRAFTWELL (Google Sheets) — Record a profit draw taken from a Craftwell job before project close. " +
        "IMPORTANT: Always record draws so you know your true remaining profit at final accounting.",
      inputSchema: {
        type: "object",
        required: ["jobName", "amount"],
        properties: {
          jobName:     { type: "string", description: "Exact Craftwell job name" },
          amount:      { type: "number", description: "Draw amount in dollars (positive number)" },
          date:        { type: "string", description: "Date as YYYY-MM-DD (defaults to today)" },
          description: { type: "string", description: "Reason or description for the draw" },
        },
      },
    },

    // ── CALENDAR ──
    {
      name: "create_calendar_event",
      description:
        "CRAFTWELL — Create a Google Calendar event in the Craftwell Projects calendar. " +
        "Use for site walks, pre-construction meetings, and project milestones. " +
        "This creates an event in the Craftwell-specific Google Calendar, not a QuickBooks transaction.",
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
        if (SANDBOX) {
          return sandboxOk(`${MOCK_JOBS.length} jobs (mock):\n\n${MOCK_JOBS.join("\n")}`);
        }
        const data = await budgetGet("getDropdownData");
        const jobs: string[] = data.jobs ?? [];
        return ok(jobs.length
          ? `${jobs.length} jobs:\n\n${jobs.join("\n")}`
          : "No jobs found.");
      }

      // ── list_cost_codes ────────────────────────────────────────────────────
      case "list_cost_codes": {
        if (SANDBOX) {
          return sandboxOk(`${MOCK_COST_CODES.length} cost codes (mock):\n\n${MOCK_COST_CODES.join("\n")}`);
        }
        const data  = await budgetGet("getDropdownData");
        const codes = (data.costCodes ?? []).map((c: { code: string }) => c.code);
        return ok(codes.length
          ? `${codes.length} cost codes:\n\n${codes.join("\n")}`
          : "No cost codes found.");
      }

      // ── list_crm_leads ─────────────────────────────────────────────────────
      case "list_crm_leads": {
        if (SANDBOX) {
          const lines = MOCK_LEADS.map(l =>
            `${l.leadId}  |  ${l.stage.padEnd(30)}  |  ${l.client}`
          );
          return sandboxOk(`${MOCK_LEADS.length} active leads (mock):\n\n${lines.join("\n")}`);
        }
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
        const raw = args as Record<string, unknown>;
        const jobName         = safeStr(raw.jobName);
        const clientName      = safeStr(raw.clientName);
        const address         = safeStr(raw.address);
        const scopeOfWork     = safeOptStr(raw.scopeOfWork, MAX_MSG);
        const contractValue   = raw.contractValue   != null ? safeNum(raw.contractValue)   : undefined;
        const operatingBudget = raw.operatingBudget != null ? safeNum(raw.operatingBudget) : undefined;
        const startingMargin  = raw.startingMargin  != null ? safeNum(raw.startingMargin)  : undefined;
        if (SANDBOX) {
          return sandboxOk(
            `✅ Job "${jobName}" would be created for ${clientName} at ${address}` +
            (contractValue   ? `\n  Contract value:    $${contractValue.toLocaleString()}` : "") +
            (operatingBudget ? `\n  Operating budget:  $${operatingBudget.toLocaleString()}` : "") +
            (startingMargin  ? `\n  Starting margin:   ${startingMargin}%` : "") +
            (scopeOfWork     ? `\n  Scope: ${scopeOfWork}` : "")
          );
        }
        const budgetLines = raw.budgetLines as unknown[] | undefined;
        const result = await budgetPost("createJob", {
          jobName, clientName, address, scopeOfWork,
          contractValue, operatingBudget, startingMargin, budgetLines,
        });
        return result.success ? ok(`✅ ${result.message}`) : err(result.error);
      }

      // ── add_transactions ───────────────────────────────────────────────────
      case "add_transactions": {
        const raw = args as Record<string, unknown>;
        const jobName = safeStr(raw.jobName);
        if (!Array.isArray(raw.transactions) || raw.transactions.length === 0)
          throw new Error("transactions must be a non-empty array");
        const today = new Date().toISOString().split("T")[0];
        const transactions = (raw.transactions as Array<Record<string, unknown>>).map(tx => ({
          date:        safeOptStr(tx.date) ?? today,
          itemCode:    safeStr(tx.itemCode),
          amount:      safeNum(tx.amount),
          vendor:      safeOptStr(tx.vendor),
          description: safeOptStr(tx.description, MAX_MSG),
        }));
        if (SANDBOX) {
          const lines = transactions.map(tx =>
            `  ${tx.date}  ${tx.itemCode}  $${tx.amount.toFixed(2)}` +
            (tx.vendor ? `  (${tx.vendor})` : "") +
            (tx.description ? `  — ${tx.description}` : "")
          );
          return sandboxOk(
            `✅ Would record ${transactions.length} transaction(s) on "${jobName}":\n\n${lines.join("\n")}`
          );
        }
        const result = await budgetPost("addTransactions", { jobName, transactions });
        return result.success ? ok(`✅ ${result.message}`) : err(result.error);
      }

      // ── create_lead ────────────────────────────────────────────────────────
      case "create_lead": {
        const raw = args as Record<string, unknown>;
        const rawFields = (raw.fields ?? {}) as Record<string, unknown>;
        const fields: Record<string, string> = {};
        for (const [k, v] of Object.entries(rawFields)) {
          const key = safeStr(k);
          fields[key] = safeStr(v, MAX_MSG);
        }
        if (SANDBOX) {
          const mockId = `CW-${Math.floor(Math.random() * 900000 + 100000)}`;
          const summary = Object.entries(fields).map(([k, v]) => `  ${k}: ${v}`).join("\n");
          return sandboxOk(`✅ Would create lead ${mockId}:\n\n${summary}`);
        }
        const result = await crmPost("addLead", { fields });
        return result.success
          ? ok(`✅ ${result.message}\nLead ID: ${result.leadId}`)
          : err(result.error);
      }

      // ── add_budget_lines ───────────────────────────────────────────────────
      case "add_budget_lines": {
        const raw = args as Record<string, unknown>;
        const jobName = safeStr(raw.jobName);
        if (!Array.isArray(raw.budgetLines) || raw.budgetLines.length === 0)
          throw new Error("budgetLines must be a non-empty array");
        const budgetLines = (raw.budgetLines as Array<Record<string, unknown>>).map(bl => ({
          itemCode: safeStr(bl.itemCode),
          budget:   safeNum(bl.budget),
        }));
        if (SANDBOX) {
          const lines = budgetLines.map(bl => `  ${bl.itemCode}: $${bl.budget.toFixed(2)}`);
          return sandboxOk(
            `✅ Would add ${budgetLines.length} budget line(s) to "${jobName}":\n\n${lines.join("\n")}`
          );
        }
        const result = await budgetPost("addBudgetLines", { jobName, budgetLines });
        return result.success ? ok(`✅ ${result.message}`) : err(result.error);
      }

      // ── get_job_budget ─────────────────────────────────────────────────────
      case "get_job_budget": {
        const { jobName } = { jobName: safeStr((args as Record<string, unknown>).jobName) };
        if (SANDBOX) {
          const headers = ["Cost Code", "Budget", "Actual", "Committed", "Remaining"];
          const rows = [
            ["Labor - Tile",           "$4,500", "$2,100", "$0",     "$2,400"],
            ["Materials - Tile",        "$3,200", "$1,850", "$0",     "$1,350"],
            ["Subcontractor - Plumbing","$6,000", "$0",     "$6,000", "$0"],
          ];
          const colWidths = headers.map((h, i) =>
            Math.max(h.length, ...rows.map(r => r[i].length))
          );
          const fmt = (row: string[]) =>
            row.map((cell, i) => cell.padEnd(colWidths[i])).join("  |  ");
          const divider = colWidths.map(w => "-".repeat(w)).join("--+--");
          const lines = [fmt(headers), divider, ...rows.map(fmt)];
          return sandboxOk(`Budget for "${jobName}" (mock):\n\n${lines.join("\n")}`);
        }
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

      // ── get_job_transactions ───────────────────────────────────────────────
      case "get_job_transactions": {
        const raw = args as Record<string, unknown>;
        const jobName  = safeStr(raw.jobName);
        const itemCode = safeOptStr(raw.itemCode);
        if (SANDBOX) {
          const headers = ["Date", "Cost Code", "Vendor", "Amount", "Description"];
          const rows = [
            ["2026-07-01", "Labor - Tile",       "Joe's Tile Co", "$2,100.00", "Tile labor week 1"],
            ["2026-07-05", "Materials - Tile",    "Home Depot",    "$1,850.00", "Porcelain tile 200sqft"],
          ].filter(r => !itemCode || r[1] === itemCode);
          if (!rows.length) {
            return sandboxOk(
              itemCode
                ? `No transactions found for "${itemCode}" on "${jobName}" (mock).`
                : `No transactions found for "${jobName}" (mock).`
            );
          }
          const colWidths = headers.map((h, i) =>
            Math.max(h.length, ...rows.map(r => r[i].length))
          );
          const fmt = (row: string[]) =>
            row.map((cell, i) => cell.padEnd(colWidths[i])).join("  |  ");
          const divider = colWidths.map(w => "-".repeat(w)).join("--+--");
          const lines = [fmt(headers), divider, ...rows.map(fmt)];
          const title = itemCode
            ? `Transactions for "${itemCode}" on "${jobName}" — ${rows.length} row(s) (mock):`
            : `Transactions for "${jobName}" — ${rows.length} row(s) (mock):`;
          return sandboxOk(`${title}\n\n${lines.join("\n")}`);
        }
        let action = `getJobTransactions&jobName=${encodeURIComponent(jobName)}`;
        if (itemCode) action += `&itemCode=${encodeURIComponent(itemCode)}`;
        const data = await budgetGet(action);
        if (data.error) return err(data.error);
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

      // ── update_lead ────────────────────────────────────────────────────────
      case "update_lead": {
        const raw    = args as Record<string, unknown>;
        const leadId = safeStr(raw.leadId);
        const rawFields = (raw.fields ?? {}) as Record<string, unknown>;
        const fields: Record<string, string> = {};
        for (const [k, v] of Object.entries(rawFields)) {
          fields[safeStr(k)] = safeStr(v, MAX_MSG);
        }
        if (SANDBOX) {
          const summary = Object.entries(fields).map(([k, v]) => `  ${k}: ${v}`).join("\n");
          return sandboxOk(`✅ Would update lead "${leadId}":\n\n${summary}`);
        }
        const data = await crmGet("getCrmData");
        const lead = (data.crmLeads ?? []).find(
          (l: { leadId: string }) => l.leadId.toUpperCase() === leadId.toUpperCase()
        );
        if (!lead) {
          return err(`Lead "${leadId}" not found. Use list_crm_leads to see available lead IDs.`);
        }
        const result = await crmPost("updateLead", { rowIndex: lead.rowIndex, fields });
        return result.success ? ok(`✅ ${result.message}`) : err(result.error);
      }

      // ── add_cost_code ──────────────────────────────────────────────────────
      case "add_cost_code": {
        const raw = args as Record<string, unknown>;
        const code        = safeStr(raw.code);
        const category    = safeOptStr(raw.category);
        const description = safeOptStr(raw.description, MAX_MSG);
        if (SANDBOX) {
          return sandboxOk(
            `✅ Would add cost code "${code}"` +
            (category    ? ` (Category: ${category})`       : "") +
            (description ? `\n  Description: ${description}` : "")
          );
        }
        const result = await budgetPost("addCostCode", { code, category, description });
        return result.success ? ok(`✅ Cost code "${code}" added successfully.`) : err(result.error);
      }

      // ── update_cost_code ───────────────────────────────────────────────────
      case "update_cost_code": {
        const raw = args as Record<string, unknown>;
        const existingCode = safeStr(raw.existingCode);
        const newCode      = safeOptStr(raw.newCode);
        const category     = safeOptStr(raw.category);
        const description  = safeOptStr(raw.description, MAX_MSG);
        if (SANDBOX) {
          return sandboxOk(
            `✅ Would update cost code "${existingCode}"` +
            (newCode      ? ` → "${newCode}"`                : "") +
            (category     ? `\n  Category: ${category}`      : "") +
            (description  ? `\n  Description: ${description}` : "")
          );
        }
        const result = await budgetPost("updateCostCode", { existingCode, newCode, category, description });
        return result.success
          ? ok(`✅ Cost code updated: "${existingCode}"${newCode ? ` → "${newCode}"` : ""}.`)
          : err(result.error);
      }

      // ── update_sub_bid ─────────────────────────────────────────────────────
      case "update_sub_bid": {
        const raw = args as Record<string, unknown>;
        const jobName      = safeStr(raw.jobName);
        const itemCode     = safeStr(raw.itemCode);
        const subBidAmount = safeNum(raw.subBidAmount);
        const vendorName   = safeOptStr(raw.vendorName);
        if (SANDBOX) {
          return sandboxOk(
            `✅ Would set sub bid for "${itemCode}" on "${jobName}": $${subBidAmount.toFixed(2)}` +
            (vendorName ? ` (${vendorName})` : "")
          );
        }
        const result = await budgetPost("updateSubBid", { jobName, itemCode, subBidAmount, vendorName });
        return result.success
          ? ok(`✅ Sub bid updated for "${itemCode}" on "${jobName}": $${subBidAmount.toFixed(2)}${vendorName ? ` (${vendorName})` : ""}.`)
          : err(result.error);
      }

      // ── mark_job_complete ──────────────────────────────────────────────────
      case "mark_job_complete": {
        const raw  = args as Record<string, unknown>;
        const jobName = safeStr(raw.jobName);
        const notes   = safeOptStr(raw.notes, MAX_MSG);
        const date    = safeOptStr(raw.completionDate) ?? new Date().toISOString().split("T")[0];
        if (SANDBOX) {
          return sandboxOk(
            `✅ Would mark "${jobName}" as complete on ${date}` +
            (notes ? `\n  Notes: ${notes}` : "")
          );
        }
        const result = await budgetPost("markJobComplete", { jobName, completionDate: date, notes });
        return result.success
          ? ok(`✅ Job "${jobName}" marked as completed on ${date}.`)
          : err(result.error);
      }

      // ── add_profit_draw ────────────────────────────────────────────────────
      case "add_profit_draw": {
        const raw         = args as Record<string, unknown>;
        const jobName     = safeStr(raw.jobName);
        const amount      = safeNum(raw.amount);
        const drawDate    = safeOptStr(raw.date) ?? new Date().toISOString().split("T")[0];
        const description = safeOptStr(raw.description, MAX_MSG) ?? "Profit draw";
        if (SANDBOX) {
          return sandboxOk(
            `✅ Would record profit draw of $${amount.toFixed(2)} on "${jobName}" on ${drawDate}\n  Description: ${description}`
          );
        }
        const result = await budgetPost("addProfitDraw", {
          jobName, amount, date: drawDate, description,
        });
        return result.success
          ? ok(`✅ Profit draw of $${amount.toFixed(2)} recorded for "${jobName}" on ${drawDate}.`)
          : err(result.error);
      }

      // ── create_calendar_event ──────────────────────────────────────────────
      case "create_calendar_event": {
        const raw             = args as Record<string, unknown>;
        const title           = safeStr(raw.title);
        const date            = safeStr(raw.date);
        const time            = safeOptStr(raw.time);
        const durationMinutes = raw.durationMinutes != null ? safeNum(raw.durationMinutes) : 60;
        const description     = safeOptStr(raw.description, MAX_MSG);
        const location        = safeOptStr(raw.location);
        if (SANDBOX) {
          return sandboxOk(
            `✅ Would create calendar event: "${title}" on ${date}` +
            (time     ? ` at ${time} (${durationMinutes} min)` : " (all-day)") +
            (location ? `\n  Location: ${location}`            : "") +
            (description ? `\n  Notes: ${description}`         : "")
          );
        }
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
    const isValidationError = e instanceof Error && (
      e.message.startsWith("Expected") ||
      e.message.startsWith("Value") ||
      e.message.includes("must be") ||
      e.message.includes("must not")
    );
    if (isValidationError) return err(e.message);
    console.error(`craftwell-mcp tool error [${name}]:`, e);
    return err("An internal error occurred. Check the MCP server logs for details.");
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────

async function main() {
  assertConfig();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
