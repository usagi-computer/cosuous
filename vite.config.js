import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = (file) => path.resolve(__dirname, "src", file);

// Array form so we control ordering: longest prefix first.
const cosuousAlias = [
  { find: "cosuous/h", replacement: src("h.js") },
  { find: "cosuous/signal", replacement: src("signal.js") },
  { find: "cosuous/template", replacement: src("template.js") },
  { find: "cosuous/hydrate", replacement: src("hydrate.js") },
  { find: "cosuous/map", replacement: src("map.js") },
  { find: /^cosuous$/, replacement: src("index.js") },
];

// Each public entry of the library. alien-signals is intentionally NOT
// listed as external; it gets inlined so consumers don't need a separate
// runtime dependency. htm is vendored in-tree (see src/htm.js for the
// Sinuous-era patches we depend on).
const libraryEntries = {
  index: src("index.js"),
  h: src("h.js"),
  hydrate: src("hydrate.js"),
  map: src("map.js"),
  signal: src("signal.js"),
  template: src("template.js"),
};

// Inline plugin: copy the hand-written .d.ts files from src/ to dist/ after
// the library build so package.json#exports.<entry>.types still resolves.
function copyDtsPlugin() {
  return {
    name: "cosuous-copy-dts",
    async closeBundle() {
      const srcDir = path.resolve(__dirname, "src");
      const distDir = path.resolve(__dirname, "dist");
      await fs.mkdir(distDir, { recursive: true });
      const entries = await fs.readdir(srcDir);
      for (const file of entries) {
        if (file.endsWith(".d.ts")) {
          await fs.copyFile(path.join(srcDir, file), path.join(distDir, file));
        }
      }
    },
  };
}

export default defineConfig({
  resolve: { alias: cosuousAlias },
  plugins: [copyDtsPlugin()],
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
          if (id.endsWith("/src/htm.js")) return "htm";
        },
      },
    },
  },
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.js"],
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
