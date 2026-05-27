# cosuous benchmarks

Three measurement surfaces:

## Microbenchmarks (`pnpm run bench`)

Vitest's built-in benchmark mode (tinybench under the hood).

- `bench/signal.bench.js` (node) - signal read/write, computed propagation,
  effect setup/dispose, batch coalescing.
- `bench/h.bench.js` (browser/chromium) - h() creation across shapes, html
  tagged template, reactive attribute updates.
- `bench/map.bench.js` (browser/chromium) - map() initial render at 100 and
  1000 rows.

Run a subset with `pnpm exec vitest bench --run bench/<file>`.

### Known limitation: map reconcile microbenches

Reconcile-style benches (mutate the signal after `map()` to exercise the
diff/reorder path) trigger a vitest-browser quirk where the bench tasks
register but produce no measurable samples. The pattern hits something
between tinybench's iteration loop and the browser provider that we have
not pinned down. Real-world reconcile-at-scale is covered by the krausest
entry below; this file intentionally stops at the create path.

## Size budget (`pnpm run bench:size`)

`bench/size.js` walks `dist/`, prints a raw / gzip / brotli table per entry,
and writes a snapshot to `bench/results/size.json`.

- `pnpm run bench:size` - print + write snapshot.
- `pnpm run bench:size:update` - save the current snapshot as the baseline
  at `bench/size.baseline.json`.
- `node bench/size.js --ci` - fail with exit 1 if any entry regresses more
  than 5% on any compression vs. the committed baseline.

Run after `pnpm run build` so the size table reflects the actual published
artifact.

## js-framework-benchmark / krausest (`pnpm run bench:krausest`)

Minimal cosuous entry for the [krausest harness][upstream]. Build emits
`bench/krausest/dist/` which can be dropped into the upstream
`frameworks/keyed/cosuous/` slot. See `bench/krausest/README.md` for the
harness wiring steps.

[upstream]: https://github.com/krausest/js-framework-benchmark
