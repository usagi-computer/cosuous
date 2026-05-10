import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { playwright } from "@vitest/browser-playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = (file) => path.resolve(__dirname, "src", file);

// Array form so we control ordering: longest prefix first.
const cosuousAlias = [
  { find: "cosuous/h", replacement: src("h.js") },
  { find: "cosuous/htm", replacement: src("htm.js") },
  { find: "cosuous/observable", replacement: src("observable.js") },
  { find: "cosuous/template", replacement: src("template.js") },
  { find: "cosuous/hydrate", replacement: src("hydrate.js") },
  { find: "cosuous/map", replacement: src("map.js") },
  { find: /^cosuous$/, replacement: src("index.js") },
];

export default defineConfig({
  resolve: {
    alias: cosuousAlias,
  },
  build: {
    lib: {
      entry: src("babel-plugin-htm.js"),
      formats: ["cjs"],
      fileName: () => "babel-plugin-htm.cjs",
    },
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      external: ["@babel/core", "@babel/types"],
    },
  },
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.js"],
      exclude: ["src/babel-plugin-htm.js"],
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
        },
      },
      {
        extends: true,
        resolve: { alias: cosuousAlias },
        test: {
          name: "browser",
          include: ["test/**/*.js"],
          exclude: ["test/htm/**", "test/_*.js", "test/**/perf/**", "test/test.js"],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
