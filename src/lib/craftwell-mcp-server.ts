/**
 * src/lib/craftwell-mcp-server.ts
 *
 * Shared MCP server logic for both the live (/api/mcp) and sandbox
 * (/api/mcp-sandbox) endpoints.  Pass sandbox=true to run every tool
 * against realistic mock data without touching any Google Sheet or
 * Apps Script endpoint.
 */

import { NextRequest, NextResponse } from "next/server";
import { Server }   from "@modelcontextprotocol/sdk/server/index.js";
import { WebStandardStreamableHTTPServerTransport }
  from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// ── Google Apps Script URLs (set in Netlify environment variables) ────────────

const BUDGET_URL = process.env.APPS_SCRIPT_URL ?? "";
const CRM_URL    = process.env.CRM_SCRIPT_URL  ?? "";

// ── CORS headers ──────────────────────────────────────────────────────────────

export const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin":  "https://claude.ai",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id, Last-Event-Id",
};

// ── Sandbox mock data ─────────────────────────────────────────────────────────

const SANDBOX_BANNER = "\n\n⚠️  [SANDBOX MODE — no real data was read or written]";

const SANDBOX_JOBS = [
  "SANDBOX - 1234 Demo Ave",
  "SANDBOX - 5678 Test Blvd",
  "SANDBOX - 9999 Sample Ct",
];

const SANDBOX_COST_CODES = [
  "Labor - Tile", "Labor - Demo", "Labor - Framing", "Labor - Paint",
  "Materials - Lumber", "Materials - Concrete", "Materials - Tile",
  "Subcontractor - Plumbing", "Subcontractor - HVAC", "Subcontractor - Electrical",
  "Equipment - Rental", "Permits & Fees",
];

const SANDBOX_LEADS = [
  { leadId: "CW-000001", clientName: "Test Client Alpha", rowIndex: 2,
    data: { "PIPELINE STAGE": "1 - New Lead", "CLIENT NAME": "Test Client Alpha",
            "PHONE": "817-555-0101", "ADDRESS": "1234 Demo Ave, Dallas TX 75201",
            "PROJECT DESCRIPTION": "Full kitchen remodel — cabinets, counters, tile" } },
  { leadId: "CW-000002", clientName: "Test Client Beta",  rowIndex: 3,
    data: { "PIPELINE STAGE": "3 - Walk Scheduled", "CLIENT NAME": "Test Client Beta",
            "PHONE": "214-555-0202", "ADDRESS": "5678 Test Blvd, Fort Worth TX 76102",
            "PROJECT DESCRIPTION": "Master bath remodel — shower, vanity, flooring" } },
  { leadId: "IP-000003", clientName: "Test Client Gamma", rowIndex: 4,
    data: { "PIPELINE STAGE": "5 - Estimate Delivered", "CLIENT NAME": "Test Client Gamma",
            "PHONE": "972-555-0303", "ADDRESS": "9999 Sample Ct, Arlington TX 76010",
            "PROJECT DESCRIPTION": "Second-story addition — 2 bedrooms and full bath" } },
];

const SANDBOX_BUDGET_HEADERS = ["Cost Code", "Budget", "Sub Bid", "Actual", "Committed", "Remaining"];
const SANDBOX_BUDGET_ROWS = [
  ["Labor - Tile",            "$4,500", "$0",     "$2,100", "$0",     "$2,400"],
  ["Materials - Tile",        "$3,200", "$0",     "$1,850", "$0",     "$1,350"],
  ["Subcontractor - Plumbing","$6,000", "$6,000", "$0",     "$6,000", "$0"   ],
  ["Permits & Fees",          "$1,200", "$0",     "$450",   "$0",     "$750" ],
  ["Electrical - Rough In",   "$3,200", "$0",     "$4,850", "$0",     "-$1,650"],
];

const SANDBOX_TX_HEADERS  = ["Date", "Cost Code", "Vendor", "Amount", "Description"];
const SANDBOX_TX_ROWS = [
  ["2026-07-01", "Labor - Tile",    "Joe's Tile Co", "$2,100.00", "Tile labor week 1"],
  ["2026-07-05", "Materials - Tile","Home Depot",    "$1,850.00", "Porcelain tile 200 sqft"],
  ["2026-07-08", "Permits & Fees",  "City of Dallas","$450.00",   "Building permit"],
];

function sandboxOk(text: string) {
  return { content: [{ type: "text" as const, text: text + SANDBOX_BANNER }] };
}

// ── Formula injection sanitizer ───────────────────────────────────────────────

function sanitizeSheetValue(v: unknown): string {
  const s = String(v ?? "");
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

async function budgetGet(action: string) {
  if (!BUDGET_URL) throw new Error("APPS_SCRIPT_URL is not configured.");
  const res = await fetch(`${BUDGET_URL}?action=${action}`, {
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Apps Script returned HTTP ${res.status}: ${res.statusText}`);
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
  if (!res.ok) throw new Error(`Apps Script returned HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

async function crmGet(action: string) {
  if (!CRM_URL) throw new Error("CRM_SCRIPT_URL is not configured.");
  const res = await fetch(`${CRM_URL}?action=${action}`, {
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Apps Script returned HTTP ${res.status}: ${res.statusText}`);
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
  if (!res.ok) throw new Error(`Apps Script returned HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

// ── Date helper ───────────────────────────────────────────────────────────────

const todayISO = () => todayISO();

// ── Tool response helpers ─────────────────────────────────────────────────────

function ok(text: string) {
  return { content: [{ type: "text" as const, text }] };
}
function fail(text: string) {
  return { content: [{ type: "text" as const, text: `❌ ${text}` }], isError: true };
}

// ── Table formatter ───────────────────────────────────────────────────────────

function formatTable(headers: string[], rows: string[][]): string {
  const colWidths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map(r => String(r[i] ?? "").length))
  );
  const fmt    = (row: string[]) => row.map((cell, i) => String(cell ?? "").padEnd(colWidths[i])).join("  |  ");
  const divider = colWidths.map(w => "-".repeat(w)).join("--+--");
  return [fmt(headers), divider, ...rows.map(fmt)].join("\n");
}

// ── Fuzzy job name resolver ───────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

async function resolveJobName(input: string, sandbox: boolean): Promise<string> {
  const jobs: string[] = sandbox
    ? SANDBOX_JOBS
    : (await budgetGet("getDropdownData")).jobs ?? [];

  if (!jobs.length) throw new Error("No jobs found in spreadsheet.");

  if (jobs.includes(input)) return input;

  const lower  = input.toLowerCase();
  const normIn = normalize(input);

  const ci = jobs.find(j => j.toLowerCase() === lower);
  if (ci) return ci;

  const norm = jobs.find(j => normalize(j) === normIn);
  if (norm) return norm;

  const words      = normIn.split(" ").filter(w => w.length > 1);
  const sub        = jobs.filter(j => j.toLowerCase().includes(lower));
  const rev        = jobs.filter(j => lower.includes(j.toLowerCase()));
  const wordMatch  = jobs.filter(j => { const nj = normalize(j); return words.every(w => nj.includes(w)); });
  const candidates = [...new Set([...sub, ...rev, ...wordMatch])];

  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1) {
    throw new Error(`"${input}" matches multiple jobs: ${candidates.slice(0, 6).join(", ")}. Please be more specific.`);
  }

  const anyWord = jobs.filter(j => words.some(w => normalize(j).includes(w))).slice(0, 5);
  const hint = anyWord.length
    ? ` Similar jobs: ${anyWord.join(", ")}`
    : ` Available jobs: ${jobs.slice(0, 8).join(", ")}`;
  throw new Error(`Job "${input}" not found.${hint}`);
}

// ── Budget warning type ───────────────────────────────────────────────────────

interface BudgetWarning {
  itemCode: string;
  budgeted: number;
  actual:   number;
  overBy:   number;
}

// ── Build MCP server ──────────────────────────────────────────────────────────

export function buildServer(sandbox: boolean) {
  const server = new Server(
    { name: "craftwell", version: "1.3.0" },
    { capabilities: { tools: {} } }
  );

  // ── Tool definitions ────────────────────────────────────────────────────────

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [

      // ── READ ────────────────────────────────────────────────────────────────
      {
        name: "list_jobs",
        description:
          "CRAFTWELL (Google Sheets) — List all construction job names in the Craftwell Budget " +
          "spreadsheet. Use this, NOT any QuickBooks tool, when the user asks what jobs or projects " +
          "exist in Craftwell.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "list_cost_codes",
        description:
          "CRAFTWELL (Google Sheets) — List all available cost codes from the Craftwell Cost Codes " +
          "sheet. These are construction categories like 'Labor - Tile' or 'Subcontractor - HVAC', " +
          "NOT QuickBooks products or chart-of-accounts items.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "list_crm_leads",
        description:
          "CRAFTWELL CRM (Google Sheets) — List all active leads from the Craftwell CRM sheet. " +
          "Active means not Completed, Dead, or Lost. Use this, NOT QuickBooks customer tools, " +
          "when the user asks about Craftwell leads or prospects.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "get_job_budget",
        description:
          "CRAFTWELL (Google Sheets) — Return the current budget table for a Craftwell job — cost " +
          "codes, budgeted amounts, sub/vendor bids, actuals, and remaining balance. " +
          "Use this, NOT QuickBooks reports, for Craftwell job budget status. " +
          "Always check this before entering transactions. " +
          "Accepts partial addresses (e.g. '11302 Goddard' matches '11302 Goddard CT').",
        inputSchema: {
          type: "object",
          required: ["jobName"],
          properties: {
            jobName: {
              type: "string",
              description: "Job name or partial address — the system will find the best match",
            },
          },
        },
      },
      {
        name: "get_job_transactions",
        description:
          "CRAFTWELL (Google Sheets) — List all expense transactions recorded on a Craftwell job in " +
          "Google Sheets — date, cost code, vendor, amount, and description. Optionally filter to a " +
          "single cost code. Use this, NOT QuickBooks invoice tools, when looking up expenses on a " +
          "specific Craftwell job.",
        inputSchema: {
          type: "object",
          required: ["jobName"],
          properties: {
            jobName:  { type: "string", description: "Job name or partial address — partial match is OK" },
            itemCode: { type: "string", description: "Filter to a specific cost code (optional)" },
          },
        },
      },

      // ── CRM ─────────────────────────────────────────────────────────────────
      {
        name: "create_lead",
        description:
          "CRAFTWELL CRM (Google Sheets) — Create a new construction lead in the Craftwell CRM sheet. " +
          "This is for construction prospects, NOT a QuickBooks customer. Use this when adding a new " +
          "potential client or project inquiry to the Craftwell pipeline. " +
          "Lead ID is auto-generated (CW- or IP- prefix based on pipeline stage).",
        inputSchema: {
          type: "object",
          properties: {
            fields: {
              type: "object",
              description:
                "Column header → value pairs for the Craftwell CRM sheet. Use exact column names " +
                "(e.g. {'CLIENT NAME': 'John Smith', 'PIPELINE STAGE': '1 - New Lead', " +
                "'PHONE': '817-555-0100', 'ADDRESS': '123 Main St', 'CITY': 'Dallas', " +
                "'PROJECT DESCRIPTION': 'Kitchen remodel', 'LEAD SOURCE': 'Referral'}). " +
                "Lead ID is always auto-generated.",
              additionalProperties: { type: "string" },
            },
          },
        },
      },
      {
        name: "update_lead",
        description:
          "CRAFTWELL CRM (Google Sheets) — Update an existing Craftwell lead by Lead ID " +
          "(e.g. 'CW-264009'). This updates Google Sheets, NOT QuickBooks. " +
          "Only provided fields change. " +
          "Pipeline stage values: '1 - New Lead', '3 - Walk Scheduled', '5 - Estimate Delivered', " +
          "'9 - Closed Won', '10 - Closed Lost', '12 - Contract signed', '15 - Project Completed'.",
        inputSchema: {
          type: "object",
          required: ["leadId"],
          properties: {
            leadId: { type: "string", description: "Craftwell Lead ID (e.g. 'CW-264009')" },
            fields: {
              type: "object",
              description:
                "Fields to update. Examples: {'PIPELINE STAGE': '12 - Contract signed'} to mark sold, " +
                "{'PIPELINE STAGE': '10 - Closed Lost'} to mark lost, " +
                "{'DATE ESTIMATE DELIVERED': '2026-07-15', 'PIPELINE STAGE': '5 - Estimate Delivered'} after sending estimate.",
              additionalProperties: { type: "string" },
            },
          },
        },
      },

      // ── CALENDAR ─────────────────────────────────────────────────────────────
      {
        name: "create_calendar_event",
        description:
          "CRAFTWELL — Create a Google Calendar event in the Craftwell Projects calendar. " +
          "Use for site walks, pre-construction meetings, and project milestones. " +
          "This creates a Craftwell calendar event, NOT a QuickBooks transaction.",
        inputSchema: {
          type: "object",
          required: ["title", "date"],
          properties: {
            title:           { type: "string", description: "Event title (e.g. 'Site Walk – John Smith – 123 Main St')" },
            date:            { type: "string", description: "Date as YYYY-MM-DD" },
            time:            { type: "string", description: "Start time in 24-hour format HH:MM (e.g. '09:00'). Omit for all-day event." },
            durationMinutes: { type: "number", description: "Duration in minutes (default: 60)" },
            description:     { type: "string", description: "Event notes or description" },
            location:        { type: "string", description: "Address or location" },
          },
        },
      },

      // ── BUDGET ───────────────────────────────────────────────────────────────
      {
        name: "create_job",
        description:
          "CRAFTWELL (Google Sheets) — Create a new construction job in the Craftwell Budget " +
          "spreadsheet. Copies the Template sheet, fills in details, and optionally writes budget " +
          "allocation. Use this, NOT any QuickBooks invoice or project tool, when setting up a new " +
          "Craftwell job. For multiple projects at same address use 'Address - Room' format " +
          "(e.g. '7343 Edgerton - Kitchen').",
        inputSchema: {
          type: "object",
          required: ["jobName", "clientName", "address"],
          properties: {
            jobName:         { type: "string", description: "Name for the job tab (e.g. '841 Villa Ridge')" },
            clientName:      { type: "string", description: "Client full name" },
            address:         { type: "string", description: "Job site address" },
            scopeOfWork:     { type: "string", description: "Description of the work" },
            contractValue:   { type: "number", description: "Contract value in dollars" },
            operatingBudget: { type: "number", description: "Operating budget in dollars" },
            startingMargin:  { type: "number", description: "Starting margin as a percentage (e.g. 20 for 20%)" },
            budgetLines: {
              type: "array",
              description: "Initial cost-code budget allocation. Leave empty to add lines later with add_budget_lines.",
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
        description:
          "CRAFTWELL (Google Sheets) — Adds rows to the Craftwell Google Sheets budget table — " +
          "NOT a QuickBooks journal entry or budget. " +
          "Use list_cost_codes to see available codes first.",
        inputSchema: {
          type: "object",
          required: ["jobName", "budgetLines"],
          properties: {
            jobName: { type: "string", description: "Job name or partial address — partial match is OK" },
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
        name: "add_transactions",
        description:
          "CRAFTWELL (Google Sheets) — Record expense transactions against a Craftwell construction " +
          "job in Google Sheets. This writes to Google Sheets, NOT to QuickBooks. Use this when the " +
          "user says 'add expenses', 'record a receipt', 'log costs', or 'input a transaction' for a " +
          "Craftwell job. Use negative amounts for credits/returns. You will be ALERTED (not blocked) " +
          "if a transaction causes a cost code to go over budget. " +
          "IMPORTANT: Before calling this tool, call get_job_transactions to check whether the same " +
          "transaction already exists (same amount, vendor, date, cost code). When reading a receipt " +
          "with multiple line items, record each item at its own amount, NOT the receipt total " +
          "repeated. Never extract numbers from product names or SKUs as amounts.",
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
                  itemCode:    { type: "string", description: "Craftwell cost code for this expense" },
                  amount:      { type: "number", description: "Dollar amount (negative = credit/return)" },
                  vendor:      { type: "string", description: "Vendor name (e.g. 'Home Depot')" },
                  date:        { type: "string", description: "YYYY-MM-DD, defaults to today" },
                  description: { type: "string", description: "Short description of the expense" },
                },
              },
            },
          },
        },
      },

      // ── COST CODE MANAGEMENT ─────────────────────────────────────────────────
      {
        name: "add_cost_code",
        description:
          "CRAFTWELL (Google Sheets) — Add a new construction cost code to the Craftwell Cost Codes " +
          "sheet. Use when a needed code does not exist. These are Craftwell-specific categories, " +
          "NOT QuickBooks products or accounts.",
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
          "rename it, change its category, or update its description. For Craftwell cost codes only, " +
          "NOT QuickBooks products or accounts.",
        inputSchema: {
          type: "object",
          required: ["existingCode"],
          properties: {
            existingCode: { type: "string", description: "Current name of the Craftwell cost code to edit" },
            newCode:      { type: "string", description: "New name for the cost code (leave blank to keep current)" },
            category:     { type: "string", description: "New category" },
            description:  { type: "string", description: "New description" },
          },
        },
      },

      // ── SUB BID ──────────────────────────────────────────────────────────────
      {
        name: "update_sub_bid",
        description:
          "CRAFTWELL (Google Sheets) — Updates the sub bid cell in the Craftwell Google Sheets budget " +
          "— NOT a QuickBooks vendor bill or purchase order. " +
          "Fill in the negotiated vendor or sub-contractor bid amount for a cost code on an existing " +
          "Craftwell job. ONLY call this when you have a formal quote or bid BEFORE work begins " +
          "(e.g. a plumber quoting $3,500 for rough-in work). NEVER call this for store receipts, " +
          "material purchases, or any expense that should go in add_transactions. " +
          "subBidAmount must be a dollar figure from a bid — never a SKU or product name number.",
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

      // ── JOB LIFECYCLE ────────────────────────────────────────────────────────
      {
        name: "mark_job_complete",
        description:
          "CRAFTWELL (Google Sheets) — Marks the job complete in Google Sheets only — NOT a QuickBooks " +
          "transaction. Use when the project is finished to update the budget sheet summary section.",
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
        description:
          "CRAFTWELL (Google Sheets) — Records the draw in Google Sheets — NOT a QuickBooks owner " +
          "equity withdrawal entry. Use to record a profit draw taken from a Craftwell job before " +
          "project close. IMPORTANT: Always record draws so you know your true remaining profit at " +
          "final accounting.",
        inputSchema: {
          type: "object",
          required: ["jobName", "amount"],
          properties: {
            jobName:     { type: "string", description: "Job name or partial address — partial match is OK" },
            amount:      { type: "number", description: "Draw amount in dollars (positive number)" },
            date:        { type: "string", description: "Date as YYYY-MM-DD (defaults to today)" },
            description: { type: "string", description: "Reason for the draw (e.g. 'Personal draw - covering expenses')" },
          },
        },
      },
    ],
  }));

  // ── Tool handlers ───────────────────────────────────────────────────────────

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    try {
      switch (name) {

        // ── list_jobs ────────────────────────────────────────────────────────
        case "list_jobs": {
          if (sandbox) {
            return sandboxOk(`${SANDBOX_JOBS.length} jobs (mock):\n\n${SANDBOX_JOBS.join("\n")}`);
          }
          const data = await budgetGet("getDropdownData");
          const jobs: string[] = data.jobs ?? [];
          return ok(jobs.length ? `${jobs.length} jobs:\n\n${jobs.join("\n")}` : "No jobs found.");
        }

        // ── list_cost_codes ──────────────────────────────────────────────────
        case "list_cost_codes": {
          if (sandbox) {
            return sandboxOk(`${SANDBOX_COST_CODES.length} cost codes (mock):\n\n${SANDBOX_COST_CODES.join("\n")}`);
          }
          const data  = await budgetGet("getDropdownData");
          const codes = (data.costCodes ?? []).map((c: { code: string }) => c.code);
          return ok(codes.length ? `${codes.length} cost codes:\n\n${codes.join("\n")}` : "No cost codes found.");
        }

        // ── list_crm_leads ───────────────────────────────────────────────────
        case "list_crm_leads": {
          if (sandbox) {
            const lines = SANDBOX_LEADS.map(l =>
              `${l.leadId}  |  ${(l.data["PIPELINE STAGE"]).padEnd(30)}  |  ${l.clientName}`
            );
            return sandboxOk(`${SANDBOX_LEADS.length} active leads (mock):\n\n${lines.join("\n")}`);
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

        // ── get_job_budget ───────────────────────────────────────────────────
        case "get_job_budget": {
          const { jobName: jobInput } = args as { jobName: string };
          const jobName = await resolveJobName(jobInput, sandbox);
          if (sandbox) {
            return sandboxOk(
              `Budget for "${jobName}" (mock):\n\n` +
              formatTable(SANDBOX_BUDGET_HEADERS, SANDBOX_BUDGET_ROWS)
            );
          }
          const data = await budgetGet(`getJobBudget&jobName=${encodeURIComponent(jobName)}`);
          if (data.error) return fail(data.error);
          const { headers = [], rows = [] } = data;
          if (!rows.length) return ok(`No budget lines found for "${jobName}".`);
          return ok(`Budget for "${jobName}":\n\n` + formatTable(headers as string[], rows as string[][]));
        }

        // ── get_job_transactions ─────────────────────────────────────────────
        case "get_job_transactions": {
          const { jobName: jobInput, itemCode } = args as { jobName: string; itemCode?: string };
          const jobName = await resolveJobName(jobInput, sandbox);
          if (sandbox) {
            const rows = SANDBOX_TX_ROWS.filter(r => !itemCode || r[1] === itemCode);
            if (!rows.length) {
              return sandboxOk(
                itemCode
                  ? `No transactions found for "${itemCode}" on "${jobName}" (mock).`
                  : `No transactions found for "${jobName}" (mock).`
              );
            }
            const title = itemCode
              ? `Transactions for "${itemCode}" on "${jobName}" — ${rows.length} row(s) (mock):`
              : `Transactions for "${jobName}" — ${rows.length} row(s) (mock):`;
            return sandboxOk(`${title}\n\n` + formatTable(SANDBOX_TX_HEADERS, rows));
          }
          let action = `getJobTransactions&jobName=${encodeURIComponent(jobName)}`;
          if (itemCode) action += `&itemCode=${encodeURIComponent(itemCode)}`;
          const data = await budgetGet(action);
          if (data.error) return fail(data.error ?? "Unknown error from Apps Script.");
          const { headers = [], rows = [] } = data;
          if (!rows.length) {
            return ok(itemCode
              ? `No transactions found for "${itemCode}" on "${jobName}".`
              : `No transactions found for "${jobName}".`);
          }
          const title = itemCode
            ? `Transactions for "${itemCode}" on "${jobName}" (${(rows as string[][]).length} rows):`
            : `Transactions for "${jobName}" (${(rows as string[][]).length} rows):`;
          return ok(`${title}\n\n` + formatTable(headers as string[], rows as string[][]));
        }

        // ── create_lead ──────────────────────────────────────────────────────
        case "create_lead": {
          const { fields = {} } = args as { fields?: Record<string, string> };
          if (sandbox) {
            const mockId  = `CW-${Math.floor(Math.random() * 900_000 + 100_000)}`;
            const summary = Object.entries(fields).map(([k, v]) => `  ${k}: ${v}`).join("\n");
            return sandboxOk(`✅ Would create lead ${mockId}:\n\n${summary || "  (no fields provided)"}`);
          }
          const sanitizedFields = Object.fromEntries(
            Object.entries(fields).map(([k, v]) => [k, sanitizeSheetValue(v)])
          );
          const result = await crmPost("addLead", { fields: sanitizedFields });
          return result.success
            ? ok(`✅ ${result.message}\nLead ID: ${result.leadId}`)
            : fail(result.error ?? "Unknown error from Apps Script.");
        }

        // ── update_lead ──────────────────────────────────────────────────────
        case "update_lead": {
          const { leadId, fields = {} } = args as { leadId: string; fields?: Record<string, string> };
          if (sandbox) {
            const lead = SANDBOX_LEADS.find(l => l.leadId.toUpperCase() === leadId.toUpperCase());
            if (!lead) {
              return fail(`Lead "${leadId}" not found in sandbox. Available: ${SANDBOX_LEADS.map(l => l.leadId).join(", ")}`);
            }
            const summary = Object.entries(fields).map(([k, v]) => `  ${k}: ${v}`).join("\n");
            return sandboxOk(`✅ Would update lead "${leadId}":\n\n${summary || "  (no fields provided)"}`);
          }
          const data = await crmGet("getCrmData");
          const lead = (data.crmLeads ?? []).find(
            (l: { leadId: string }) => l.leadId.toUpperCase() === leadId.toUpperCase()
          );
          if (!lead) {
            const ids = (data.crmLeads ?? []).map((l: { leadId: string }) => l.leadId).join(", ");
            return fail(`Lead "${leadId}" not found. Available: ${ids || "none"}`);
          }
          const sanitizedFields = Object.fromEntries(
            Object.entries(fields).map(([k, v]) => [k, sanitizeSheetValue(v)])
          );
          const result = await crmPost("updateLead", { rowIndex: lead.rowIndex, fields: sanitizedFields });
          return result.success ? ok(`✅ ${result.message}`) : fail(result.error ?? "Unknown error from Apps Script.");
        }

        // ── create_calendar_event ────────────────────────────────────────────
        case "create_calendar_event": {
          const { title, date, time, durationMinutes = 60, description, location } = args as {
            title: string; date: string; time?: string;
            durationMinutes?: number; description?: string; location?: string;
          };
          if (sandbox) {
            return sandboxOk(
              `✅ Would create calendar event: "${title}" on ${date}` +
              (time     ? ` at ${time} (${durationMinutes} min)` : " (all-day)") +
              (location ? `\n  Location: ${location}`            : "") +
              (description ? `\n  Notes: ${description}`         : "") +
              `\n  Event link: https://calendar.google.com/calendar/r/eventedit/sandbox-mock-event`
            );
          }
          const result = await budgetPost("createCalendarEvent", {
            title, date, time, durationMinutes, description, location,
          });
          return result.success
            ? ok(`✅ Calendar event created: "${title}" on ${date}${time ? ` at ${time}` : ""}\n${result.eventUrl ? `Event link: ${result.eventUrl}` : ""}`)
            : fail(result.error ?? "Unknown error from Apps Script.");
        }

        // ── create_job ───────────────────────────────────────────────────────
        case "create_job": {
          const { jobName, clientName, address, scopeOfWork, contractValue, operatingBudget, startingMargin } =
            args as {
              jobName: string; clientName: string; address: string;
              scopeOfWork?: string; contractValue?: number;
              operatingBudget?: number; startingMargin?: number;
            };
          if (sandbox) {
            return sandboxOk(
              `✅ Would create job "${jobName}" for ${clientName} at ${address}` +
              (contractValue   ? `\n  Contract value:   $${contractValue.toLocaleString()}`   : "") +
              (operatingBudget ? `\n  Operating budget: $${operatingBudget.toLocaleString()}` : "") +
              (startingMargin  ? `\n  Starting margin:  ${startingMargin}%`                   : "") +
              (scopeOfWork     ? `\n  Scope: ${scopeOfWork}`                                  : "")
            );
          }
          const result = await budgetPost("createJob", args as Record<string, unknown>);
          return result.success ? ok(`✅ ${result.message}`) : fail(result.error ?? "Unknown error from Apps Script.");
        }

        // ── add_budget_lines ─────────────────────────────────────────────────
        case "add_budget_lines": {
          const { jobName: jobInput, budgetLines } = args as {
            jobName: string;
            budgetLines: Array<{ itemCode: string; budget: number }>;
          };
          const jobName = await resolveJobName(jobInput, sandbox);
          if (sandbox) {
            const lines = budgetLines.map(bl => `  ${bl.itemCode}: $${bl.budget.toFixed(2)}`);
            return sandboxOk(
              `✅ Would add ${budgetLines.length} budget line(s) to "${jobName}":\n\n${lines.join("\n")}`
            );
          }
          const result = await budgetPost("addBudgetLines", { jobName, budgetLines });
          return result.success ? ok(`✅ ${result.message}`) : fail(result.error ?? "Unknown error from Apps Script.");
        }

        // ── add_transactions ─────────────────────────────────────────────────
        case "add_transactions": {
          const { jobName: jobInput, transactions } = args as {
            jobName: string;
            transactions: Array<Record<string, unknown>>;
          };
          const jobName = await resolveJobName(jobInput, sandbox);
          const today   = todayISO();

          if (sandbox) {
            const txWithDate = transactions.map(tx => ({ date: today, ...tx } as Record<string, unknown>));
            const lines = txWithDate.map(tx =>
              `  ${tx["date"]}  ${tx["itemCode"]}  $${Number(tx["amount"]).toFixed(2)}` +
              (tx["vendor"]      ? `  (${tx["vendor"]})`      : "") +
              (tx["description"] ? `  — ${tx["description"]}` : "")
            );
            // Simulate an over-budget warning for testing purposes when amount > 5000
            const bigTx = transactions.find(tx => Number(tx.amount) > 5_000);
            let msg = `✅ Would record ${transactions.length} transaction(s) on "${jobName}":\n\n${lines.join("\n")}`;
            if (bigTx) {
              msg += "\n\n⚠️  OVER-BUDGET ALERT (simulated) — transaction exceeds $5,000 threshold for demo purposes.";
            }
            return sandboxOk(msg);
          }

          const txWithDate = transactions.map(tx => ({ date: today, ...tx }));
          const result = await budgetPost("addTransactions", { jobName, transactions: txWithDate });
          if (!result.success) return fail(result.error ?? "Unknown error from Apps Script.");

          let msg = `✅ ${result.message}`;
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

        // ── add_cost_code ────────────────────────────────────────────────────
        case "add_cost_code": {
          const { code, category, description } = args as {
            code: string; category?: string; description?: string;
          };
          if (sandbox) {
            return sandboxOk(
              `✅ Would add cost code "${code}"` +
              (category    ? ` (Category: ${category})`        : "") +
              (description ? `\n  Description: ${description}` : "")
            );
          }
          const result = await budgetPost("addCostCode", { code, category, description });
          return result.success ? ok(`✅ Cost code "${code}" added successfully.`) : fail(result.error ?? "Unknown error from Apps Script.");
        }

        // ── update_cost_code ─────────────────────────────────────────────────
        case "update_cost_code": {
          const { existingCode, newCode, category, description } = args as {
            existingCode: string; newCode?: string; category?: string; description?: string;
          };
          if (sandbox) {
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
            : fail(result.error ?? "Unknown error from Apps Script.");
        }

        // ── update_sub_bid ───────────────────────────────────────────────────
        case "update_sub_bid": {
          const { jobName: jobInput, itemCode, subBidAmount, vendorName } = args as {
            jobName: string; itemCode: string; subBidAmount: number; vendorName?: string;
          };
          const jobName = await resolveJobName(jobInput, sandbox);
          if (sandbox) {
            return sandboxOk(
              `✅ Would set sub bid for "${itemCode}" on "${jobName}": $${subBidAmount.toFixed(2)}` +
              (vendorName ? ` (${vendorName})` : "")
            );
          }
          const result = await budgetPost("updateSubBid", { jobName, itemCode, subBidAmount, vendorName });
          return result.success
            ? ok(`✅ Sub bid updated for "${itemCode}" on "${jobName}": $${subBidAmount.toFixed(2)}${vendorName ? ` (${vendorName})` : ""}.`)
            : fail(result.error ?? "Unknown error from Apps Script.");
        }

        // ── mark_job_complete ────────────────────────────────────────────────
        case "mark_job_complete": {
          const { jobName: jobInput, completionDate, notes } = args as {
            jobName: string; completionDate?: string; notes?: string;
          };
          const jobName = await resolveJobName(jobInput, sandbox);
          const date    = completionDate ?? todayISO();
          if (sandbox) {
            return sandboxOk(
              `✅ Would mark "${jobName}" as complete on ${date}` +
              (notes ? `\n  Notes: ${notes}` : "")
            );
          }
          const result = await budgetPost("markJobComplete", { jobName, completionDate: date, notes });
          return result.success
            ? ok(`✅ Job "${jobName}" marked as completed on ${date}.`)
            : fail(result.error ?? "Unknown error from Apps Script.");
        }

        // ── add_profit_draw ──────────────────────────────────────────────────
        case "add_profit_draw": {
          const { jobName: jobInput, amount, date, description } = args as {
            jobName: string; amount: number; date?: string; description?: string;
          };
          const jobName  = await resolveJobName(jobInput, sandbox);
          const drawDate = date ?? todayISO();
          if (sandbox) {
            return sandboxOk(
              `✅ Would record profit draw of $${amount.toFixed(2)} on "${jobName}" on ${drawDate}\n` +
              `  Description: ${description ?? "Profit draw"}`
            );
          }
          const result = await budgetPost("addProfitDraw", {
            jobName, amount, date: drawDate, description: description ?? "Profit draw",
          });
          return result.success
            ? ok(`✅ Profit draw of $${amount.toFixed(2)} recorded for "${jobName}" on ${drawDate}.`)
            : fail(result.error ?? "Unknown error from Apps Script.");
        }

        default:
          return fail(`Unknown tool: ${name}`);
      }

    } catch (e) {
      if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) {
        if (name === "create_job") {
          return fail(
            "⏳ Job creation is taking longer than expected (Google Sheets template copy can exceed 60s). " +
            "Check your spreadsheet — the job tab may already be there. If not, wait 30 seconds and retry."
          );
        }
        return fail("Request timed out waiting for Google Apps Script. The script may be cold-starting — wait 30 seconds and try again.");
      }
      return fail(e instanceof Error ? e.message : String(e));
    }
  });

  return server;
}

// ── Shared HTTP handler ───────────────────────────────────────────────────────

export async function createMcpHandler(req: NextRequest, sandbox: boolean): Promise<NextResponse> {
  try {
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse:  true,
    });

    const server = buildServer(sandbox);
    await server.connect(transport);

    const response = await transport.handleRequest(req);

    const headers = new Headers(response.headers);
    Object.entries(CORS).forEach(([k, v]) => headers.set(k, v));

    return new NextResponse(response.body, { status: response.status, headers });
  } catch (err) {
    console.error("[MCP] Unhandled error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: CORS });
  }
}
