/** Performance Audit types */

export interface AuditConfig {
  ga4: {
    property_id: string;
    date_range_days: number;
  };
  gsc: {
    site_url: string;
    date_range_days: number;
  };
  scoring: {
    weights: {
      pv: number;
      session_duration: number;
      bounce_rate: number;
      gsc: number;
    };
    min_data_days: number;
    min_articles_with_data: number;
  };
}

export interface GA4Row {
  slug: string;
  page_path: string;
  pageviews: number;
  sessions: number;
  avg_session_duration: number;
  bounce_rate: number;
}

export interface GSCRow {
  slug: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface ArticleSnapshot {
  slug: string;
  game_name: string;
  category: string;
  template_variant: string;
  published_at: string;
  ga4: GA4Row | null;
  gsc: GSCRow | null;
  collected_at: string;
}

export interface ScoredArticle {
  slug: string;
  game_name: string;
  rewrite_score: number;
  priority: "P0" | "P1" | "P2";
  signals: {
    pv_pctl: number;
    session_pctl: number;
    bounce_pctl: number;
    gsc_pctl: number;
  };
  reason: string;
}

export interface AuditResult {
  generated_at: string;
  config: {
    ga4_property_id: string;
    gsc_site_url: string;
    date_range_days: number;
  };
  data_sufficient: boolean;
  data_reason: string | null;
  total_articles: number;
  articles_with_ga4: number;
  articles_with_gsc: number;
  scored: ScoredArticle[];
  snapshots: ArticleSnapshot[];
}

/** Slim history entry — only key metrics, not full snapshots */
export interface HistoryMetric {
  slug: string;
  pv: number | null;
  sessions: number | null;
  bounce_rate: number | null;
  gsc_clicks: number | null;
  gsc_impressions: number | null;
  gsc_position: number | null;
}

export interface PerfHistoryEntry {
  week: string;
  metrics: HistoryMetric[];
}

export interface PerfHistory {
  weeks: PerfHistoryEntry[];
}

export interface ServiceAccountKey {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
}

export interface ArticleFrontmatter {
  slug: string;
  game_name: string;
  category: string;
  template_variant: string;
  published_at: string;
  draft: boolean;
}
