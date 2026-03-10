// @ts-check
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

export default defineConfig({
  site: "https://dapp-portal-guide.com",
  integrations: [mdx(), sitemap()],
  markdown: {
    shikiConfig: {
      theme: "github-dark",
    },
    rehypePlugins: [rehypeLazyImages],
  },
});
