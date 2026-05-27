# Signal library replacement: findings

Status: research-only. No code changes proposed in this document.

## Why this question exists

The `TODO.txt` entry that prompted this doc:

> Investigate if it's even possible to replace the Signal library at this
> point, since we're assuming a lot about the usage of alien-signals.

The concern is lock-in: how much of cosuous's behavior depends on
`alien-signals`-specific semantics that a drop-in replacement may not match?

## Alien-signals surface used

All alien-signals imports live in `src/signal.js`:

| Symbol         | Where it surfaces externally | Why we use it                                           |
| -------------- | ---------------------------- | ------------------------------------------------------- |
| `signal`       | `cosuous/signal`, `cosuous`  | Primary reactive cell.                                  |
| `computed`     | same                         | Derived cell.                                           |
| `effect`       | same, via wrapper            | Reactive side-effects. Wrapper adds `onCleanup` glue.   |
| `effectScope`  | same, via wrapper            | Per-item scope graph in `src/map.js`.                   |
| `isSignal`     | same                         | Type guard used by `src/h.js` to disambiguate handlers. |
| `isComputed`   | same                         | Same as above.                                          |
| `setActiveSub` | wrapped as `untracked(fn)`   | Suspend dependency tracking for reconcile bookkeeping.  |
| `startBatch`   | wrapped as `batch(fn)`       | Coalesce multiple writes.                               |
| `endBatch`     | same                         | Pair for `startBatch`.                                  |
| `trigger`      | re-exported                  | Manual signal invalidation; user-facing escape hatch.   |

The "shape" we expose is preact-signals-ish on top, with two internal-only
primitives (`onCleanup`, `effectScope`) that `src/map.js` uses to cascade
disposal through the scope graph.

## Coupling depth, per file

- **`src/signal.js`** (full coupling): wraps alien-signals exports. This is
  where any swap concentrates.
- **`src/map.js`** (deep, behavioral coupling): uses `effectScope` to give each
  list item its own scope so child effects outlive the parent's update cycle
  and dispose individually. Calls `onCleanup` twice in `map()` to register
  unsubscribers with the parent scope. **This is the load-bearing pattern.**
  Any replacement must preserve "scope graph" semantics or `map.js`'s disposal
  story breaks.
- **`src/h.js`** (loose, type-guard coupling): only consumes `api.effect`,
  `api.isSignal`, `api.isComputed` via the `api` indirection. Could work with
  any reactive system that supplies these three.
- **`src/hydrate.js`** (loose): uses `api.effect` for reactive placeholders.
  Same indirection as `h.js`.
- **`src/template.js`** (none): no direct reactive imports.

Net: `h.js` / `hydrate.js` / `template.js` are reactive-system-agnostic
already. `signal.js` is by design the abstraction boundary. The risk surface
is `map.js`.

## Bundling note

After the publishing-hygiene change in this same maintenance pass,
`alien-signals` is bundled into `dist/signal.js` (and code-split into the
shared chunk). Removing it does **not** shave user-facing bytes any more --
they only pay for what they import. The "swap reduces install size" argument
no longer applies.

## Candidate replacements

Assessed against the three constraints: (1) `effectScope` + `onCleanup`
parity (the `map.js` blocker), (2) batch primitive, (3) effect returning a
cleanup function.

### `@preact/signals-core`

- Has: `signal`, `computed`, `effect` (returns dispose), `batch`, `untracked`.
- Lacks: explicit `effectScope`. Cleanup is per-effect only via the returned
  dispose function. No "scope graph" primitive.
- Verdict: would force a rewrite of `map.js`'s disposal cascade. Possible but
  non-trivial -- track per-item disposers in a `Map<Node, Set<dispose>>` and
  fan out manually. Bundle is tiny (~1 kB), API is clean.

### `solid-js` (reactive core: `solid-js`)

- Has: `createSignal`, `createMemo` (= computed), `createEffect`, `createRoot`
  (= scope), `onCleanup`, `untrack`, `batch`.
- Notable: `createRoot` is the closest analogue to `effectScope`. `onCleanup`
  is **exactly** the primitive `map.js` already uses.
- Verdict: best semantic match. The wrapper in `src/signal.js` could be
  rewritten with mostly mechanical changes. Bundle cost is meaningful
  though -- the full `solid-js` package is ~6 kB minified, larger than
  alien-signals.

### `S.js`

- Has: `S` (signal), `S.data`, `S.computation`, `S.cleanup`, `S.root`.
- Lacks: active maintenance. Last meaningful release years ago. Useful as
  inspiration; not a serious candidate for a fork that wants long-term ground
  to stand on.

### `@vue/reactivity`

- Has: `ref`, `computed`, `effect`, `effectScope`, `stop`. Closest API to
  alien-signals semantically, including `effectScope`.
- Verdict: feature-complete but bigger (~10 kB). Tied to Vue's release
  cadence; not a sub-1 kB reactive core.

### Hand-rolled minimal signals

- Has: whatever we build.
- Verdict: would let us match the current API exactly with zero outside
  dependency. Cost is one more piece of code to maintain forever, plus the
  bug surface of a hand-rolled reactivity system. Best-of-class implementations
  (alien-signals, signals-core) are already small enough that DIY rarely wins
  on bytes.

## Recommendation

**Keep alien-signals.** Reasons in order of weight:

1. The "wrap the reactive system" abstraction already lives in `src/signal.js`.
   Future swaps don't get easier by swapping now; they get easier by keeping
   the wrapper honest. Right now the wrapper is **honest** (no module outside
   `signal.js` reaches into alien-signals directly).
2. The bundling change in this same pass removed the "save user bytes" argument.
3. `effectScope` + `onCleanup` semantics in `src/map.js` are non-trivial to
   port. Solid's primitives match but cost ~5 kB more. Preact signals would
   force a `map.js` rewrite. The status-quo cost is small; the swap cost is
   not.

Two follow-ups that **would** make a future swap cheaper, if appetite returns:

- **Audit `src/map.js` for direct `effectScope` / `onCleanup` calls.** Today it
  imports them directly from `./signal.js`. That's fine, but a swap will touch
  `map.js`. If the same logic were re-expressed in terms of a small
  cosuous-defined interface (`scope(fn) -> dispose`, `onScopeCleanup(fn)`), the
  swap would be a one-file change. Cost today: a thin module. Benefit: future
  optionality.
- **Pin a fallback.** If alien-signals stalls, the most plausible replacement
  is `solid-js`'s reactive primitives because of `createRoot` + `onCleanup`.
  Worth keeping that as the named fallback in this doc so future-us doesn't
  re-derive it.

## Triggers that would change the recommendation

Re-open this question if any of these happen:

- alien-signals goes >12 months without a release while a known correctness
  bug is open.
- The library wants to expose a stable internal-reactivity contract for
  user-supplied reactive systems (`api.effect` already does some of this,
  but full parity would mean publishing the scope semantics too).
- A new reactive system ships with materially better diff/scheduling
  performance and `effectScope` parity.
