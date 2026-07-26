import { defineConfig, type Plugin } from "vite";
import { resolve } from "path";
import { shellHtml } from "./demo/shell";
import pkg from "./package.json";

const ROOT_DIV = '<div id="root"></div>';
const VERSION_TOKEN = "__STREAKR_VERSION__";

// Bakes the landing markup into index.html so crawlers and social scrapers that
// never execute JavaScript still receive the full page. main.ts renders the same
// shellHtml() at boot, so the served HTML and the hydrated DOM cannot drift.
// Also stamps the released version into the JSON-LD, which semantic-release bumps.
function prerenderShell(): Plugin {
  return {
    name: "streakr-prerender-shell",
    apply: "build",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        for (const token of [ROOT_DIV, VERSION_TOKEN]) {
          if (!html.includes(token)) {
            throw new Error(`prerender: expected ${token} in index.html`);
          }
        }
        return html
          .replace(ROOT_DIV, `<div id="root">${shellHtml()}</div>`)
          .replace(VERSION_TOKEN, pkg.version);
      },
    },
  };
}

export default defineConfig({
  base: "/",
  plugins: [prerenderShell()],
  build: {
    outDir: "dist-demo",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
      },
    },
  },
});
