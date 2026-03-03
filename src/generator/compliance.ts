import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..", "..");
const COMPLIANCE_FILE = join(PROJECT_ROOT, "config", "compliance.yaml");

export interface ComplianceResult {
  passed: boolean;
  hits: string[];
  reasons: string[];
  requiresManualReview: boolean;
}

interface ComplianceConfig {
  ng_words: string[];
}

function parseYamlList(text: string, key: string): string[] {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `${key}:`);
  if (start === -1) return [];

  const values: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith("  - ")) break;
    values.push(line.replace("  - ", "").trim().replace(/^"|"$/g, ""));
  }
  return values;
}

export function loadComplianceConfig(): ComplianceConfig {
  const raw = readFileSync(COMPLIANCE_FILE, "utf-8");
  return {
    ng_words: parseYamlList(raw, "ng_words"),
  };
}

const FINANCIAL_CLAIM_PATTERNS: RegExp[] = [
  /(絶対|確実)(に)?(稼げる|儲かる|利益)/i,
  /(簡単|誰でも).{0,8}(稼げる|儲かる)/i,
  /(ノーリスク|risk\s*free|guaranteed\s*profit)/i,
  /(元本).{0,6}(保証)/i,
];

const FINANCIAL_TOPIC_MARKERS = ["稼ぎ方", "報酬", "換金", "口座開設", "アフィリエイト"];

export function runComplianceCheck(articleContent: string): ComplianceResult {
  const { ng_words } = loadComplianceConfig();
  const lowered = articleContent.toLowerCase();
  const hits = ng_words.filter((word) => lowered.includes(word.toLowerCase()));

  const reasons: string[] = [];

  if (hits.length > 0) {
    reasons.push("ng_word_detected");
  }

  const claimHits = FINANCIAL_CLAIM_PATTERNS.filter((pattern) => pattern.test(articleContent));
  if (claimHits.length > 0) {
    reasons.push("financial_claim_pattern_detected");
  }

  const hasFinancialTopic = FINANCIAL_TOPIC_MARKERS.some((marker) => articleContent.includes(marker));
  if (hasFinancialTopic) {
    reasons.push("financial_topic_included_manual_review_required");
  }

  const requiresManualReview = hasFinancialTopic || hits.length > 0 || claimHits.length > 0;

  return {
    passed: hits.length === 0 && claimHits.length === 0,
    hits,
    reasons,
    requiresManualReview,
  };
}
