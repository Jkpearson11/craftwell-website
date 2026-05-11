import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = process.env.APPS_SCRIPT_URL;
  if (!url) {
    return NextResponse.json({ error: "APPS_SCRIPT_URL not set." }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const jobName = searchParams.get("jobName");
  if (!jobName) {
    return NextResponse.json({ error: "jobName is required." }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${url}?action=getJobBudget&jobName=${encodeURIComponent(jobName)}`,
      { cache: "no-store" }
    );
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to reach Google Sheets." }, { status: 500 });
  }
}
