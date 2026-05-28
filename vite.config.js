import path from "node:path";
import { fileURLToPath } from "node:url";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = (file) => path.resolve(__dirname, "src", file);

// Array form so we control ordering: longest prefix first.
const cosuousAlias = [
  { find: "cosuous/h", replacement: src("h.ts") },
  { find: "cosuous/signal", replacement: src("signal.ts") },
  { find: "cosuous/template", replacement: src("template.ts") },
  { find: "cosuous/hydrate", replacement: src("hydrate.ts") },
  { find: "cosuous/map", replacement: src("map.ts") },
  { find: /^cosuous$/, replacement: src("index.ts") },
];

// Each public entry of the library. alien-signals is intentionally NOT
// listed as external; it gets inlined so consumers don't need a separate
// runtime dependency. htm is vendored in-tree (see src/htm.ts for the
// Sinuous-era patches we depend on).
const libraryEntries = {
  index: src("index.ts"),
  h: src("h.ts"),
  hydrate: src("hydrate.ts"),
  map: src("map.ts"),
  signal: src("signal.ts"),
  template: src("template.ts"),
};

export default defineConfig({
  resolve: { alias: cosuousAlias },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    minify: "oxc",
    sourcemap: true,
    target: "es2020",
    lib: {
      entry: libraryEntries,
      formats: ["es"],
    },
    rollupOptions: {
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name]-[hash].js",
        // Name the shared htm chunk explicitly; otherwise Rolldown falls back
        // to a generic "src-…" name based on the source directory.
        manualChunks(id) {
          if (id.endsWith("/src/htm.ts")) return "htm";
        },
      },
    },
  },
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      reporter: ["text", "html", "lcov"],
    },
    projects: [
      {
        extends: true,
        resolve: { alias: cosuousAlias },
        test: {
          name: "node",
          environment: "node",
          include: ["test/htm/**/*.js"],
          // Don't sweep bench files into this project; they have their own.
          benchmark: { include: [] },
        },
      },
      {
        extends: true,
        resolve: { alias: cosuousAlias },
        test: {
          name: "browser",
          include: ["test/**/*.js"],
          exclude: ["test/htm/**", "test/_*.js", "test/_*.mjs", "test/**/perf/**", "test/test.js"],
          benchmark: {
            include: ["bench/h.bench.js", "bench/map.bench.js"],
          },
          setupFiles: ["test/_setup.js"],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: "chromium" }],
          },
        },
      },
      {
        extends: true,
        resolve: { alias: cosuousAlias },
        test: {
          name: "bench-node",
          environment: "node",
          // No `include` - this project only contributes to `vitest bench`.
          benchmark: { include: ["bench/signal.bench.js"] },
        },
      },
    ],
  },
});
