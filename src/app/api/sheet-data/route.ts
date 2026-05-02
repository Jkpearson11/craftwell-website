import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.APPS_SCRIPT_URL;
  if (!url) {
    return NextResponse.json(
      { error: "APPS_SCRIPT_URL environment variable is not set.", jobs: [], costCodes: [] },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(`${url}?action=getDropdownData`, {
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to reach Google Sheets.", jobs: [], costCodes: [] },
      { status: 500 }
    );
  }
}
