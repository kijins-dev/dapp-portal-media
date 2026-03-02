export interface AppData {
  name: string;
  slug: string;
  category: string;
  play_count: string;
  play_count_raw: number;
  thumbnail_url: string;
  detail_url: string;
  first_seen: string;
  last_seen: string;
  rewards: string[];
  source_urls: string[];
  fetched_at: string;
}

export interface ScrapeResult {
  scraped_at: string;
  scraper_version: string;
  source_url: string;
  total_apps: number;
  content_hash: string;
  apps: AppData[];
}

export interface DiffResult {
  new_apps: AppData[];
  removed_apps: AppData[];
  updated_apps: {
    app: AppData;
    changes: string[];
  }[];
  timestamp: string;
}

export interface ScraperConfig {
  target_url: string;
  user_agent: string;
  wait_timeout: number;
  viewport: { width: number; height: number };
}
