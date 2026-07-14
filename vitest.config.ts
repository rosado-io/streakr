import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        environment: "happy-dom",
        css: true,
        coverage: {
            provider: "v8",
            reporter: ["text", "lcov"],
            include: ["src/**/*.ts"],
            exclude: ["src/index.ts", "src/types/**"],
        },
    },
});
