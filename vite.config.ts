import { defineConfig } from "vite";
import { resolve } from "path";
import dts from "vite-plugin-dts";

export default defineConfig({
    plugins: [
        dts({
            insertTypesEntry: true,
            rollupTypes: true,
            exclude: ["src/__tests__/**"],
        }),
    ],
    build: {
        lib: {
            entry: resolve(__dirname, "src/index.ts"),
            name: "Streakr",
            formats: ["es", "cjs"],
            fileName: (format) => `streakr.${format === "es" ? "es" : "cjs"}.js`,
        },
        rollupOptions: {
            external: [],
        },
        sourcemap: true,
        minify: "esbuild",
    },
});
