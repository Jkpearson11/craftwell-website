import { NextResponse } from "next/server";

export async function GET() {
  const budgetUrl = process.env.APPS_SCRIPT_URL;
  const crmUrl    = process.env.CRM_SCRIPT_URL;

  if (!budgetUrl) {
    return NextResponse.json(
      { error: "APPS_SCRIPT_URL environment variable is not set.", jobs: [], costCodes: [], crmLeads: [], pipelineStages: [], crmColumns: [] },
      { status: 500 }
    );
  }

  // Fetch budget data and CRM data in parallel
  const [budgetResult, crmResult] = await Promise.allSettled([
    fetch(`${budgetUrl}?action=getDropdownData`, { cache: "no-store" }).then(r => r.json()),
    crmUrl
      ? fetch(`${crmUrl}?action=getCrmData`, { cache: "no-store" }).then(r => r.json())
      : Promise.resolve({ crmLeads: [], pipelineStages: [], crmColumns: [] }),
  ]);

  const budget = budgetResult.status === "fulfilled" ? budgetResult.value : { jobs: [], costCodes: [] };
  const crm    = crmResult.status    === "fulfilled" ? crmResult.value    : { crmLeads: [], pipelineStages: [], crmColumns: [] };

  return NextResponse.json({
    jobs:           budget.jobs           || [],
    costCodes:      budget.costCodes      || [],
    crmLeads:       crm.crmLeads          || [],
    pipelineStages: crm.pipelineStages    || [],
    crmColumns:     crm.crmColumns        || [],
    error:          budget.error || crm.error || null,
  });
}
