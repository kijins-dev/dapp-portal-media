import { execSync } from "child_process";
import { readFileSync, copyFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { DiffResult } from "../scraper/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..", "..");
const DATA_DIR = join(PROJECT_ROOT, "data");
const DRAFTS_DIR = join(PROJECT_ROOT, "drafts");
const SITE_GAMES_DIR = join(PROJECT_ROOT, "site", "src", "content", "games");
const DIFF_FILE = join(DATA_DIR, "diff.json");

function run(cmd: string, label: string): void {
  console.log(`\n[pipeline] === ${label} ===`);
  try {
    execSync(cmd, {
      cwd: PROJECT_ROOT,
      stdio: "inherit",
      env: { ...process.env },
    });
  } catch (err) {
    console.error(`[pipeline] ${label} failed`);
    throw err;
  }
}

async function main() {
  const startTime = Date.now();
  const mode = process.argv[2] || "new";

  console.log("[pipeline] Starting pipeline...");
  console.log(`[pipeline] Mode: ${mode}`);

  // Step 1: Scrape
  run("npx tsx src/scraper/index.ts", "Scrape");

  // Step 2: Generate articles
  if (mode === "all") {
    run("npx tsx src/generator/index.ts all", "Generate (all)");
  } else {
    // Check if there are new apps
    if (existsSync(DIFF_FILE)) {
      const diff: DiffResult = JSON.parse(readFileSync(DIFF_FILE, "utf-8"));
      if (diff.new_apps.length === 0) {
        console.log("[pipeline] No new apps detected. Skipping generation.");
      } else {
        console.log(
          `[pipeline] ${diff.new_apps.length} new apps found. Generating articles...`
        );
        run("npx tsx src/generator/index.ts new", "Generate (new)");
      }
    }
  }

  // Step 3: Copy drafts to site content (skip already-published articles)
  if (existsSync(DRAFTS_DIR)) {
    if (!existsSync(SITE_GAMES_DIR)) {
      mkdirSync(SITE_GAMES_DIR, { recursive: true });
    }

    const { readdirSync } = await import("fs");
    const drafts = readdirSync(DRAFTS_DIR).filter((f) => f.endsWith(".md"));

    console.log(`\n[pipeline] === Copy Drafts to Site ===`);
    let copied = 0;
    let skipped = 0;
    for (const draft of drafts) {
      const src = join(DRAFTS_DIR, draft);
      const dest = join(SITE_GAMES_DIR, draft);

      // Skip if published article already exists (draft: false)
      if (existsSync(dest)) {
        const content = readFileSync(dest, "utf-8");
        if (/^draft:\s*false$/m.test(content)) {
          console.log(`[pipeline] Skipped (published): ${draft}`);
          skipped++;
          continue;
        }
      }

      copyFileSync(src, dest);
      console.log(`[pipeline] Copied: ${draft}`);
      copied++;
    }
    console.log(
      `[pipeline] ${copied} drafts copied, ${skipped} published articles preserved`
    );
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n[pipeline] Pipeline complete in ${elapsed}s`);
}

main().catch((err) => {
  console.error("[pipeline] Fatal error:", err);
  process.exit(1);
});
