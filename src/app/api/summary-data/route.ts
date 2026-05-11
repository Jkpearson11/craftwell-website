import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.APPS_SCRIPT_URL;
  if (!url) {
    return NextResponse.json({ error: "APPS_SCRIPT_URL not set." }, { status: 500 });
  }

  try {
    const res = await fetch(`${url}?action=getSummaryData`, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to reach Google Sheets." }, { status: 500 });
  }
}
