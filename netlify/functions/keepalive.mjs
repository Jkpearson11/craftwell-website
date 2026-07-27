// netlify/functions/keepalive.mjs
// Netlify Scheduled Function — fires every 9 minutes (schedule in netlify.toml).
// Pings /api/warm, /api/mcp, and /api/mcp-sandbox to prevent cold-start 502s.

export default async () => {
  const base = (process.env.URL ?? "https://craftwellconstruction.com").replace(/\/$/, "");

  const endpoints = [
    `${base}/api/warm`,
    `${base}/api/mcp`,
    `${base}/api/mcp-sandbox`,
  ];

  const results = await Promise.allSettled(
    endpoints.map(url =>
      fetch(url, {
        method: "GET",
        signal: AbortSignal.timeout(8_000),
      })
    )
  );

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "fulfilled") {
      console.log(`[keepalive] OK ${endpoints[i]} — HTTP ${r.value.status}`);
    } else {
      console.error(`[keepalive] FAIL ${endpoints[i]} — ${r.reason}`);
    }
  }
};
