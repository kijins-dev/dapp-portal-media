import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { collectAll } from "./collector.js";
import { computeMetrics, buildRanking, updateHistory } from "./metrics.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..", "..");
const DATA_DIR = join(PROJECT_ROOT, "data", "onchain");
const HISTORY_DIR = join(DATA_DIR, "history");

async function main(): Promise<void> {
  const start = Date.now();
  console.log("=== Onchain Data Collection ===\n");

  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(HISTORY_DIR)) mkdirSync(HISTORY_DIR, { recursive: true });

  let successCount = 0;
  let failCount = 0;

  try {
    console.log("[1/3] Collecting Transfer events...");
    const collected = await collectAll();

    successCount = collected.filter((g) =>
      g.tokens.some((t) => t.transfers.length > 0),
    ).length;
    failCount = collected.filter((g) =>
      g.tokens.every((t) => t.transfers.length === 0),
    ).length;

    console.log("\n[2/3] Computing metrics...");
    const metrics = computeMetrics(collected);

    writeFileSync(
      join(DATA_DIR, "game-metrics.json"),
      JSON.stringify(
        {
          generated_at: new Date().toISOString(),
          games: metrics,
        },
        null,
        2,
      ),
      "utf-8",
    );
    console.log(`  → game-metrics.json (${metrics.length} games)`);

    console.log("\n[3/3] Building ranking...");
    const ranking = buildRanking(metrics);

    writeFileSync(
      join(DATA_DIR, "ranking.json"),
      JSON.stringify(
        {
          generated_at: new Date().toISOString(),
          entries: ranking,
        },
        null,
        2,
      ),
      "utf-8",
    );
    console.log(`  → ranking.json (${ranking.length} entries)`);

    updateHistory(metrics);
    console.log("  → history/ updated");
  } catch (err) {
    console.error(
      `\nFatal error: ${err instanceof Error ? err.message : String(err)}`,
    );
    process.exitCode = 1;
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n=== Done in ${elapsed}s ===`);
  console.log(`  Success: ${successCount} | Failed: ${failCount}`);
}

main();
