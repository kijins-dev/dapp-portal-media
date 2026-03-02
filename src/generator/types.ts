export interface GenerateRequest {
  app: {
    name: string;
    slug: string;
    category: string;
    play_count: string;
    play_count_raw: number;
    detail_url: string;
    thumbnail_url: string;
    rewards: string[];
  };
  templateVariant: string;
}

export interface GeneratedArticle {
  slug: string;
  frontmatter: Record<string, unknown>;
  content: string;
  model: string;
  tokens_used: { input: number; output: number };
  generated_at: string;
}
