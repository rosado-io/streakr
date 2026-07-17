import { copyFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      rollupTypes: true,
      exclude: ["src/__tests__/**"],
    }),
    {
      name: "copy-styles",
      closeBundle() {
        copyFileSync("src/component/streakr.css", "dist/streakr.css");
      },
    },
  ],
  build: {
    target: "es2020",
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        agents: resolve(__dirname, "src/agents.ts"),
      },
      formats: ["es", "cjs"],
      fileName: (format, entryName) => {
        const base = entryName === "index" ? "streakr" : entryName;
        return `${base}.${format === "es" ? "es" : "cjs"}.js`;
      },
    },
    rollupOptions: {
      external: [/^node:/],
    },
    sourcemap: true,
    minify: "esbuild",
  },
});
