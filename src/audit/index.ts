/**
 * Performance Audit orchestrator
 * [1/5] Load config + articles → [2/5] GA4 → [3/5] GSC → [4/5] Score → [5/5] Write
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { fetchGA4Data } from "./ga4-client.js";
import { fetchGSCData } from "./gsc-client.js";
import { scoreArticles, assignPriorities } from "./scorer.js";
import type {
  AuditConfig,
  AuditResult,
  ArticleFrontmatter,
  ArticleSnapshot,
  PerfHistory,
  HistoryMetric,
  GA4Row,
  GSCRow,
} from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..", "..");
const DATA_DIR = join(PROJECT_ROOT, "data");
const GAMES_DIR = join(PROJECT_ROOT, "site", "src", "content", "games");
const CONFIG_FILE = join(PROJECT_ROOT, "config", "audit-rules.json");

function loadConfig(): AuditConfig {
  return JSON.parse(readFileSync(CONFIG_FILE, "utf-8")) as AuditConfig;
}

function loadArticles(): ArticleFrontmatter[] {
  const files = readdirSync(GAMES_DIR).filter((f) => f.endsWith(".md"));
  const articles: ArticleFrontmatter[] = [];

  for (const file of files) {
    const content = readFileSync(join(GAMES_DIR, file), "utf-8");
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fmMatch) continue;

    const fm = fmMatch[1];
    const get = (key: string): string => {
      const match = fm.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
      if (!match) return "";
      return match[1].replace(/^["']|["']$/g, "").trim();
    };

    articles.push({
      slug: get("slug"),
      game_name: get("game_name"),
      category: get("category"),
      template_variant: get("template_variant"),
      published_at: get("published_at"),
      draft: get("draft") === "true",
    });
  }

  return articles.filter((a) => a.slug && !a.draft);
}

function buildSnapshots(
  articles: ArticleFrontmatter[],
  ga4Data: GA4Row[],
  gscData: GSCRow[],
): ArticleSnapshot[] {
  const ga4Map = new Map(ga4Data.map((r) => [r.slug, r]));
  const gscMap = new Map(gscData.map((r) => [r.slug, r]));
  const now = new Date().toISOString();

  return articles.map((article) => ({
    slug: article.slug,
    game_name: article.game_name,
    category: article.category,
    template_variant: article.template_variant,
    published_at: article.published_at,
    ga4: ga4Map.get(article.slug) ?? null,
    gsc: gscMap.get(article.slug) ?? null,
    collected_at: now,
  }));
}

function checkDataSufficiency(
  snapshots: ArticleSnapshot[],
  config: AuditConfig,
): { sufficient: boolean; reason: string | null } {
  const withGA4 = snapshots.filter((s) => s.ga4 !== null).length;
  const withGSC = snapshots.filter((s) => s.gsc !== null).length;
  const articlesWithData = Math.max(withGA4, withGSC);

  const publishDates = snapshots
    .map((s) => new Date(s.published_at).getTime())
    .filter((d) => !isNaN(d));
  const earliest = publishDates.length > 0 ? Math.min(...publishDates) : Date.now();
  const daysSincePublish = Math.floor((Date.now() - earliest) / (1000 * 60 * 60 * 24));

  if (daysSincePublish < config.scoring.min_data_days) {
    return {
      sufficient: false,
      reason: `データ不足: 公開から${daysSincePublish}日 (最低${config.scoring.min_data_days}日必要)`,
    };
  }

  if (articlesWithData < config.scoring.min_articles_with_data) {
    return {
      sufficient: false,
      reason: `データ不足: ${articlesWithData}記事のみデータあり (最低${config.scoring.min_articles_with_data}記事必要)`,
    };
  }

  return { sufficient: true, reason: null };
}

/** Save slim metrics only (not full snapshots) to keep history small */
function updateHistory(snapshots: ArticleSnapshot[]): void {
  const historyFile = join(DATA_DIR, "perf-history.json");
  let history: PerfHistory;

  if (existsSync(historyFile)) {
    history = JSON.parse(readFileSync(historyFile, "utf-8")) as PerfHistory;
  } else {
    history = { weeks: [] };
  }

  const weekLabel = new Date().toISOString().split("T")[0];
  const metrics: HistoryMetric[] = snapshots.map((s) => ({
    slug: s.slug,
    pv: s.ga4?.pageviews ?? null,
    sessions: s.ga4?.sessions ?? null,
    bounce_rate: s.ga4?.bounce_rate ?? null,
    gsc_clicks: s.gsc?.clicks ?? null,
    gsc_impressions: s.gsc?.impressions ?? null,
    gsc_position: s.gsc?.position ?? null,
  }));

  history.weeks.push({ week: weekLabel, metrics });

  // Keep max 52 weeks
  if (history.weeks.length > 52) {
    history.weeks = history.weeks.slice(-52);
  }

  writeFileSync(historyFile, JSON.stringify(history, null, 2), "utf-8");
}

async function main(): Promise<void> {
  const start = Date.now();
  console.log("=== Performance Audit ===\n");

  console.log("[1/5] Loading config + articles...");
  const config = loadConfig();
  const articles = loadArticles();
  console.log(`  → ${articles.length} articles loaded`);
  console.log(`  → GA4 property: ${config.ga4.property_id}`);
  console.log(`  → GSC site: ${config.gsc.site_url}`);

  let ga4Data: GA4Row[] = [];
  let gscData: GSCRow[] = [];

  console.log("\n[2/5] Fetching GA4 data...");
  try {
    ga4Data = await fetchGA4Data(
      config.ga4.property_id,
      config.ga4.date_range_days,
    );
    console.log(`  → ${ga4Data.length} pages with GA4 data`);
  } catch (err) {
    console.error(`  GA4 fetch failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  console.log("\n[3/5] Fetching GSC data...");
  try {
    gscData = await fetchGSCData(
      config.gsc.site_url,
      config.gsc.date_range_days,
    );
    console.log(`  → ${gscData.length} pages with GSC data`);
  } catch (err) {
    console.error(`  GSC fetch failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  console.log("\n[4/5] Building snapshots + scoring...");
  const snapshots = buildSnapshots(articles, ga4Data, gscData);
  const { sufficient, reason } = checkDataSufficiency(snapshots, config);

  let scored = scoreArticles(snapshots, config);
  if (sufficient) {
    scored = assignPriorities(scored);
    console.log("  → Scoring complete");
    const p0 = scored.filter((s) => s.priority === "P0").length;
    const p1 = scored.filter((s) => s.priority === "P1").length;
    const noData = scored.filter((s) => s.rewrite_score < 0).length;
    console.log(`  → P0: ${p0} | P1: ${p1} | P2: ${scored.length - p0 - p1 - noData} | No data: ${noData}`);
  } else {
    scored = [];
    console.log(`  → Scoring skipped: ${reason}`);
  }

  console.log("\n[5/5] Writing results...");

  const result: AuditResult = {
    generated_at: new Date().toISOString(),
    config: {
      ga4_property_id: config.ga4.property_id,
      gsc_site_url: config.gsc.site_url,
      date_range_days: config.ga4.date_range_days,
    },
    data_sufficient: sufficient,
    data_reason: reason,
    total_articles: articles.length,
    articles_with_ga4: snapshots.filter((s) => s.ga4 !== null).length,
    articles_with_gsc: snapshots.filter((s) => s.gsc !== null).length,
    scored: scored.sort((a, b) => {
      const priority = { P0: 0, P1: 1, P2: 2 };
      return (priority[a.priority] - priority[b.priority]) || (b.rewrite_score - a.rewrite_score);
    }),
    snapshots,
  };

  writeFileSync(
    join(DATA_DIR, "audit-result.json"),
    JSON.stringify(result, null, 2),
    "utf-8",
  );
  console.log("  → data/audit-result.json");

  updateHistory(snapshots);
  console.log("  → data/perf-history.json updated");

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n=== Done in ${elapsed}s ===`);
  console.log(`  Data sufficient: ${sufficient}`);
  console.log(`  GA4: ${ga4Data.length} | GSC: ${gscData.length} | Articles: ${articles.length}`);
}

main();
