/**
 * netlify/functions/keepalive.js
 *
 * Netlify Scheduled Function — runs every 9 minutes.
 *
 * Netlify free-tier functions spin down after ~10 minutes of inactivity,
 * causing cold-start 502s on the next real request. This function pings
 * all three MCP endpoints before the 10-minute window closes, keeping
 * the Next.js runtime perpetually warm.
 *
 * Schedule: every 9 minutes (cron "*/9 * * * *")
 * Deploy: automatically picked up by Netlify from netlify/functions/
 */

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

