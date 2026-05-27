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
