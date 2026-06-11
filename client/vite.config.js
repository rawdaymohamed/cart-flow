import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5000",
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/setupTests.js",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"], // 'html' generates a clickable UI report!
      include: ["src/**/*"], // Only check files in src
      exclude: [
        "src/main.jsx",
        "src/vite-env.d.ts",
        "**/*.test.jsx", // Don't profile the test files themselves
      ],
    },
  },
});
