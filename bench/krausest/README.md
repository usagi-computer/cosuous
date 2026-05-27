# cosuous (keyed) - js-framework-benchmark entry

Minimal framework entry for the [krausest js-framework-benchmark][upstream]
harness. Targets the canonical "keyed" variant. Adapted from the upstream
`frameworks/keyed/sinuous/` entry; license Apache-2.0.

[upstream]: https://github.com/krausest/js-framework-benchmark

## Build

From the repo root, first build the library, then this entry:

```sh
pnpm run build
pnpm run bench:krausest
```

That emits `bench/krausest/dist/` containing `index.html` plus the bundled JS,
ready to drop into the upstream harness.

## Running the full benchmark

This directory is not a complete harness checkout. To collect real numbers:

1. Clone [krausest/js-framework-benchmark][upstream].
2. Symlink (or copy) this folder to `frameworks/keyed/cosuous/`.
3. Add a sibling `package.json` declaring the framework name and version
   (cosuous from `npm:cosuous@<version>` or `link:../../../../`).
4. Follow the upstream README to run the harness against Chrome.

The button IDs (`run`, `runlots`, `add`, `update`, `clear`, `swaprows`),
the `#tbody` element, and the `.danger` selected-row class are the contract
the harness drives, all preserved here.
