"use client";

import { useState, useEffect } from "react";

// ── Types ──────────────────────────────────────────────────────────────────
type CostCode   = { code: string; description: string };
type TxRow      = { itemCode: string; amount: string; vendor: string; date: string; description: string; paymentMethod: string };
type BudgetLine = { itemCode: string; budget: string };
type CrmLead    = { rowIndex: number; leadId: string; clientName: string; address: string; projectDesc: string; data: Record<string, string> };
type JobBudget  = { headers: string[]; rows: string[][]; scopeOfWork?: string };
type SummaryRow = { jobName: string; values: string[] };

// ── Constants ──────────────────────────────────────────────────────────────
// Labels matching C2:C11 in each job sheet
const SUMMARY_LABELS = [
  "Client Name",      // C2
  "Address",          // C3
  "Scope of Work",    // C4
  "Sold Date",        // C5
  "Completed Date",   // C6
  "Contract Value",   // C7
  "Operating Budget", // C8
  "Starting Margin",  // C9
  "Current Spend",    // C10
  "Current Margin",   // C11
];
const SOLD_DATE_IDX   = 3; // 0-based index into values[] → C5
// Substring keywords — stages whose name CONTAINS any of these are hidden from Edit Lead.
// Handles prefixed stages like "15 - Project Completed" matching "COMPLETED".
const EXCLUDED_STAGE_KEYWORDS = ["COMPLETED", "DEAD", "LOST"];
const QUARTER_LABELS  = ["Q1 (Jan–Mar)", "Q2 (Apr–Jun)", "Q3 (Jul–Sep)", "Q4 (Oct–Dec)"];
const MONTH_NAMES     = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// Pipeline stage positions (1-based) that get IP- prefix (Contract Signed → Project Started).
// All other stages get CW- prefix.
const IP_STAGE_POSITIONS = [12, 13, 14];

// ── Helpers ────────────────────────────────────────────────────────────────
const today       = () => new Date().toISOString().split("T")[0];
const emptyRow    = (): TxRow      => ({ itemCode: "", amount: "", vendor: "", date: today(), description: "", paymentMethod: "" });
const emptyBudget = (): BudgetLine => ({ itemCode: "", budget: "" });

// ── QB Export helpers ─────────────────────────────────────────────────────
type QbTxRow = TxRow & { jobName: string };

const QB_ACCOUNT_MAP: Array<[string, string]> = [
  ["subcontract", "Subcontractors"],
  ["labor",       "Labor - Direct"],
  ["materials",   "Materials & Supplies"],
  ["equipment",   "Equipment Rental"],
];

function qboDate(d: string): string {
  const p = d ? d.split("-") : [];
  return p.length === 3 ? `${p[1]}/${p[2]}/${p[0]}` : d;
}

function qboAccount(itemCode: string): string {
  const c = itemCode.toLowerCase();
  const match = QB_ACCOUNT_MAP.find(([prefix]) => c.startsWith(prefix));
  return match ? match[1] : "Other Job Costs";
}

function csvCell(v: string | number): string {
  const s = String(v);
  return (s.includes(",") || s.includes('"') || s.includes("\n"))
    ? `"${s.replace(/"/g, '""')}"` : s;
}

function buildBillsCsv(txs: QbTxRow[], monthKey: string): string {
  const header = ["Bill No.", "Vendor", "Bill Date", "Due Date", "Type",
    "Category / Account", "Description", "Amount", "Customer / Project"]
    .map(csvCell).join(",");
  const lines = txs.map((tx, i) => [
    `CW-${monthKey}-${String(i + 1).padStart(3, "0")}`,
    tx.vendor || "",
    qboDate(tx.date),
    "",
    "Category",
    qboAccount(tx.itemCode),
    tx.description || tx.itemCode,
    Math.abs(parseFloat(tx.amount) || 0).toFixed(2),
    tx.jobName,
  ].map(csvCell).join(","));
  return [header, ...lines].join("\r\n");
}

function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Number formatters ──────────────────────────────────────────────────────
// Accounting: positives as $1,234.56 — negatives as ($1,234.56)
function fmtCurrency(val: string | number): string {
  const n = typeof val === "number" ? val : parseFloat(val);
  if (isNaN(n)) return String(val) || "—";
  const abs = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? `($${abs})` : `$${abs}`;
}
// Percentage: 20.5%
function fmtPercent(val: string): string {
  const n = parseFloat(val);
  if (isNaN(n)) return val || "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
}
// Format a summary cell by column index
const CURRENCY_COLS = [5, 6, 8]; // Contract Value, Operating Budget, Current Spend
const PERCENT_COLS  = [7, 9];    // Starting Margin, Current Margin
function fmtSummaryCell(ci: number, val: string): string {
  if (CURRENCY_COLS.includes(ci)) return fmtCurrency(val);
  if (PERCENT_COLS.includes(ci))  return fmtPercent(val);
  return val || "—";
}

// ── Shared style constants (module-level so they never cause re-mount) ─────
const inputClass = "w-full bg-white border border-cream-300 px-4 py-3 text-navy-500 text-sm focus:outline-none focus:border-tan-400 transition-colors";
const labelClass = "block text-navy-400 text-xs tracking-widest uppercase mb-2";

// ── CrmField ───────────────────────────────────────────────────────────────
// MUST live outside BudgetManager — if defined inside, every keystroke causes
// React to treat it as a new component type and unmount/remount the input.
type CrmFieldProps = {
  col:            string;
  value:          string;
  onChange:       (col: string, val: string) => void;
  pipelineStages: string[];
};

function CrmField({ col, value, onChange, pipelineStages }: CrmFieldProps) {
  const upper   = col.toUpperCase();
  const isStage = upper === "PIPELINE STAGE";
  const isDate  = upper.includes("DATE");
  const isWide  = upper.includes("DESCRIPTION") || upper.includes("NOTES") || upper.includes("SCOPE");

  return (
    <div className={isWide ? "sm:col-span-2" : ""}>
      <label className={labelClass}>{col}</label>
      {isStage ? (
        <select value={value} onChange={e => onChange(col, e.target.value)} className={inputClass}>
          <option value="">Select stage…</option>
          {pipelineStages.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      ) : isDate ? (
        <input type="date" value={value} onChange={e => onChange(col, e.target.value)} className={inputClass} />
      ) : (
        <input type="text" value={value} onChange={e => onChange(col, e.target.value)} className={inputClass} placeholder={col} />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function BudgetManager() {

  // ── Shared ────────────────────────────────────────────────────────────────
  const [loading,    setLoading]    = useState(true);
  const [loadError,  setLoadError]  = useState(false);
  const [jobs,       setJobs]       = useState<string[]>([]);
  const [costCodes,  setCostCodes]  = useState<CostCode[]>([]);
  const [activeTab,  setActiveTab]  = useState<"new-job" | "transaction" | "crm" | "summary" | "qb-export">("new-job");
  const [submitting, setSubmitting] = useState(false);
  const [result,     setResult]     = useState<{ success: boolean; message: string } | null>(null);

  // ── New Job ───────────────────────────────────────────────────────────────
  const [jobForm, setJobForm] = useState({
    jobName: "", clientName: "", address: "", scopeOfWork: "",
    contractValue: "", operatingBudget: "", startingMargin: "",
  });
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([emptyBudget()]);

  // ── Transactions ──────────────────────────────────────────────────────────
  const [selectedJob,   setSelectedJob]   = useState("");
  const [rows,          setRows]          = useState<TxRow[]>([emptyRow()]);
  const [jobBudget,     setJobBudget]     = useState<JobBudget | null>(null);
  const [budgetLoading, setBudgetLoading] = useState(false);

  // ── CRM ───────────────────────────────────────────────────────────────────
  const [crmSubTab,      setCrmSubTab]      = useState<"new-lead" | "edit-lead">("new-lead");
  const [crmLeads,       setCrmLeads]       = useState<CrmLead[]>([]);
  const [pipelineStages, setPipelineStages] = useState<string[]>([]);
  const [crmColumns,     setCrmColumns]     = useState<string[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [crmForm,        setCrmForm]        = useState<Record<string, string>>({});

  // ── Summary ───────────────────────────────────────────────────────────────
  const [summaryData,    setSummaryData]    = useState<SummaryRow[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [filterYear,     setFilterYear]     = useState("all");
  const [filterQuarter,  setFilterQuarter]  = useState("all");
  const [filterMonth,    setFilterMonth]    = useState("all");

  // ── QB Export ──────────────────────────────────────────────────────────────
  const [qbMonth,   setQbMonth]   = useState<string>(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [qbRawTx,   setQbRawTx]   = useState<QbTxRow[]>([]);
  const [qbLoading, setQbLoading] = useState(false);
  const [qbLoaded,  setQbLoaded]  = useState(false);

  // ── Computed ──────────────────────────────────────────────────────────────

  // Leads still in process — exclude completed/dead/lost from Edit Lead dropdown.
  // Uses substring match so "15 - Project Completed" is caught by "COMPLETED".
  const activeLeads = crmLeads.filter(l => {
    const stage = (l.data["PIPELINE STAGE"] || "").toUpperCase().trim();
    return !EXCLUDED_STAGE_KEYWORDS.some(kw => stage.includes(kw));
  });

  // CRM columns: drop Lead ID (auto-generated) and any "days to" calculated fields
  const editableCrmCols = crmColumns.filter(c =>
    c.toUpperCase() !== "LEAD ID" &&
    !c.toUpperCase().includes("DAYS TO")
  );

  // New lead IDs use IP- prefix (In Process)
  const previewLeadId = (() => {
    const now = new Date();
    const yy  = String(now.getFullYear()).slice(2);
    const mm  = String(now.getMonth() + 1).padStart(2, "0");
    const max = crmLeads.reduce((n, l) => {
      const m = l.leadId.match(/(?:CW|IP)-\d{4}(\d{3})/);
      return m ? Math.max(n, parseInt(m[1])) : n;
    }, 0);
    // Determine prefix based on selected pipeline stage position (1-based)
    const selectedStage = crmForm["PIPELINE STAGE"] || "";
    const stagePos      = selectedStage ? pipelineStages.indexOf(selectedStage) + 1 : 0;
    const prefix        = IP_STAGE_POSITIONS.includes(stagePos) ? "IP" : "CW";
    return `${prefix}-${yy}${mm}${String(max + 1).padStart(3, "0")}`;
  })();

  // Summary filter helpers
  const availableYears = [...new Set(
    summaryData
      .map(r => r.values[SOLD_DATE_IDX])
      .filter(Boolean)
      .map(d => { const y = new Date(d).getFullYear(); return isNaN(y) ? null : String(y); })
      .filter((y): y is string => y !== null)
  )].sort();

  const filteredSummary = summaryData.filter(row => {
    const ds = row.values[SOLD_DATE_IDX];
    if (!ds) return filterYear === "all" && filterQuarter === "all" && filterMonth === "all";
    const d = new Date(ds);
    if (isNaN(d.getTime())) return true;
    const yr = String(d.getFullYear());
    const mo = String(d.getMonth() + 1);
    const qt = String(Math.ceil((d.getMonth() + 1) / 3));
    if (filterYear    !== "all" && yr !== filterYear)    return false;
    if (filterQuarter !== "all" && qt !== filterQuarter) return false;
    if (filterMonth   !== "all" && mo !== filterMonth)   return false;
    return true;
  });

  // ── Load sheet data on mount ──────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/sheet-data")
      .then(r => r.json())
      .then(d => {
        setJobs(d.jobs || []);
        setCostCodes(d.costCodes || []);
        const leads: CrmLead[] = (d.crmLeads || []).map((l: CrmLead) => {
          const addrKey = Object.keys(l.data).find(k => k.toUpperCase().includes("ADDRESS")) || "";
          return { ...l, address: addrKey ? l.data[addrKey] : "" };
        });
        setCrmLeads(leads);
        setPipelineStages(d.pipelineStages || []);
        setCrmColumns(d.crmColumns || []);
        if (d.error) setLoadError(true);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  // Load summary data when Summary tab is first opened
  useEffect(() => {
    if (activeTab !== "summary") return;
    setSummaryLoading(true);
    fetch("/api/summary-data")
      .then(r => r.json())
      .then(d => setSummaryData(d.rows || []))
      .catch(() => {})
      .finally(() => setSummaryLoading(false));
  }, [activeTab]);

  // ── Field helpers ─────────────────────────────────────────────────────────
  const handleJobField = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setJobForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const updateRow        = (i: number, f: keyof TxRow,      v: string) => setRows(p => p.map((r, idx) => idx === i ? { ...r, [f]: v } : r));
  const addRow           = () => setRows(p => [...p, emptyRow()]);
  const removeRow        = (i: number) => setRows(p => p.filter((_, idx) => idx !== i));

  const updateBudget     = (i: number, f: keyof BudgetLine, v: string) => setBudgetLines(p => p.map((l, idx) => idx === i ? { ...l, [f]: v } : l));
  const addBudgetLine    = () => setBudgetLines(p => [...p, emptyBudget()]);
  const removeBudgetLine = (i: number) => setBudgetLines(p => p.filter((_, idx) => idx !== i));

  const updateCrmField   = (col: string, v: string) => setCrmForm(p => ({ ...p, [col]: v }));

  const handleLeadSelect = (leadId: string) => {
    setSelectedLeadId(leadId);
    const lead = crmLeads.find(l => l.leadId === leadId);
    if (lead) setCrmForm({ ...lead.data });
  };

  // Fetch committed cost table whenever job selection changes
  const handleJobSelect = async (jobName: string) => {
    setSelectedJob(jobName);
    setJobBudget(null);
    if (!jobName) return;
    setBudgetLoading(true);
    try {
      const res  = await fetch(`/api/job-budget?jobName=${encodeURIComponent(jobName)}`);
      const data = await res.json();
      if (!data.error) setJobBudget(data);
    } catch {}
    finally { setBudgetLoading(false); }
  };

  // ── Submit: New Job ───────────────────────────────────────────────────────
  const submitNewJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setResult(null);
    try {
      const res  = await fetch("/api/new-job", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...jobForm, budgetLines }),
      });
      const data = await res.json();
      setResult({ success: data.success, message: data.message || data.error });
      if (data.success) {
        setJobs(p => [...p, jobForm.jobName]);
        setJobForm({ jobName: "", clientName: "", address: "", scopeOfWork: "", contractValue: "", operatingBudget: "", startingMargin: "" });
        setBudgetLines([emptyBudget()]);
      }
    } catch { setResult({ success: false, message: "Network error. Try again." }); }
    finally  { setSubmitting(false); }
  };

  // ── Submit: Transactions ──────────────────────────────────────────────────
  const submitTransactions = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setResult(null);
    try {
      const res  = await fetch("/api/add-transactions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobName: selectedJob, transactions: rows }),
      });
      const data = await res.json();
      setResult({ success: data.success, message: data.message || data.error });
      if (data.success) setRows([emptyRow()]);
    } catch { setResult({ success: false, message: "Network error. Try again." }); }
    finally  { setSubmitting(false); }
  };

  // ── Submit: New Lead ──────────────────────────────────────────────────────
  const submitNewLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setResult(null);
    try {
      const res  = await fetch("/api/crm-lead", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "addLead", fields: crmForm }),
      });
      const data = await res.json();
      setResult({ success: data.success, message: data.message || data.error });
      if (data.success) {
        const addrKey = Object.keys(crmForm).find(k => k.toUpperCase().includes("ADDRESS")) || "";
        const newLead: CrmLead = {
          rowIndex:    -1,
          leadId:      data.leadId || previewLeadId,
          clientName:  crmForm["CLIENT NAME"]        || crmForm["Client Name"]        || "",
          address:     addrKey ? crmForm[addrKey]    : "",
          projectDesc: crmForm["PROJECT DESCRIPTION"] || crmForm["Project Description"] || "",
          data: { ...crmForm, "Lead ID": data.leadId || previewLeadId },
        };
        setCrmLeads(p => [...p, newLead]);
        setCrmForm({});
      }
    } catch { setResult({ success: false, message: "Network error. Try again." }); }
    finally  { setSubmitting(false); }
  };

  // ── Submit: Edit Lead ─────────────────────────────────────────────────────
  const submitEditLead = async (e: React.FormEvent) => {
    e.preventDefault();
    const lead = crmLeads.find(l => l.leadId === selectedLeadId);
    if (!lead) return;
    setSubmitting(true); setResult(null);
    try {
      const res  = await fetch("/api/crm-lead", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateLead", rowIndex: lead.rowIndex, fields: crmForm }),
      });
      const data = await res.json();
      setResult({ success: data.success, message: data.message || data.error });
      if (data.success) {
        setCrmLeads(p => p.map(l => l.leadId === selectedLeadId ? { ...l, data: { ...crmForm } } : l));
      }
    } catch { setResult({ success: false, message: "Network error. Try again." }); }
    finally  { setSubmitting(false); }
  };

  // ── QB Export: load all transactions across all jobs ──────────────────────
  const loadQbTransactions = async () => {
    setQbLoading(true); setQbLoaded(false);
    try {
      const results = await Promise.all(
        jobs.map(async (jobName) => {
          const res  = await fetch(`/api/job-transactions?jobName=${encodeURIComponent(jobName)}`);
          const data = await res.json();
          const txs: Record<string, string>[] = data.transactions || [];
          return txs.map(tx => ({
            itemCode:      tx.itemCode      || "",
            amount:        String(tx.amount || ""),
            vendor:        tx.vendor        || "",
            date:          tx.date          || "",
            description:   tx.description   || "",
            paymentMethod: tx.paymentMethod || "",
            jobName,
          }));
        })
      );
      setQbRawTx(results.flat());
      setQbLoaded(true);
    } catch { /* leave qbLoaded false so user sees load button again */ }
    finally  { setQbLoading(false); }
  };

  // ── Style shortcuts ───────────────────────────────────────────────────────
  const innerClass  = "w-full bg-cream-100 border border-cream-300 px-3 py-2 text-navy-500 text-sm focus:outline-none focus:border-tan-400 transition-colors";
  const addBtnClass = "text-xs tracking-wider px-4 py-2 border border-tan-500 text-tan-600 hover:bg-tan-500 hover:text-white transition-colors flex-shrink-0 ml-4";
  const submitClass = "w-full py-4 bg-navy-500 text-white text-sm tracking-widest uppercase hover:bg-tan-600 transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-cream-100">

      {/* Header */}
      <div className="bg-navy-500 px-6 py-5">
        <div className="max-w-5xl mx-auto">
          <p className="text-tan-300 text-xs tracking-[0.3em] uppercase mb-1">Craftwell Construction</p>
          <h1 className="text-white text-2xl font-semibold" style={{ fontFamily: "var(--font-playfair)" }}>
            Budget Manager
          </h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {loading && (
          <div className="text-center py-20">
            <p className="text-navy-400 text-sm tracking-wider animate-pulse">Loading spreadsheet data…</p>
          </div>
        )}

        {!loading && loadError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 text-sm mb-6">
            Could not connect to Google Sheets. Check the APPS_SCRIPT_URL environment variable and make sure the Apps Script is deployed.
          </div>
        )}

        {!loading && (
          <>
            {/* ── Main tabs ── */}
            <div className="flex border-b border-cream-300 mb-8 overflow-x-auto">
              {(["new-job", "transaction", "crm", "summary", "qb-export"] as const).map(tab => (
                <button key={tab} onClick={() => { setActiveTab(tab); setResult(null); }}
                  className={`px-5 py-3 text-xs tracking-widest uppercase font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab
                      ? "border-b-2 border-tan-500 text-tan-600"
                      : "text-navy-400 hover:text-navy-600"
                  }`}>
                  {tab === "new-job" ? "New Job" : tab === "transaction" ? "Add Transactions" : tab === "crm" ? "CRM" : tab === "summary" ? "Summary" : "QB Export"}
                </button>
              ))}
            </div>

            {/* Result banner */}
            {result && (
              <div className={`px-5 py-4 mb-6 text-sm border ${
                result.success
                  ? "bg-green-50 text-green-800 border-green-200"
                  : "bg-red-50 text-red-700 border-red-200"
              }`}>
                {result.message}
              </div>
            )}

            {/* ════════════════ NEW JOB ════════════════ */}
            {activeTab === "new-job" && (
              <form onSubmit={submitNewJob} className="space-y-6">
                <h2 className="text-navy-500 text-xl font-semibold" style={{ fontFamily: "var(--font-playfair)" }}>
                  Create New Job
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>Job Name (tab name) *</label>
                    <input name="jobName" required value={jobForm.jobName} onChange={handleJobField} className={inputClass} placeholder="e.g. Smith - Master Bath 2024" />
                  </div>
                  <div>
                    <label className={labelClass}>Client Name *</label>
                    <input name="clientName" required value={jobForm.clientName} onChange={handleJobField} className={inputClass} placeholder="Jane Smith" />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Job Address *</label>
                  <input name="address" required value={jobForm.address} onChange={handleJobField} className={inputClass} placeholder="1234 Main St, Dallas TX 75201" />
                </div>

                <div>
                  <label className={labelClass}>Scope of Work *</label>
                  <textarea name="scopeOfWork" required rows={3} value={jobForm.scopeOfWork} onChange={handleJobField}
                    className={`${inputClass} resize-none`} placeholder="Full master bathroom remodel…" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div>
                    <label className={labelClass}>Contract Value ($) *</label>
                    <input name="contractValue" type="number" min="0" step="0.01" required value={jobForm.contractValue} onChange={handleJobField} className={inputClass} placeholder="75000" />
                  </div>
                  <div>
                    <label className={labelClass}>Operating Budget ($) *</label>
                    <input name="operatingBudget" type="number" min="0" step="0.01" required value={jobForm.operatingBudget} onChange={handleJobField} className={inputClass} placeholder="60000" />
                  </div>
                  <div>
                    <label className={labelClass}>Starting Margin (%) *</label>
                    <input name="startingMargin" type="number" min="0" max="100" step="0.1" required value={jobForm.startingMargin} onChange={handleJobField} className={inputClass} placeholder="20" />
                  </div>
                </div>

                {/* ── Budget Allocation ── */}
                <div className="pt-2 border-t border-cream-300">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className={`${labelClass} mb-0`}>Initial Budget Allocation</p>
                      <p className="text-cream-500 text-xs mt-0.5">Cost codes and amounts — writes to columns B &amp; C starting at row 13</p>
                    </div>
                    <button type="button" onClick={addBudgetLine} className={addBtnClass}>+ Add Line</button>
                  </div>
                  <div className="space-y-3">
                    {budgetLines.map((line, i) => (
                      <div key={i} className="bg-white border border-cream-300 p-4">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-navy-400 text-xs font-semibold tracking-wider uppercase">Line {i + 1}</span>
                          {budgetLines.length > 1 && (
                            <button type="button" onClick={() => removeBudgetLine(i)} className="text-red-400 hover:text-red-600 text-xs tracking-wider uppercase transition-colors">Remove</button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-navy-400 text-xs tracking-wider uppercase mb-1">Cost Code *</label>
                            <select required value={line.itemCode} onChange={e => updateBudget(i, "itemCode", e.target.value)} className={innerClass}>
                              <option value="" disabled>Select…</option>
                              {costCodes.map(cc => <option key={cc.code} value={cc.code}>{cc.code}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-navy-400 text-xs tracking-wider uppercase mb-1">Budget Amount ($) *</label>
                            <input type="number" min="0" step="0.01" required value={line.budget} onChange={e => updateBudget(i, "budget", e.target.value)} className={innerClass} placeholder="0.00" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button type="submit" disabled={submitting} className={submitClass}>
                  {submitting ? "Creating Job…" : "Create New Job"}
                </button>
              </form>
            )}

            {/* ════════════════ TRANSACTIONS ════════════════ */}
            {activeTab === "transaction" && (
              <form onSubmit={submitTransactions} className="space-y-6">
                <h2 className="text-navy-500 text-xl font-semibold" style={{ fontFamily: "var(--font-playfair)" }}>
                  Add Transactions
                </h2>

                <div>
                  <label className={labelClass}>Select Job *</label>
                  <select required value={selectedJob} onChange={e => handleJobSelect(e.target.value)} className={inputClass}>
                    <option value="" disabled>Choose a job…</option>
                    {jobs.map(j => <option key={j} value={j}>{j}</option>)}
                  </select>
                </div>

                {/* ── Committed Cost Table ── */}
                {selectedJob && (
                  <div className="border border-cream-300 bg-white">
                    {/* Title — centered, job name + scope of work */}
                    <div className="px-4 py-3 border-b border-cream-200 bg-cream-50 text-center relative">
                      <p className="text-navy-500 text-xs tracking-widest uppercase font-semibold">
                        Committed Cost Budget — {selectedJob}
                        {jobBudget?.scopeOfWork ? ` | ${jobBudget.scopeOfWork}` : ""}
                      </p>
                      {budgetLoading && (
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-cream-500 text-xs animate-pulse">Loading…</span>
                      )}
                    </div>
                    {!budgetLoading && jobBudget && jobBudget.rows.length > 0 ? (() => {
                      // Column totals (sum numeric columns; col 0 is Category text)
                      const totals = jobBudget.headers.map((_, ci) => {
                        if (ci === 0) return "Total";
                        const sum = jobBudget.rows.reduce((acc, row) => {
                          const n = parseFloat(row[ci]);
                          return isNaN(n) ? acc : acc + n;
                        }, 0);
                        return fmtCurrency(sum);
                      });
                      return (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-navy-500/5 border-b border-cream-200">
                                {jobBudget.headers.map((h, i) => (
                                  <th key={i} className={`px-4 py-2 tracking-wider uppercase font-medium whitespace-nowrap ${i === 0 ? "text-left" : "text-right"} text-navy-400`}>
                                    {h || `Col ${i + 1}`}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {jobBudget.rows.map((row, ri) => (
                                <tr key={ri} className={`border-b border-cream-100 ${ri % 2 === 0 ? "bg-white" : "bg-cream-50"}`}>
                                  {row.map((cell, ci) => {
                                    const isNum = ci > 0 && cell !== "" && !isNaN(parseFloat(cell));
                                    const display = isNum ? fmtCurrency(cell) : (cell || "—");
                                    const color   = isNum && parseFloat(cell) < 0 ? "text-red-600" : "text-navy-500";
                                    return (
                                      <td key={ci} className={`px-4 py-2 whitespace-nowrap ${ci === 0 ? "text-left" : "text-right"} ${color}`}>
                                        {display}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                              {/* Totals row */}
                              <tr className="border-t-2 border-navy-300 bg-navy-500/5 font-semibold">
                                {totals.map((t, ci) => (
                                  <td key={ci} className={`px-4 py-2 whitespace-nowrap text-navy-500 ${ci === 0 ? "text-left text-xs tracking-wider uppercase" : "text-right"}`}>
                                    {t}
                                  </td>
                                ))}
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      );
                    })() : !budgetLoading ? (
                      <p className="text-cream-500 text-xs px-4 py-3">No budget data found for this job.</p>
                    ) : null}
                  </div>
                )}

                {/* ── Transaction Lines ── */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className={`${labelClass} mb-0`}>Transaction Lines</label>
                    <button type="button" onClick={addRow} className={addBtnClass}>+ Add Line</button>
                  </div>
                  <div className="space-y-3">
                    {rows.map((row, i) => (
                      <div key={i} className="bg-white border border-cream-300 p-4">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-navy-400 text-xs font-semibold tracking-wider uppercase">Line {i + 1}</span>
                          {rows.length > 1 && (
                            <button type="button" onClick={() => removeRow(i)} className="text-red-400 hover:text-red-600 text-xs tracking-wider uppercase transition-colors">Remove</button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <label className="block text-navy-400 text-xs tracking-wider uppercase mb-1">Item Code *</label>
                            <select required value={row.itemCode} onChange={e => updateRow(i, "itemCode", e.target.value)} className={innerClass}>
                              <option value="" disabled>Select cost code…</option>
                              {costCodes.map(cc => <option key={cc.code} value={cc.code}>{cc.code}{cc.description ? ` — ${cc.description}` : ""}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-navy-400 text-xs tracking-wider uppercase mb-1">Amount ($) *</label>
                            <input type="number" step="0.01" required value={row.amount}
                              onChange={e => updateRow(i, "amount", e.target.value)}
                              className={innerClass} placeholder="Negative for returns/credits" />
                          </div>
                          <div>
                            <label className="block text-navy-400 text-xs tracking-wider uppercase mb-1">Date *</label>
                            <input type="date" required value={row.date} onChange={e => updateRow(i, "date", e.target.value)} className={innerClass} />
                          </div>
                          <div>
                            <label className="block text-navy-400 text-xs tracking-wider uppercase mb-1">Vendor</label>
                            <input value={row.vendor} onChange={e => updateRow(i, "vendor", e.target.value)} className={innerClass} placeholder="Home Depot" />
                          </div>
                          <div>
                            <label className="block text-navy-400 text-xs tracking-wider uppercase mb-1">Description</label>
                            <input value={row.description} onChange={e => updateRow(i, "description", e.target.value)} className={innerClass} placeholder="Tile for master bath floor" />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-navy-400 text-xs tracking-wider uppercase mb-1">
                              Payment Method <span className="normal-case text-cream-500 tracking-normal">(required for subcontractor 1099 accuracy)</span>
                            </label>
                            <select value={row.paymentMethod} onChange={e => updateRow(i, "paymentMethod", e.target.value)} className={innerClass}>
                              <option value="">— Not specified —</option>
                              <option value="ACH / Bank Transfer">ACH / Bank Transfer</option>
                              <option value="Check">Check</option>
                              <option value="Credit Card">Credit Card</option>
                              <option value="Cash">Cash</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button type="submit" disabled={submitting} className={submitClass}>
                  {submitting ? "Submitting…" : `Submit ${rows.length} Transaction${rows.length !== 1 ? "s" : ""}`}
                </button>
              </form>
            )}

            {/* ════════════════ CRM ════════════════ */}
            {activeTab === "crm" && (
              <div className="space-y-6">
                <h2 className="text-navy-500 text-xl font-semibold" style={{ fontFamily: "var(--font-playfair)" }}>
                  Pipedrive CRM
                </h2>

                {/* CRM sub-tabs */}
                <div className="flex border-b border-cream-300">
                  {(["new-lead", "edit-lead"] as const).map(sub => (
                    <button key={sub}
                      onClick={() => { setCrmSubTab(sub); setResult(null); setCrmForm({}); setSelectedLeadId(""); }}
                      className={`px-5 py-2.5 text-xs tracking-widest uppercase font-medium transition-colors ${
                        crmSubTab === sub ? "border-b-2 border-tan-500 text-tan-600" : "text-navy-400 hover:text-navy-600"
                      }`}>
                      {sub === "new-lead" ? "New Lead" : "Edit Lead"}
                    </button>
                  ))}
                </div>

                {/* ── New Lead ── */}
                {crmSubTab === "new-lead" && (
                  <form onSubmit={submitNewLead} className="space-y-5">
                    <div className="flex items-center gap-3 bg-navy-500/10 border border-navy-300/30 px-4 py-3">
                      <span className="text-navy-400 text-xs tracking-widest uppercase">Lead ID</span>
                      <span className="text-navy-500 font-semibold text-sm font-mono">{previewLeadId}</span>
                      <span className="text-cream-500 text-xs">(auto-generated on submit)</span>
                    </div>

                    {editableCrmCols.length === 0 ? (
                      <p className="text-cream-500 text-sm py-4">
                        No CRM columns found. Make sure the &ldquo;Pipedrive CRM&rdquo; sheet exists and your Apps Script is deployed.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {editableCrmCols.map(col => (
                          <CrmField key={col} col={col} value={crmForm[col] || ""} onChange={updateCrmField} pipelineStages={pipelineStages} />
                        ))}
                      </div>
                    )}

                    <button type="submit" disabled={submitting} className={submitClass}>
                      {submitting ? "Creating Lead…" : "Create New Lead"}
                    </button>
                  </form>
                )}

                {/* ── Edit Lead ── */}
                {crmSubTab === "edit-lead" && (
                  <form onSubmit={submitEditLead} className="space-y-5">
                    <div>
                      <label className={labelClass}>Select Lead *</label>
                      <p className="text-cream-500 text-xs mb-2">
                        Showing {activeLeads.length} active lead{activeLeads.length !== 1 ? "s" : ""} — completed, dead, and lost are hidden.
                      </p>
                      <select required value={selectedLeadId} onChange={e => handleLeadSelect(e.target.value)} className={inputClass}>
                        <option value="" disabled>Choose a lead…</option>
                        {activeLeads.map(l => (
                          <option key={l.leadId} value={l.leadId}>
                            {l.clientName  || l.leadId}
                            {l.address     ? ` — ${l.address}`     : ""}
                            {l.projectDesc ? ` — ${l.projectDesc}` : ""}
                            {` (${l.leadId})`}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedLeadId && (
                      <>
                        <p className="text-cream-500 text-xs tracking-wide">
                          Fields are pre-filled with current values. All fields are optional — only what you change will be saved.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          {editableCrmCols.map(col => (
                            <CrmField key={col} col={col} value={crmForm[col] || ""} onChange={updateCrmField} pipelineStages={pipelineStages} />
                          ))}
                        </div>
                        <button type="submit" disabled={submitting} className={submitClass}>
                          {submitting ? "Saving…" : "Save Changes"}
                        </button>
                      </>
                    )}
                  </form>
                )}
              </div>
            )}

            {/* ════════════════ QB EXPORT ════════════════ */}
            {activeTab === "qb-export" && (() => {
              const [qbYear, qbMon] = qbMonth.split("-");
              const monthLabel = `${MONTH_NAMES[parseInt(qbMon, 10) - 1]} ${qbYear}`;
              const monthKey   = qbMonth.replace("-", "");

              const filtered   = qbRawTx.filter(tx => tx.date && tx.date.startsWith(`${qbYear}-${qbMon}`));
              const withVendor = filtered.filter(tx => tx.vendor);
              const noVendor   = filtered.filter(tx => !tx.vendor);
              const supplierTx = withVendor.filter(tx => !tx.itemCode.toLowerCase().startsWith("subcontract"));
              const subTx      = withVendor.filter(tx =>  tx.itemCode.toLowerCase().startsWith("subcontract"));
              const subCC      = subTx.filter(tx => tx.paymentMethod === "Credit Card");
              const sub1099    = subTx.filter(tx => tx.paymentMethod !== "Credit Card");
              const subUnknown = sub1099.filter(tx => !tx.paymentMethod);

              return (
                <div className="space-y-6">
                  <h2 className="text-navy-500 text-xl font-semibold" style={{ fontFamily: "var(--font-playfair)" }}>
                    QB Monthly Export
                  </h2>

                  {/* Info box */}
                  <div className="border-l-4 border-tan-500 bg-tan-50/30 px-5 py-4 space-y-1.5 text-xs text-navy-400">
                    <p>Generates QBO-formatted Bills CSVs for upload via <strong>Settings → Import Data → Bills</strong>.</p>
                    <p>Import <strong>Supplier Bills</strong> and <strong>Subcontractor Bills</strong> as separate files. Then mark each bill as paid inside QBO.</p>
                    <p className="text-amber-700">1099 rule: Credit card payments are excluded from 1099-NEC — only ACH, check, and cash payments count toward the $600 threshold.</p>
                  </div>

                  {/* Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-end">
                    <div>
                      <label className={labelClass}>Export Month</label>
                      <input
                        type="month"
                        value={qbMonth}
                        onChange={e => { setQbMonth(e.target.value); setQbLoaded(false); }}
                        className={inputClass}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={loadQbTransactions}
                      disabled={qbLoading || jobs.length === 0}
                      className={submitClass}>
                      {qbLoading ? "Loading transactions…" : "Load Transactions"}
                    </button>
                  </div>

                  {/* Results */}
                  {qbLoaded && (
                    <div className="space-y-4">
                      {/* Stats */}
                      <div className="bg-white border border-cream-300 p-5 space-y-4">
                        <p className="text-navy-400 text-xs tracking-widest uppercase font-semibold">
                          Export Preview — {monthLabel}
                        </p>

                        <div className="grid grid-cols-2 gap-5">
                          <div className="border-l-2 border-tan-500 pl-4">
                            <p className="text-navy-500 text-2xl font-semibold">{supplierTx.length}</p>
                            <p className="text-navy-400 text-xs tracking-wider uppercase mt-0.5">Supplier Bill Lines</p>
                            <p className="text-cream-500 text-xs mt-1">Materials, equipment, labor (non-sub)</p>
                          </div>
                          <div className="border-l-2 border-tan-500 pl-4">
                            <p className="text-navy-500 text-2xl font-semibold">{subTx.length}</p>
                            <p className="text-navy-400 text-xs tracking-wider uppercase mt-0.5">Subcontractor Bill Lines</p>
                            {subTx.length > 0 && (
                              <p className="text-xs mt-1">
                                <span className="text-green-700">{sub1099.length} 1099-eligible</span>
                                {subCC.length > 0 && <span className="text-amber-600"> · {subCC.length} CC (excluded from 1099)</span>}
                                {subUnknown.length > 0 && <span className="text-red-500"> · {subUnknown.length} payment method missing</span>}
                              </p>
                            )}
                          </div>
                        </div>

                        {noVendor.length > 0 && (
                          <p className="text-amber-600 text-xs border-t border-cream-200 pt-3">
                            {noVendor.length} transaction{noVendor.length !== 1 ? "s" : ""} excluded from export — no vendor name. Go back to Add Transactions to fill in the vendor.
                          </p>
                        )}
                        {filtered.length === 0 && (
                          <p className="text-cream-500 text-sm">No transactions found for {monthLabel}.</p>
                        )}
                      </div>

                      {/* Download buttons */}
                      {(supplierTx.length > 0 || subTx.length > 0) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <button
                            type="button"
                            onClick={() => downloadCsv(buildBillsCsv(supplierTx, monthKey), `supplier-bills-${qbMonth}.csv`)}
                            disabled={supplierTx.length === 0}
                            className="py-4 border border-navy-500 text-navy-500 text-xs tracking-widest uppercase hover:bg-navy-500 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                            Download Supplier Bills CSV ({supplierTx.length} lines)
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadCsv(buildBillsCsv(subTx, monthKey), `subcontractor-bills-${qbMonth}.csv`)}
                            disabled={subTx.length === 0}
                            className="py-4 border border-navy-500 text-navy-500 text-xs tracking-widest uppercase hover:bg-navy-500 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                            Download Subcontractor Bills CSV ({subTx.length} lines)
                          </button>
                        </div>
                      )}

                      {/* Account mapping reference */}
                      <div className="bg-cream-50 border border-cream-300 p-4">
                        <p className="text-navy-400 text-xs tracking-widest uppercase mb-3 font-semibold">QBO Account Mapping Reference</p>
                        <p className="text-cream-500 text-xs mb-3">These account names must exist in your QBO Chart of Accounts (COGS type) before uploading.</p>
                        <div className="space-y-1.5">
                          {[
                            ["Subcontractor — *", "Subcontractors", "Map to 1099-NEC Box 1 in Taxes → Contractors → Prepare 1099s"],
                            ["Labor — *",         "Labor - Direct",        ""],
                            ["Materials — *",     "Materials & Supplies",  ""],
                            ["Equipment — *",     "Equipment Rental",      ""],
                            ["Other",             "Other Job Costs",       ""],
                          ].map(([code, account, note]) => (
                            <div key={code} className="grid grid-cols-3 gap-3 text-xs">
                              <span className="font-mono text-navy-400">{code}</span>
                              <span className="text-navy-500 font-medium">{account}</span>
                              <span className="text-cream-500">{note}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {!qbLoaded && !qbLoading && (
                    <p className="text-cream-500 text-sm text-center py-10">
                      Select a month and click Load Transactions to preview your export.
                    </p>
                  )}
                </div>
              );
            })()}

            {/* ════════════════ SUMMARY ════════════════ */}
            {activeTab === "summary" && (
              <div className="space-y-6">
                <h2 className="text-navy-500 text-xl font-semibold" style={{ fontFamily: "var(--font-playfair)" }}>
                  Job Summary
                </h2>

                {/* ── Filters ── */}
                <div className="bg-white border border-cream-300 p-5">
                  <p className={`${labelClass} mb-4`}>Filter by Sold Date</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-navy-400 text-xs tracking-wider uppercase mb-1">Year</label>
                      <select value={filterYear}
                        onChange={e => { setFilterYear(e.target.value); setFilterQuarter("all"); setFilterMonth("all"); }}
                        className={inputClass}>
                        <option value="all">All Years</option>
                        {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-navy-400 text-xs tracking-wider uppercase mb-1">Quarter</label>
                      <select value={filterQuarter}
                        onChange={e => { setFilterQuarter(e.target.value); setFilterMonth("all"); }}
                        className={inputClass}>
                        <option value="all">All Quarters</option>
                        {[1,2,3,4].map(q => <option key={q} value={String(q)}>{QUARTER_LABELS[q - 1]}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-navy-400 text-xs tracking-wider uppercase mb-1">Month</label>
                      <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className={inputClass}>
                        <option value="all">All Months</option>
                        {MONTH_NAMES.map((m, i) => <option key={i} value={String(i + 1)}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                  {(filterYear !== "all" || filterQuarter !== "all" || filterMonth !== "all") && (
                    <button
                      onClick={() => { setFilterYear("all"); setFilterQuarter("all"); setFilterMonth("all"); }}
                      className="mt-4 text-xs text-tan-600 hover:text-tan-700 tracking-wider uppercase underline">
                      Clear all filters
                    </button>
                  )}
                </div>

                {/* ── Table ── */}
                {summaryLoading ? (
                  <p className="text-navy-400 text-sm animate-pulse text-center py-12">Loading summary data…</p>
                ) : filteredSummary.length === 0 ? (
                  <p className="text-cream-500 text-sm text-center py-12">
                    {summaryData.length === 0 ? "No job data found. Make sure the Apps Script is updated and deployed." : "No jobs match the selected filters."}
                  </p>
                ) : (
                  <>
                    <div className="overflow-x-auto rounded border border-cream-300">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-navy-500">
                            <th className="px-4 py-3 text-left text-white tracking-wider uppercase font-medium whitespace-nowrap sticky left-0 bg-navy-500 border-r border-navy-400">
                              Job
                            </th>
                            {SUMMARY_LABELS.map((label, i) => (
                              <th key={i} className={`px-4 py-3 text-white tracking-wider uppercase font-medium whitespace-nowrap border-r border-navy-400 last:border-r-0 ${CURRENCY_COLS.includes(i) || PERCENT_COLS.includes(i) ? "text-right" : "text-left"}`}>
                                {label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSummary.map((row, ri) => (
                            <tr key={ri} className={`border-b border-cream-200 ${ri % 2 === 0 ? "bg-white" : "bg-cream-50"}`}>
                              <td className="px-4 py-2.5 text-navy-500 font-medium border-r border-cream-200 whitespace-nowrap sticky left-0 bg-inherit">
                                {row.jobName}
                              </td>
                              {SUMMARY_LABELS.map((_, ci) => {
                                const isNumeric = CURRENCY_COLS.includes(ci) || PERCENT_COLS.includes(ci);
                                const val = fmtSummaryCell(ci, row.values[ci]);
                                const isNeg = isNumeric && row.values[ci] && parseFloat(row.values[ci]) < 0;
                                return (
                                  <td key={ci} className={`px-4 py-2.5 border-r border-cream-200 last:border-r-0 whitespace-nowrap ${isNumeric ? "text-right" : ""} ${isNeg ? "text-red-600" : "text-navy-400"}`}>
                                    {val}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-cream-500 text-xs text-right">
                      Showing {filteredSummary.length} of {summaryData.length} job{summaryData.length !== 1 ? "s" : ""}
                    </p>
                  </>
                )}
              </div>
            )}

          </>
        )}
      </div>
    </div>
  );
}
