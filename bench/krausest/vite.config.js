import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distRoot = path.resolve(__dirname, "../../dist");

// Resolve cosuous imports against the built dist/ so the benchmark exercises
// the artifact we actually ship.
export default defineConfig({
  root: __dirname,
  base: "./",
  resolve: {
    alias: [
      { find: "cosuous/map", replacement: path.join(distRoot, "map.js") },
      { find: "cosuous/signal", replacement: path.join(distRoot, "signal.js") },
      { find: /^cosuous$/, replacement: path.join(distRoot, "index.js") },
    ],
  },
  build: {
    outDir: "dist",
    target: "es2020",
    minify: "oxc",
    rollupOptions: { input: path.resolve(__dirname, "index.html") },
  },
});
