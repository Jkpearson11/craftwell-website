import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const url = process.env.APPS_SCRIPT_URL;
  if (!url) {
    return NextResponse.json(
      { success: false, error: "APPS_SCRIPT_URL environment variable is not set." },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "addTransactions", ...body }),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Failed to reach Google Sheets." },
      { status: 500 }
    );
  }
}
