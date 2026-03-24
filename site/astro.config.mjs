// @ts-check
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

/** Add loading="lazy" to all img tags */
function rehypeLazyImages() {
  return (tree) => {
    const visit = (node) => {
      if (node.tagName === "img" && node.properties) {
        node.properties.loading = "lazy";
        node.properties.decoding = "async";
      }
      if (node.children) node.children.forEach(visit);
    };
    visit(tree);
  };
}

/** Build URL -> lastmod map from content frontmatter */
function buildLastmodMap() {
  const map = new Map();
  const contentDir = new URL("./src/content", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");

  // Game articles: /games/{slug}/
  const gamesDir = join(contentDir, "games");
  for (const file of readdirSync(gamesDir).filter((f) => f.endsWith(".md"))) {
    const content = readFileSync(join(gamesDir, file), "utf-8");
    const match = content.match(/^updated_at:\s*(\d{4}-\d{2}-\d{2})/m);
    if (match) {
      const slug = file.replace(/\.md$/, "");
      map.set(`https://dapp-portal-guide.com/games/${slug}/`, match[1]);
    }
  }

  // Guide articles: /guide/{slug}/
  const guidesDir = join(contentDir, "guides");
  for (const file of readdirSync(guidesDir).filter((f) => f.endsWith(".md"))) {
    const content = readFileSync(join(guidesDir, file), "utf-8");
    const match = content.match(/^updated_at:\s*(\d{4}-\d{2}-\d{2})/m);
    if (match) {
      const slug = file.replace(/\.md$/, "");
      map.set(`https://dapp-portal-guide.com/guide/${slug}/`, match[1]);
    }
  }

  return map;
}

const lastmodMap = buildLastmodMap();

export default defineConfig({
  site: "https://dapp-portal-guide.com",
  integrations: [
    mdx(),
    sitemap({
      serialize(item) {
        const lastmod = lastmodMap.get(item.url);
        if (lastmod) {
          item.lastmod = new Date(lastmod).toISOString();
        } else {
          // Static pages: use a reasonable default
          item.lastmod = new Date("2026-03-10").toISOString();
        }
        return item;
      },
    }),
  ],
  markdown: {
    shikiConfig: {
      theme: "github-dark",
    },
    rehypePlugins: [rehypeLazyImages],
  },
});
