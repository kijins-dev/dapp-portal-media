/**
 * GA4 Data API client (raw fetch)
 * Fetches per-page metrics: pageviews, sessions, avg session duration, bounce rate
 */
import { getAccessToken, GA4_AUDIENCE } from "./auth.js";
import type { GA4Row } from "./types.js";

const GA4_API_BASE = "https://analyticsdata.googleapis.com/v1beta";

interface GA4ReportResponse {
  rows?: {
    dimensionValues: { value: string }[];
    metricValues: { value: string }[];
  }[];
  rowCount?: number;
}

function extractSlugFromPath(pagePath: string): string | null {
  // /games/{slug}/ → slug
  const match = pagePath.match(/^\/games\/([^/]+)\/?$/);
  return match ? match[1] : null;
}

export async function fetchGA4Data(
  propertyId: string,
  days: number,
): Promise<GA4Row[]> {
  const token = await getAccessToken(GA4_AUDIENCE);

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);

  const body = {
    dateRanges: [
      {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      },
    ],
    dimensions: [{ name: "pagePath" }],
    metrics: [
      { name: "screenPageViews" },
      { name: "sessions" },
      { name: "averageSessionDuration" },
      { name: "bounceRate" },
    ],
    dimensionFilter: {
      filter: {
        fieldName: "pagePath",
        stringFilter: {
          matchType: "BEGINS_WITH",
          value: "/games/",
        },
      },
    },
    limit: 500,
  };

  const res = await fetch(
    `${GA4_API_BASE}/properties/${propertyId}:runReport`,
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
    throw new Error(`GA4 API error (${res.status}): ${errBody}`);
  }

  const data = (await res.json()) as GA4ReportResponse;

  if (!data.rows || data.rows.length === 0) {
    return [];
  }

  const rows: GA4Row[] = [];
  for (const row of data.rows) {
    const pagePath = row.dimensionValues[0].value;
    const slug = extractSlugFromPath(pagePath);
    if (!slug) continue;

    rows.push({
      slug,
      page_path: pagePath,
      pageviews: parseInt(row.metricValues[0].value, 10) || 0,
      sessions: parseInt(row.metricValues[1].value, 10) || 0,
      avg_session_duration: parseFloat(row.metricValues[2].value) || 0,
      bounce_rate: parseFloat(row.metricValues[3].value) || 0,
    });
  }

  return rows;
}
