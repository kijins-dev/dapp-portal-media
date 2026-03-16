/**
 * Google Search Console API client (raw fetch)
 * Fetches per-page: clicks, impressions, CTR, position
 */
import { getAccessToken, GSC_AUDIENCE } from "./auth.js";
import type { GSCRow } from "./types.js";

const GSC_API_BASE = "https://searchconsole.googleapis.com/webmasters/v3";

interface GSCResponse {
  rows?: {
    keys: string[];
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }[];
}

function extractSlugFromUrl(url: string): string | null {
  const match = url.match(/\/games\/([^/]+)\/?$/);
  return match ? match[1] : null;
}

export async function fetchGSCData(
  siteUrl: string,
  days: number,
): Promise<GSCRow[]> {
  const token = await getAccessToken(GSC_AUDIENCE);

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);

  const body = {
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
    dimensions: ["page"],
    dimensionFilterGroups: [
      {
        filters: [
          {
            dimension: "page",
            operator: "contains",
            expression: "/games/",
          },
        ],
      },
    ],
    rowLimit: 500,
  };

  const encodedSiteUrl = encodeURIComponent(siteUrl);
  const res = await fetch(
    `${GSC_API_BASE}/sites/${encodedSiteUrl}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    },
  );

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`GSC API error (${res.status}): ${errBody}`);
  }

  const data = (await res.json()) as GSCResponse;

  if (!data.rows || data.rows.length === 0) {
    return [];
  }

  const rows: GSCRow[] = [];
  for (const row of data.rows) {
    const page = row.keys[0];
    const slug = extractSlugFromUrl(page);
    if (!slug) continue;

    rows.push({
      slug,
      page,
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: parseFloat(row.ctr.toFixed(4)),
      position: parseFloat(row.position.toFixed(1)),
    });
  }

  return rows;
}
