import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const games = defineCollection({
  loader: glob({ base: "./src/content/games", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    game_name: z.string(),
    category: z.string(),
    play_count: z.string(),
    published_at: z.coerce.date(),
    updated_at: z.coerce.date(),
    referral_link: z.string().optional().default(""),
    tags: z.array(z.string()),
    description: z.string(),
    source_urls: z.array(z.string()).optional().default([]),
    template_variant: z.string().optional().default("standard"),
    compliance_check: z.string().optional().default("pending"),
    generation_model: z.string().optional().default(""),
    draft: z.boolean().optional().default(false),
  }),
});

const guides = defineCollection({
  loader: glob({ base: "./src/content/guides", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    published_at: z.coerce.date(),
    updated_at: z.coerce.date(),
    draft: z.boolean().optional().default(false),
  }),
});

export const collections = { games, guides };
