/*
 * Size benchmark. Walks dist/, computes raw / gzip / brotli sizes per entry,
 * prints a markdown table, and (with --ci) diffs against bench/size.baseline.json,
 * failing if any entry regresses by more than the threshold below.
 *
 * Usage:
 *   node bench/size.js              # print table + write bench/results/size.json
 *   node bench/size.js --ci         # also compare against bench/size.baseline.json
 *   node bench/size.js --update     # write the current snapshot as the baseline
 */

import { Buffer } from "node:buffer";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { brotliCompressSync, gzipSync, constants as zlibConstants } from "node:zlib";

const REGRESSION_THRESHOLD = 0.05; // 5 percent

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const distDir = path.join(repoRoot, "dist");
const resultsDir = path.join(__dirname, "results");
const baselinePath = path.join(__dirname, "size.baseline.json");
const args = new Set(process.argv.slice(2));

async function collectFiles(dir, rel = "") {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const abs = path.join(dir, e.name);
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) {
      out.push(...(await collectFiles(abs, r)));
    } else if (e.isFile() && !e.name.endsWith(".map") && !e.name.endsWith(".d.ts")) {
      out.push({ rel: r, abs });
    }
  }
  return out;
}

function format(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(2)} kB`;
}

function measure(buf) {
  return {
    raw: buf.length,
    gzip: gzipSync(buf, { level: 9 }).length,
    brotli: brotliCompressSync(buf, {
      params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 11 },
    }).length,
  };
}

// Compact gzip figure for prose, e.g. 3922 -> "~3.8kB".
function kb(bytes) {
  return `~${(bytes / 1024).toFixed(1)}kB`;
}

// Add-on rows for the README table. The size shown is the gzip of each module's
// dist entry, i.e. the marginal bytes added to an app that already imports `cosuous`
// (Vite/Rolldown code-splits the shared core into chunks, which are reused).
const ADDONS = [
  {
    name: "[`cosuous/signal`](./src/signal.md)",
    file: "signal.js",
    desc: "Signals with `alien-signals` _(included by default)_",
  },
  { name: "[`cosuous/map`](./src/map.ts)", file: "map.js", desc: "Fast list renderer" },
  {
    name: "[`cosuous/hydrate`](./src/hydrate.md)",
    file: "hydrate.js",
    desc: "Hydrate static HTML",
  },
  {
    name: "[`cosuous/template`](./src/template.md)",
    file: "template.js",
    desc: "Pre-rendered Template",
  },
];

// Bundle a synthetic ESM entry with Rolldown (Vite's bundler), minify, and measure.
// Using the project's own bundler keeps the figures in step with real app builds.
async function bundleGzip(source) {
  const { rolldown } = await import("rolldown");
  const entry = "\0cosuous-size-entry";
  const bundle = await rolldown({
    input: entry,
    logLevel: "silent",
    plugins: [
      {
        name: "size-entry",
        resolveId: (id) => (id === entry ? id : null),
        load: (id) => (id === entry ? source : null),
      },
    ],
  });
  const { output } = await bundle.generate({ format: "esm", minify: true });
  await bundle.close();
  const code = output
    .filter((o) => o.type === "chunk")
    .map((o) => o.code)
    .join("");
  return measure(Buffer.from(code));
}

// The README's hello-world counter: signal core (alien-signals) + `h` core + the
// `html` tagged-template parser.
function helloSource() {
  return [
    `import { signal, html } from ${JSON.stringify(path.join(distDir, "index.js"))};`,
    "const counter = signal(0);",
    "const view = () => html`<div>Counter ${counter}</div>`;",
    "document.body.append(view());",
    "setInterval(() => counter(counter() + 1), 1000);",
  ].join("\n");
}

function buildAddonsTable(rows) {
  const byFile = Object.fromEntries(rows.map((r) => [r.file, r]));
  const lines = ["| Size | Name | Description |", "| --- | --- | --- |"];
  for (const a of ADDONS) {
    lines.push(`| ${kb(byFile[a.file].gzip)} | ${a.name} | ${a.desc} |`);
  }
  return lines.join("\n");
}

// Replace the text between every <!-- size:<name>:start --> / :end --> pair.
function injectMarker(md, name, replacement) {
  const start = `<!-- size:${name}:start -->`;
  const end = `<!-- size:${name}:end -->`;
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`${esc(start)}[\\s\\S]*?${esc(end)}`, "g");
  return md.replace(re, `${start}${replacement}${end}`);
}

async function main() {
  try {
    await fs.access(distDir);
  } catch {
    console.error("dist/ not found. Run the build first.");
    process.exit(2);
  }

  const files = (await collectFiles(distDir)).sort((a, b) => a.rel.localeCompare(b.rel));
  const rows = [];
  for (const f of files) {
    const buf = await fs.readFile(f.abs);
    rows.push({ file: f.rel, ...measure(buf) });
  }

  const totals = rows.reduce(
    (acc, r) => ({ raw: acc.raw + r.raw, gzip: acc.gzip + r.gzip, brotli: acc.brotli + r.brotli }),
    { raw: 0, gzip: 0, brotli: 0 },
  );

  console.log("| File | Raw | Gzip | Brotli |");
  console.log("| --- | --- | --- | --- |");
  for (const r of rows) {
    console.log(`| ${r.file} | ${format(r.raw)} | ${format(r.gzip)} | ${format(r.brotli)} |`);
  }
  console.log(
    `| **total** | **${format(totals.raw)}** | **${format(totals.gzip)}** | **${format(totals.brotli)}** |`,
  );

  await fs.mkdir(resultsDir, { recursive: true });
  const snapshot = { generatedAt: new Date().toISOString(), totals, files: rows };
  await fs.writeFile(path.join(resultsDir, "size.json"), JSON.stringify(snapshot, null, 2) + "\n");

  if (args.has("--readme")) {
    const hello = await bundleGzip(helloSource());
    const readmePath = path.join(repoRoot, "README.md");
    let md = await fs.readFile(readmePath, "utf8");
    md = injectMarker(md, "hello", `\`${kb(hello.gzip)}\``);
    md = injectMarker(md, "addons", `\n${buildAddonsTable(rows)}\n`);
    await fs.writeFile(readmePath, md);
    console.log(`\nREADME size markers updated (hello world ${format(hello.gzip)} gzip).`);
  }

  if (args.has("--update")) {
    await fs.writeFile(baselinePath, JSON.stringify(snapshot, null, 2) + "\n");
    console.log(`\nBaseline updated at ${path.relative(repoRoot, baselinePath)}`);
    return;
  }

  if (args.has("--ci")) {
    let baseline;
    try {
      baseline = JSON.parse(await fs.readFile(baselinePath, "utf8"));
    } catch {
      console.error(
        `\nNo baseline at ${path.relative(repoRoot, baselinePath)}. Run with --update.`,
      );
      process.exit(2);
    }
    const baselineByFile = Object.fromEntries(baseline.files.map((r) => [r.file, r]));
    const regressions = [];
    for (const r of rows) {
      const b = baselineByFile[r.file];
      if (!b) continue;
      for (const kind of ["raw", "gzip", "brotli"]) {
        const delta = (r[kind] - b[kind]) / b[kind];
        if (delta > REGRESSION_THRESHOLD) {
          regressions.push({ file: r.file, kind, before: b[kind], after: r[kind], delta });
        }
      }
    }
    if (regressions.length) {
      console.error(`\nSize regression beyond ${REGRESSION_THRESHOLD * 100}% threshold:`);
      for (const r of regressions) {
        const pct = (r.delta * 100).toFixed(1);
        console.error(
          `  ${r.file} (${r.kind}): ${format(r.before)} -> ${format(r.after)} (+${pct}%)`,
        );
      }
      process.exit(1);
    }
    console.log("\nAll entries within size budget.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
