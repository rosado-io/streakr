import { copyFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  publicDir: false,
  plugins: [
    dts({
      insertTypesEntry: true,
      bundleTypes: true,
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
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: () => "streakr.js",
    },
    sourcemap: true,
    minify: "esbuild",
  },
});
