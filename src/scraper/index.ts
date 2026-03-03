import { chromium } from "playwright";
import { createHash } from "crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { AppData, ScrapeResult, DiffResult, ScraperConfig } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..", "..");
const DATA_DIR = join(PROJECT_ROOT, "data");
const APPS_FILE = join(DATA_DIR, "apps.json");
const DIFF_FILE = join(DATA_DIR, "diff.json");
const SCRAPER_CONFIG_FILE = join(PROJECT_ROOT, "config", "scraper.yaml");
const HEALTH_FILE = join(DATA_DIR, "scraper-health.json");

const SCRAPER_VERSION = "1.2.0";

function readScalar(raw: string, key: string): string | undefined {
  const line = raw
    .split(/\r?\n/)
    .find((l) => l.trimStart().startsWith(`${key}:`));
  if (!line) return undefined;
  return line
    .split(":")
    .slice(1)
    .join(":")
    .trim()
    .replace(/^"|"$/g, "");
}

function readNestedScalar(raw: string, parent: string, key: string): string | undefined {
  const lines = raw.split(/\r?\n/);
  const parentIndex = lines.findIndex((l) => l.trim() === `${parent}:`);
  if (parentIndex === -1) return undefined;

  for (let i = parentIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith("  ")) break;
    const trimmed = line.trim();
    if (trimmed.startsWith(`${key}:`)) {
      return trimmed
        .split(":")
        .slice(1)
        .join(":")
        .trim()
        .replace(/^"|"$/g, "");
    }
  }
  return undefined;
}

function loadConfig(): ScraperConfig {
  const fallback: ScraperConfig = {
    target_url: "https://www.unifi.me/apps",
    user_agent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    wait_timeout: 5000,
    viewport: { width: 1280, height: 720 },
  };

  if (!existsSync(SCRAPER_CONFIG_FILE)) return fallback;

  const raw = readFileSync(SCRAPER_CONFIG_FILE, "utf-8");
  return {
    target_url: readNestedScalar(raw, "scraper", "target_url") ?? fallback.target_url,
    user_agent: readNestedScalar(raw, "scraper", "user_agent") ?? fallback.user_agent,
    wait_timeout: Number(readNestedScalar(raw, "scraper", "wait_timeout") ?? fallback.wait_timeout),
    viewport: {
      width: Number(readNestedScalar(raw, "viewport", "width") ?? fallback.viewport.width),
      height: Number(readNestedScalar(raw, "viewport", "height") ?? fallback.viewport.height),
    },
  };
}

const config: ScraperConfig = loadConfig();

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parsePlayCount(text: string): number {
  const cleaned = text.trim().replace(/,/g, "");
  const match = cleaned.match(/([\d.]+)\s*([MKk])?/);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  const suffix = match[2]?.toUpperCase();
  if (suffix === "M") return Math.round(num * 1_000_000);
  if (suffix === "K") return Math.round(num * 1_000);
  return Math.round(num);
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    return Object.fromEntries(entries.map(([k, v]) => [k, canonicalize(v)]));
  }
  return value;
}

function computeHash(apps: AppData[]): string {
  const sortedApps = [...apps].sort((a, b) => a.slug.localeCompare(b.slug));
  const canonical = canonicalize(sortedApps);
  const json = JSON.stringify(canonical);
  return "sha256:" + createHash("sha256").update(json).digest("hex");
}

async function scrape(): Promise<AppData[]> {
  console.log(`[scraper] Starting scrape of ${config.target_url}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: config.user_agent,
    viewport: config.viewport,
  });
  const page = await context.newPage();

  try {
    await page.goto(config.target_url, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await page.waitForTimeout(config.wait_timeout);

    // Scroll to load all content
    await page.evaluate(async () => {
      for (let i = 0; i < 20; i++) {
        window.scrollBy(0, 500);
        await new Promise((r) => setTimeout(r, 300));
      }
    });
    await page.waitForTimeout(2000);

    const now = new Date().toISOString();
    const today = now.split("T")[0];

    const selectorHealth = await page.evaluate(() => {
      return {
        cardCount: document.querySelectorAll(".item-explore-wrap").length,
        titleCount: document.querySelectorAll(".item-explore-wrap .title").length,
        categoryCount: document.querySelectorAll(".item-explore-wrap .info-wrap > .text").length,
        playCountCount: document.querySelectorAll(".item-explore-wrap .info-user").length,
      };
    });

    const apps = await page.evaluate(
      ({ now, today, sourceUrl }: { now: string; today: string; sourceUrl: string }) => {
        const cards = Array.from(document.querySelectorAll(".item-explore-wrap"));

        return cards.map((card) => {
          const name = card.querySelector(".title")?.textContent?.trim() || "";
          const category =
            card.querySelector(".info-wrap > .text")?.textContent?.trim() || "";
          const playCountText =
            card.querySelector(".info-user")?.textContent?.trim() || "0";
          const imgWrap = card.querySelector(".img-wrap") as HTMLAnchorElement | null;
          const gameUrl = imgWrap?.getAttribute("href") || "";
          const thumbnail =
            card.querySelector(".img-wrap img")?.getAttribute("src") || "";

          return {
            name,
            category,
            play_count: playCountText,
            game_url: gameUrl,
            thumbnail_url: thumbnail,
          };
        });
      },
      { now, today, sourceUrl: config.target_url }
    );

    console.log(`[scraper] Found ${apps.length} apps`);

    const health = {
      checked_at: now,
      source_url: config.target_url,
      selectors: selectorHealth,
      ok:
        selectorHealth.cardCount > 0 &&
        selectorHealth.titleCount > 0 &&
        selectorHealth.categoryCount > 0 &&
        selectorHealth.playCountCount > 0,
    };

    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }
    writeFileSync(HEALTH_FILE, JSON.stringify(health, null, 2), "utf-8");
    if (!health.ok) {
      throw new Error(`[scraper] Selector health check failed: ${JSON.stringify(selectorHealth)}`);
    }

    // Load previous data for first_seen
    const previous = loadPreviousData();
    const previousMap = new Map(previous.map((a) => [a.name, a]));

    const result: AppData[] = apps.map((raw) => {
      const prev = previousMap.get(raw.name);
      return {
        name: raw.name,
        slug: slugify(raw.name),
        category: raw.category,
        play_count: raw.play_count,
        play_count_raw: parsePlayCount(raw.play_count),
        thumbnail_url: raw.thumbnail_url,
        detail_url: raw.game_url,
        first_seen: prev?.first_seen || today,
        last_seen: today,
        rewards: prev?.rewards || [],
        source_urls: [config.target_url],
        fetched_at: now,
      };
    });

    return result;
  } finally {
    await browser.close();
  }
}

function loadPreviousData(): AppData[] {
  if (!existsSync(APPS_FILE)) return [];
  try {
    const data: ScrapeResult = JSON.parse(readFileSync(APPS_FILE, "utf-8"));
    return data.apps;
  } catch {
    return [];
  }
}

function computeDiff(current: AppData[], previous: AppData[]): DiffResult {
  const prevMap = new Map(previous.map((a) => [a.name, a]));
  const currMap = new Map(current.map((a) => [a.name, a]));

  const newApps = current.filter((a) => !prevMap.has(a.name));
  const removedApps = previous.filter((a) => !currMap.has(a.name));

  const updatedApps: DiffResult["updated_apps"] = [];
  for (const app of current) {
    const prev = prevMap.get(app.name);
    if (!prev) continue;
    const changes: string[] = [];
    if (prev.play_count !== app.play_count) {
      changes.push(`play_count: ${prev.play_count} → ${app.play_count}`);
    }
    if (prev.category !== app.category) {
      changes.push(`category: ${prev.category} → ${app.category}`);
    }
    if (changes.length > 0) {
      updatedApps.push({ app, changes });
    }
  }

  return {
    new_apps: newApps,
    removed_apps: removedApps,
    updated_apps: updatedApps,
    timestamp: new Date().toISOString(),
  };
}

function save(result: ScrapeResult, diff: DiffResult): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  writeFileSync(APPS_FILE, JSON.stringify(result, null, 2), "utf-8");
  writeFileSync(DIFF_FILE, JSON.stringify(diff, null, 2), "utf-8");
  console.log(`[scraper] Saved ${result.total_apps} apps to ${APPS_FILE}`);
  console.log(`[scraper] Diff saved to ${DIFF_FILE}`);
}

async function main() {
  const startTime = Date.now();

  const previous = loadPreviousData();
  const apps = await scrape();

  const result: ScrapeResult = {
    scraped_at: new Date().toISOString(),
    scraper_version: SCRAPER_VERSION,
    source_url: config.target_url,
    total_apps: apps.length,
    content_hash: computeHash(apps),
    apps,
  };

  const diff = computeDiff(apps, previous);
  save(result, diff);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[scraper] Done in ${elapsed}s`);
  console.log(
    `[scraper] New: ${diff.new_apps.length}, Removed: ${diff.removed_apps.length}, Updated: ${diff.updated_apps.length}`
  );

  if (diff.new_apps.length > 0) {
    console.log("[scraper] New apps detected:");
    for (const app of diff.new_apps) {
      console.log(`  - ${app.name} (${app.category}, ${app.play_count})`);
    }
  }
}

main().catch((err) => {
  console.error("[scraper] Fatal error:", err);
  process.exit(1);
});
