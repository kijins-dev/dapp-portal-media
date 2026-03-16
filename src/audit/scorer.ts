/**
 * Rewrite-score calculator using percentile rank
 * Score 0-100: higher = more likely needs rewrite
 * Percentile rank is more stable than z-score for small datasets (n=76)
 */
import type { ArticleSnapshot, ScoredArticle, AuditConfig } from "./types.js";

/**
 * Percentile rank: what % of values is this value greater than or equal to?
 * Returns 0-100. For "lower is worse" metrics, low percentile = high rewrite need.
 */
function percentileRank(value: number, sorted: number[]): number {
  if (sorted.length === 0) return 50;
  let count = 0;
  for (const v of sorted) {
    if (value > v) count++;
    else if (value === v) count += 0.5;
  }
  return (count / sorted.length) * 100;
}

export function scoreArticles(
  snapshots: ArticleSnapshot[],
  config: AuditConfig,
): ScoredArticle[] {
  const weights = config.scoring.weights;

  // Only score articles that have at least one data source
  const scorable = snapshots.filter((s) => s.ga4 !== null || s.gsc !== null);

  // Collect and sort metric arrays for percentile calculation
  const pvValues = scorable.filter((s) => s.ga4).map((s) => s.ga4!.pageviews).sort((a, b) => a - b);
  const sessionValues = scorable.filter((s) => s.ga4).map((s) => s.ga4!.avg_session_duration).sort((a, b) => a - b);
  const bounceValues = scorable.filter((s) => s.ga4).map((s) => s.ga4!.bounce_rate).sort((a, b) => a - b);
  const gscValues = scorable.filter((s) => s.gsc).map((s) => s.gsc!.clicks + s.gsc!.impressions * 0.1).sort((a, b) => a - b);

  const results: ScoredArticle[] = [];

  for (const snap of snapshots) {
    // P0: has GSC data but zero impressions → not indexed
    if (snap.gsc && snap.gsc.impressions === 0) {
      results.push({
        slug: snap.slug,
        game_name: snap.game_name,
        rewrite_score: 100,
        priority: "P0",
        signals: { pv_pctl: 0, session_pctl: 0, bounce_pctl: 0, gsc_pctl: 0 },
        reason: "未インデックス (impressions=0): 技術SEO修正が必要",
      });
      continue;
    }

    // Skip articles with no data at all (not scorable)
    if (!snap.ga4 && !snap.gsc) {
      results.push({
        slug: snap.slug,
        game_name: snap.game_name,
        rewrite_score: -1,
        priority: "P2",
        signals: { pv_pctl: -1, session_pctl: -1, bounce_pctl: -1, gsc_pctl: -1 },
        reason: "データなし (スコアリング対象外)",
      });
      continue;
    }

    let totalWeight = 0;
    let weightedScore = 0;
    let pvPctl = -1;
    let sessionPctl = -1;
    let bouncePctl = -1;
    let gscPctl = -1;

    if (snap.ga4) {
      pvPctl = percentileRank(snap.ga4.pageviews, pvValues);
      sessionPctl = percentileRank(snap.ga4.avg_session_duration, sessionValues);
      bouncePctl = percentileRank(snap.ga4.bounce_rate, bounceValues);

      // Lower percentile in PV/session = needs rewrite more → invert
      weightedScore += (100 - pvPctl) * weights.pv;
      totalWeight += weights.pv;

      weightedScore += (100 - sessionPctl) * weights.session_duration;
      totalWeight += weights.session_duration;

      // Higher bounce percentile = needs rewrite more → no invert
      weightedScore += bouncePctl * weights.bounce_rate;
      totalWeight += weights.bounce_rate;
    }

    if (snap.gsc) {
      const gscComposite = snap.gsc.clicks + snap.gsc.impressions * 0.1;
      gscPctl = percentileRank(gscComposite, gscValues);

      // Lower GSC percentile = needs rewrite more → invert
      weightedScore += (100 - gscPctl) * weights.gsc;
      totalWeight += weights.gsc;
    }

    const rewriteScore = totalWeight > 0
      ? Math.round(weightedScore / totalWeight)
      : -1;

    results.push({
      slug: snap.slug,
      game_name: snap.game_name,
      rewrite_score: rewriteScore,
      priority: "P2",
      signals: {
        pv_pctl: round2(pvPctl),
        session_pctl: round2(sessionPctl),
        bounce_pctl: round2(bouncePctl),
        gsc_pctl: round2(gscPctl),
      },
      reason: "",
    });
  }

  return results;
}

function round2(v: number): number {
  return v < 0 ? -1 : parseFloat(v.toFixed(1));
}

export function assignPriorities(scored: ScoredArticle[]): ScoredArticle[] {
  // P0 already assigned; filter out no-data articles
  const scorable = scored.filter((s) => s.priority !== "P0" && s.rewrite_score >= 0);

  // Sort by rewrite_score descending
  scorable.sort((a, b) => b.rewrite_score - a.rewrite_score);

  // Top 3 → P1
  for (let i = 0; i < Math.min(3, scorable.length); i++) {
    scorable[i].priority = "P1";
    scorable[i].reason = `リライト候補 (スコア上位${i + 1}位)`;
  }

  // Rest → P2
  for (let i = 3; i < scorable.length; i++) {
    scorable[i].priority = "P2";
    scorable[i].reason = "様子見";
  }

  return scored;
}
