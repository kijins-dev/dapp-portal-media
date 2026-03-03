import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { AppData, ScrapeResult, DiffResult } from "../scraper/types.js";
import type { GenerateRequest, GeneratedArticle } from "./types.js";
import { buildPrompt, pickVariant } from "./prompts.js";
import { runComplianceCheck } from "./compliance.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..", "..");
const DATA_DIR = join(PROJECT_ROOT, "data");
const DRAFTS_DIR = join(PROJECT_ROOT, "drafts");
const APPS_FILE = join(DATA_DIR, "apps.json");
const DIFF_FILE = join(DATA_DIR, "diff.json");
const REVIEW_QUEUE_FILE = join(DATA_DIR, "review-queue.json");
const DEAD_LETTER_FILE = join(DATA_DIR, "dead-letter.json");

const MODEL = "claude-haiku-4-5-20251001";

const DISCLAIMER = `
---

**免責事項**

※本記事の情報は執筆時点のものです。最新の情報は公式サイトをご確認ください。
※暗号資産の取引にはリスクが伴います。投資は自己責任でお願いします。
※本記事にはアフィリエイトリンクが含まれる場合があります。
`;

function buildFrontmatter(app: AppData, variant: string, model: string): string {
  const now = new Date().toISOString().split("T")[0];
  return `---
title: "${app.name}の遊び方・攻略ガイド【LINE Dapp Portal】"
slug: ${app.slug}
game_name: ${app.name}
category: ${app.category}
play_count: "${app.play_count}"
published_at: ${now}
updated_at: ${now}
referral_link: ""
tags: ["${app.category}", "LINE Dapp Portal", "攻略"]
description: "LINE Dapp Portalの${app.name}の遊び方、攻略のコツ、報酬の稼ぎ方を解説。${app.play_count}人がプレイ中の人気${app.category}ゲーム。"
source_urls:
  - "${app.detail_url}"
template_variant: "${variant}"
compliance_check: "pending"
generation_model: "${model}"
draft: true
---
`;
}

async function generateArticle(
  client: Anthropic,
  app: AppData
): Promise<GeneratedArticle> {
  const variant = pickVariant();
  const req: GenerateRequest = {
    app: {
      name: app.name,
      slug: app.slug,
      category: app.category,
      play_count: app.play_count,
      play_count_raw: app.play_count_raw,
      detail_url: app.detail_url,
      thumbnail_url: app.thumbnail_url,
      rewards: app.rewards,
    },
    templateVariant: variant,
  };

  const prompt = buildPrompt(req);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  const frontmatter = buildFrontmatter(app, variant, MODEL);
  const fullContent = frontmatter + "\n" + text + "\n" + DISCLAIMER;

  return {
    slug: app.slug,
    frontmatter: { variant, model: MODEL },
    content: fullContent,
    model: MODEL,
    tokens_used: {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
    },
    generated_at: new Date().toISOString(),
  };
}

function saveDraft(article: GeneratedArticle): string {
  if (!existsSync(DRAFTS_DIR)) {
    mkdirSync(DRAFTS_DIR, { recursive: true });
  }
  const filePath = join(DRAFTS_DIR, `${article.slug}.md`);
  writeFileSync(filePath, article.content, "utf-8");
  return filePath;
}

function loadJsonFile<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

function saveReviewQueueEntry(
  slug: string,
  hits: string[],
  reasons: string[],
  draftPath: string
): void {
  const queue = loadJsonFile<Array<Record<string, unknown>>>(REVIEW_QUEUE_FILE, []);
  queue.push({
    slug,
    reason: reasons.join(",") || "manual_review_required",
    hits,
    reasons,
    draft_path: draftPath,
    created_at: new Date().toISOString(),
  });
  writeFileSync(REVIEW_QUEUE_FILE, JSON.stringify(queue, null, 2), "utf-8");
}

function updateDeadLetter(failures: { slug: string; error: string }[]): void {
  const state = loadJsonFile<Record<string, { count: number; last_error: string; updated_at: string }>>(
    DEAD_LETTER_FILE,
    {}
  );

  for (const failure of failures) {
    const current = state[failure.slug] ?? { count: 0, last_error: "", updated_at: "" };
    state[failure.slug] = {
      count: current.count + 1,
      last_error: failure.error,
      updated_at: new Date().toISOString(),
    };
  }

  writeFileSync(DEAD_LETTER_FILE, JSON.stringify(state, null, 2), "utf-8");
}

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || "new"; // "new" = diff only, "all" = all apps, "single" = specific app

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      "[generator] ANTHROPIC_API_KEY is not set. Set it as an environment variable."
    );
    process.exit(1);
  }

  const client = new Anthropic();

  // Load app data
  if (!existsSync(APPS_FILE)) {
    console.error("[generator] No apps data found. Run scraper first.");
    process.exit(1);
  }

  const scrapeData: ScrapeResult = JSON.parse(
    readFileSync(APPS_FILE, "utf-8")
  );

  let appsToGenerate: AppData[];

  if (mode === "single" && args[1]) {
    const slug = args[1];
    const app = scrapeData.apps.find((a) => a.slug === slug);
    if (!app) {
      console.error(`[generator] App not found: ${slug}`);
      process.exit(1);
    }
    appsToGenerate = [app];
  } else if (mode === "all") {
    appsToGenerate = scrapeData.apps;
  } else {
    // "new" mode - only generate for new apps from diff
    if (!existsSync(DIFF_FILE)) {
      console.error("[generator] No diff data found. Run scraper first.");
      process.exit(1);
    }
    const diff: DiffResult = JSON.parse(readFileSync(DIFF_FILE, "utf-8"));
    appsToGenerate = diff.new_apps;

    if (appsToGenerate.length === 0) {
      console.log("[generator] No new apps to generate articles for.");
      return;
    }
  }

  console.log(
    `[generator] Generating articles for ${appsToGenerate.length} apps (mode: ${mode})`
  );

  const results: {
    slug: string;
    success: boolean;
    error?: string;
    tokens?: { input: number; output: number };
    compliancePassed?: boolean;
  }[] = [];

  for (const app of appsToGenerate) {
    try {
      console.log(`[generator] Generating: ${app.name} (${app.slug})...`);
      const article = await generateArticle(client, app);
      const filePath = saveDraft(article);

      const compliance = runComplianceCheck(article.content);
      if (compliance.requiresManualReview) {
        saveReviewQueueEntry(app.slug, compliance.hits, compliance.reasons, filePath);
        console.warn(
          `[generator] Compliance flagged: ${app.slug} (${compliance.reasons.join(", ")}) -> queued for manual review`
        );
      }

      console.log(
        `[generator] Saved: ${filePath} (${article.tokens_used.input}+${article.tokens_used.output} tokens)`
      );
      results.push({
        slug: app.slug,
        success: true,
        tokens: article.tokens_used,
        compliancePassed: compliance.passed,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[generator] Failed: ${app.name} - ${message}`);
      results.push({ slug: app.slug, success: false, error: message });
    }
  }

  // Summary
  const succeeded = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);
  const complianceQueued = results.filter((r) => r.success && r.compliancePassed === false);
  const totalInput = succeeded.reduce((sum, r) => sum + (r.tokens?.input || 0), 0);
  const totalOutput = succeeded.reduce((sum, r) => sum + (r.tokens?.output || 0), 0);

  console.log(`\n[generator] Done.`);
  console.log(`[generator] Success: ${succeeded.length}, Failed: ${failed.length}`);
  console.log(`[generator] Compliance queued: ${complianceQueued.length}`);
  console.log(`[generator] Total tokens: ${totalInput} input, ${totalOutput} output`);

  if (failed.length > 0) {
    const failedFile = join(DATA_DIR, "generation-failures.json");
    writeFileSync(failedFile, JSON.stringify(failed, null, 2), "utf-8");
    console.log(`[generator] Failures saved to ${failedFile}`);
    updateDeadLetter(
      failed.map((f) => ({
        slug: f.slug,
        error: f.error || "unknown error",
      }))
    );
    console.log(`[generator] Dead-letter state updated: ${DEAD_LETTER_FILE}`);
  }
}

main().catch((err) => {
  console.error("[generator] Fatal error:", err);
  process.exit(1);
});
