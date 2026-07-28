// netlify/functions/keepalive.mjs
// Netlify Scheduled Function — fires every 5 minutes (schedule in netlify.toml).
// Pings Netlify routes AND the Apps Script web app directly.
// Apps Script containers are destroyed after 5-7 minutes of inactivity (Gemini audit finding).
// The 9-minute interval was letting Apps Script go cold between pings — now fixed at 5 minutes.

export default async () => {
  const base       = (process.env.URL             ?? "https://craftwellconstruction.com").replace(/\/$/, "");
  const scriptUrl  =  process.env.APPS_SCRIPT_URL ?? "";
  const crmUrl     =  process.env.CRM_SCRIPT_URL  ?? "";

  // Netlify function warm-up endpoints
  const netlifyEndpoints = [
    `${base}/api/warm`,
    `${base}/api/mcp`,
    `${base}/api/mcp-sandbox`,
  ];

  // Apps Script ping endpoints — keeps the V8 container alive between real calls
  const scriptEndpoints = [
    scriptUrl ? `${scriptUrl}?action=ping` : null,
    crmUrl    ? `${crmUrl}?action=ping`    : null,
  ].filter(Boolean);

  const allEndpoints = [...netlifyEndpoints, ...scriptEndpoints];

  const results = await Promise.allSettled(
    allEndpoints.map(url =>
      fetch(url, {
        method: "GET",
        signal: AbortSignal.timeout(10_000),
      })
    )
  );

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "fulfilled") {
      console.log(`[keepalive] OK ${allEndpoints[i]} — HTTP ${r.value.status}`);
    } else {
      console.error(`[keepalive] FAIL ${allEndpoints[i]} — ${r.reason}`);
    }
  }
};
