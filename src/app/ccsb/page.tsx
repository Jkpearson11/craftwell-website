"use client";

import { useState, useEffect } from "react";

type CostCode = { code: string; description: string };
type TxRow = {
  itemCode: string;
  amount: string;
  vendor: string;
  date: string;
  description: string;
};

const today = () => new Date().toISOString().split("T")[0];
const emptyRow = (): TxRow => ({
  itemCode: "",
  amount: "",
  vendor: "",
  date: today(),
  description: "",
});

export default function BudgetManager() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [jobs, setJobs] = useState<string[]>([]);
  const [costCodes, setCostCodes] = useState<CostCode[]>([]);

  const [activeTab, setActiveTab] = useState<"new-job" | "transaction">("new-job");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // ── New Job form ────────────────────────────────────────────
  const [jobForm, setJobForm] = useState({
    jobName: "",
    clientName: "",
    address: "",
    scopeOfWork: "",
    contractValue: "",
    operatingBudget: "",
    startingMargin: "",
  });

  // ── Transaction form ────────────────────────────────────────
  const [selectedJob, setSelectedJob] = useState("");
  const [rows, setRows] = useState<TxRow[]>([emptyRow()]);

  // Load dropdown data on page load
  useEffect(() => {
    fetch("/api/sheet-data")
      .then((r) => r.json())
      .then((d) => {
        setJobs(d.jobs || []);
        setCostCodes(d.costCodes || []);
        if (d.error) setLoadError(true);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  const handleJobField = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setJobForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const updateRow = (i: number, field: keyof TxRow, value: string) =>
    setRows((p) => p.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));

  const addRow = () => setRows((p) => [...p, emptyRow()]);
  const removeRow = (i: number) => setRows((p) => p.filter((_, idx) => idx !== i));

  // Submit: New Job
  const submitNewJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/new-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jobForm),
      });
      const data = await res.json();
      setResult({ success: data.success, message: data.message || data.error });
      if (data.success) {
        setJobs((p) => [...p, jobForm.jobName]);
        setJobForm({
          jobName: "",
          clientName: "",
          address: "",
          scopeOfWork: "",
          contractValue: "",
          operatingBudget: "",
          startingMargin: "",
        });
      }
    } catch {
      setResult({ success: false, message: "Network error. Check your connection and try again." });
    } finally {
      setSubmitting(false);
    }
  };

  // Submit: Transactions
  const submitTransactions = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/add-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobName: selectedJob, transactions: rows }),
      });
      const data = await res.json();
      setResult({ success: data.success, message: data.message || data.error });
      if (data.success) {
        setRows([emptyRow()]);
      }
    } catch {
      setResult({ success: false, message: "Network error. Check your connection and try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full bg-white border border-cream-300 px-4 py-3 text-navy-500 text-sm focus:outline-none focus:border-tan-400 transition-colors";
  const innerInputClass =
    "w-full bg-cream-100 border border-cream-300 px-3 py-2 text-navy-500 text-sm focus:outline-none focus:border-tan-400 transition-colors";
  const labelClass = "block text-navy-400 text-xs tracking-widest uppercase mb-2";

  return (
    <div className="min-h-screen bg-cream-100">
      {/* Header */}
      <div className="bg-navy-500 px-6 py-5">
        <div className="max-w-4xl mx-auto">
          <p className="text-tan-300 text-xs tracking-[0.3em] uppercase mb-1">Craftwell Construction</p>
          <h1
            className="text-white text-2xl font-semibold"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Budget Manager
          </h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Loading */}
        {loading && (
          <div className="text-center py-20">
            <p className="text-navy-400 text-sm tracking-wider animate-pulse">
              Loading spreadsheet data…
            </p>
          </div>
        )}

        {/* Load error */}
        {!loading && loadError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 text-sm mb-6">
            Could not connect to Google Sheets. Make sure your Apps Script URL is set correctly in
            Netlify environment variables and that the script is deployed as a web app.
          </div>
        )}

        {!loading && (
          <>
            {/* Tab Buttons */}
            <div className="flex border-b border-cream-300 mb-8">
              {(["new-job", "transaction"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setResult(null);
                  }}
                  className={`px-6 py-3 text-xs tracking-widest uppercase font-medium transition-colors ${
                    activeTab === tab
                      ? "border-b-2 border-tan-500 text-tan-600"
                      : "text-navy-400 hover:text-navy-600"
                  }`}
                >
                  {tab === "new-job" ? "New Job" : "Add Transactions"}
                </button>
              ))}
            </div>

            {/* Result Banner */}
            {result && (
              <div
                className={`px-5 py-4 mb-6 text-sm border ${
                  result.success
                    ? "bg-green-50 text-green-800 border-green-200"
                    : "bg-red-50 text-red-700 border-red-200"
                }`}
              >
                {result.message}
              </div>
            )}

            {/* ── NEW JOB FORM ──────────────────────────────────────── */}
            {activeTab === "new-job" && (
              <form onSubmit={submitNewJob} className="space-y-6">
                <h2
                  className="text-navy-500 text-xl font-semibold mb-2"
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  Create New Job
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>
                      Job Name (becomes the tab name) *
                    </label>
                    <input
                      name="jobName"
                      required
                      value={jobForm.jobName}
                      onChange={handleJobField}
                      className={inputClass}
                      placeholder="e.g. Smith - Master Bath 2024"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Client Name *</label>
                    <input
                      name="clientName"
                      required
                      value={jobForm.clientName}
                      onChange={handleJobField}
                      className={inputClass}
                      placeholder="Jane Smith"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Job Address *</label>
                  <input
                    name="address"
                    required
                    value={jobForm.address}
                    onChange={handleJobField}
                    className={inputClass}
                    placeholder="1234 Main St, Dallas TX 75201"
                  />
                </div>

                <div>
                  <label className={labelClass}>Scope of Work *</label>
                  <textarea
                    name="scopeOfWork"
                    required
                    rows={3}
                    value={jobForm.scopeOfWork}
                    onChange={handleJobField}
                    className={`${inputClass} resize-none`}
                    placeholder="Full master bathroom remodel including tile, vanity, shower, and fixtures…"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div>
                    <label className={labelClass}>Total Contract Value ($) *</label>
                    <input
                      name="contractValue"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={jobForm.contractValue}
                      onChange={handleJobField}
                      className={inputClass}
                      placeholder="75000"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Operating Budget ($) *</label>
                    <input
                      name="operatingBudget"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={jobForm.operatingBudget}
                      onChange={handleJobField}
                      className={inputClass}
                      placeholder="60000"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Starting Margin (%) *</label>
                    <input
                      name="startingMargin"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      required
                      value={jobForm.startingMargin}
                      onChange={handleJobField}
                      className={inputClass}
                      placeholder="20"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-navy-500 text-white text-sm tracking-widest uppercase hover:bg-tan-600 transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? "Creating Job…" : "Create New Job"}
                </button>
              </form>
            )}

            {/* ── TRANSACTION FORM ──────────────────────────────────── */}
            {activeTab === "transaction" && (
              <form onSubmit={submitTransactions} className="space-y-6">
                <h2
                  className="text-navy-500 text-xl font-semibold mb-2"
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  Add Transactions
                </h2>

                <div>
                  <label className={labelClass}>Select Job *</label>
                  <select
                    required
                    value={selectedJob}
                    onChange={(e) => setSelectedJob(e.target.value)}
                    className={inputClass}
                  >
                    <option value="" disabled>
                      Choose a job…
                    </option>
                    {jobs.length === 0 && (
                      <option disabled>No jobs found in spreadsheet</option>
                    )}
                    {jobs.map((j) => (
                      <option key={j} value={j}>
                        {j}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Transaction Lines */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className={`${labelClass} mb-0`}>
                      Transaction Lines
                    </label>
                    <button
                      type="button"
                      onClick={addRow}
                      className="text-xs tracking-wider px-4 py-2 border border-tan-500 text-tan-600 hover:bg-tan-500 hover:text-white transition-colors"
                    >
                      + Add Line
                    </button>
                  </div>

                  <div className="space-y-3">
                    {rows.map((row, i) => (
                      <div
                        key={i}
                        className="bg-white border border-cream-300 p-4"
                      >
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-navy-400 text-xs font-semibold tracking-wider uppercase">
                            Line {i + 1}
                          </span>
                          {rows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeRow(i)}
                              className="text-red-400 hover:text-red-600 text-xs tracking-wider uppercase transition-colors"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          {/* Item Code — full width on mobile */}
                          <div className="col-span-2">
                            <label className="block text-navy-400 text-xs tracking-wider uppercase mb-1">
                              Item Code *
                            </label>
                            <select
                              required
                              value={row.itemCode}
                              onChange={(e) =>
                                updateRow(i, "itemCode", e.target.value)
                              }
                              className={innerInputClass}
                            >
                              <option value="" disabled>
                                Select cost code…
                              </option>
                              {costCodes.map((cc) => (
                                <option key={cc.code} value={cc.code}>
                                  {cc.code}
                                  {cc.description ? ` — ${cc.description}` : ""}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Amount */}
                          <div>
                            <label className="block text-navy-400 text-xs tracking-wider uppercase mb-1">
                              Amount ($) *
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              required
                              value={row.amount}
                              onChange={(e) =>
                                updateRow(i, "amount", e.target.value)
                              }
                              className={innerInputClass}
                              placeholder="0.00"
                            />
                          </div>

                          {/* Date */}
                          <div>
                            <label className="block text-navy-400 text-xs tracking-wider uppercase mb-1">
                              Date *
                            </label>
                            <input
                              type="date"
                              required
                              value={row.date}
                              onChange={(e) =>
                                updateRow(i, "date", e.target.value)
                              }
                              className={innerInputClass}
                            />
                          </div>

                          {/* Vendor */}
                          <div>
                            <label className="block text-navy-400 text-xs tracking-wider uppercase mb-1">
                              Vendor
                            </label>
                            <input
                              value={row.vendor}
                              onChange={(e) =>
                                updateRow(i, "vendor", e.target.value)
                              }
                              className={innerInputClass}
                              placeholder="Home Depot"
                            />
                          </div>

                          {/* Description */}
                          <div>
                            <label className="block text-navy-400 text-xs tracking-wider uppercase mb-1">
                              Description
                            </label>
                            <input
                              value={row.description}
                              onChange={(e) =>
                                updateRow(i, "description", e.target.value)
                              }
                              className={innerInputClass}
                              placeholder="Tile for master bath floor"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-navy-500 text-white text-sm tracking-widest uppercase hover:bg-tan-600 transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting
                    ? "Submitting…"
                    : `Submit ${rows.length} Transaction${rows.length !== 1 ? "s" : ""}`}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
