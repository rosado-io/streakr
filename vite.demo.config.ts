import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  base: "/",
  build: {
    outDir: "dist-demo",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        mobile: resolve(__dirname, "demo/mobile.html"),
      },
    },
  },
});
