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
            external: [/^node:/, "child_process", "fs", "path", "os", "util"],
        },
        sourcemap: true,
        minify: "esbuild",
    },
});
