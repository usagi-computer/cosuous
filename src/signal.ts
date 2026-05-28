/**
 * Reactive primitives backed by alien-signals. The public surface is
 * shaped like preact-signals:
 *
 * - {@link signal} returns a callable getter/setter pair.
 * - {@link computed} memoises a derivation.
 * - {@link effect} runs a side-effect; returning a function from its
 *   body registers it as a cleanup, and calling the returned disposer
 *   tears everything down.
 * - {@link batch} brackets startBatch/endBatch so dependent effects
 *   re-run once at the end.
 * - {@link untracked} suspends dependency tracking for the duration of
 *   the callback.
 *
 * `effectScope` and `onCleanup` remain available as the lower-level
 * primitives consumed by `src/map.ts` to cascade teardown through the
 * scope graph - alien-signals' native cleanup fires only on
 * self-dispose, not when an ancestor scope tears a node down via the
 * graph.
 *
 * @example
 * ```ts
 * import { effect, signal } from "@usagi-computer/cosuous/signal";
 *
 * const count = signal(0);
 * const stop = effect(() => console.log("count is", count()));
 * count(1); // logs "count is 1"
 * stop();
 * ```
 *
 * @module signal
 */

import {
  computed as _computed,
  effect as _effect,
  effectScope as _effectScope,
  endBatch as _endBatch,
  isComputed as _isComputed,
  isSignal as _isSignal,
  setActiveSub,
  signal as _signal,
  startBatch as _startBatch,
  trigger as _trigger,
} from "alien-signals";

/**
 * A reactive value. Calling it with no arguments reads the current
 * value (and registers a dependency in any surrounding effect);
 * calling it with one argument writes a new value.
 */
export interface Signal<T> {
  /** Read the current value. Registers a dependency in the surrounding effect. */
  (): T;
  /** Write a new value. Notifies subscribers if the value actually changed. */
  (nextValue: T): void;
}

/**
 * A read-only reactive value derived from one or more signals via
 * {@link computed}. Calling it returns the current memoised value.
 */
export interface Computed<T> {
  /** Read the current derived value. Registers a dependency in the surrounding effect. */
  (): T;
}

/**
 * Create a {@link Signal}. Two overloads:
 *
 * - `signal<T>()` returns a `Signal<T | undefined>` that starts unset.
 * - `signal(initialValue)` returns a `Signal<T>` typed from the value.
 *
 * Re-exported from alien-signals under cosuous's preferred shape -
 * the runtime is alien-signals, but the public type matches the
 * preact-signals overload pair.
 */
export const signal: {
  <T>(): Signal<T | undefined>;
  <T>(initialValue: T): Signal<T>;
} = _signal as unknown as {
  <T>(): Signal<T | undefined>;
  <T>(initialValue: T): Signal<T>;
};

/**
 * Create a {@link Computed}. The getter receives the previous result
 * (or `undefined` on first run) so derivations can do incremental
 * updates without a separate cache.
 */
export const computed: <T>(getter: (previousValue?: T) => T) => Computed<T> =
  _computed as unknown as <T>(getter: (previousValue?: T) => T) => Computed<T>;

/** Lower-level batch primitive. Pairs with {@link endBatch}; usually you want {@link batch} instead. */
export const startBatch: () => void = _startBatch;
/** Closes the bracket started by {@link startBatch}; dependent effects re-run once after this returns. */
export const endBatch: () => void = _endBatch;
/** Predicate from alien-signals: is `value` a signal? Used by `api.isSignal` to detect reactive props. */
export const isSignal: (value: unknown) => boolean = _isSignal as unknown as (
  value: unknown,
) => boolean;
/** Predicate from alien-signals: is `value` a computed? Used by `api.isComputed` to detect reactive props. */
export const isComputed: (value: unknown) => boolean = _isComputed as unknown as (
  value: unknown,
) => boolean;
/** Manually mark a function as a reactive trigger (alien-signals primitive). Rarely needed in user code. */
export const trigger: (fn: () => void) => void = _trigger as unknown as (fn: () => void) => void;

/**
 * Cleanup callback. Returned by {@link effect} / {@link effectScope}
 * (as a disposer) and also the optional return value of an
 * {@link effect} body.
 */
export type CleanupFn = () => void;

/**
 * Effect body. May optionally return a {@link CleanupFn} that runs
 * before the next re-execution and on final disposal.
 */
export type EffectBody = () => void | CleanupFn;

let activeCleanups: CleanupFn[] | undefined;

/**
 * Internal cleanup primitive used by src/map.ts so the map's bookkeeping
 * tears down with the surrounding effect/scope rather than the inner map
 * effect. Not part of the public API; user-facing effects should return a
 * cleanup function instead.
 */
export function onCleanup(fn: CleanupFn): CleanupFn {
  if (activeCleanups) activeCleanups.push(fn);
  return fn;
}

function withCleanups<T>(cleanups: CleanupFn[], fn: () => T): T {
  const prev = activeCleanups;
  activeCleanups = cleanups;
  try {
    return fn();
  } finally {
    activeCleanups = prev;
  }
}

function runCleanups(cleanups: CleanupFn[]): void {
  for (let i = cleanups.length; i--; ) cleanups[i]!();
  cleanups.length = 0;
}

/**
 * Reactive side effect. Re-runs when any read signal changes. If fn returns a
 * function, alien-signals invokes it before each re-run and on dispose.
 * Returns a dispose function.
 */
export function effect(fn: EffectBody): CleanupFn {
  const cleanups: CleanupFn[] = [];
  const stop = _effect(() => {
    runCleanups(cleanups);
    const returned = withCleanups(cleanups, fn);
    if (typeof returned === "function") return returned;
  });
  if (activeCleanups) {
    activeCleanups.push(() => {
      runCleanups(cleanups);
      stop();
    });
  }
  return () => {
    runCleanups(cleanups);
    stop();
  };
}

/**
 * Group child effects/scopes for batched disposal. Returns a dispose function.
 * effectScope manages its own lifetime, the caller is expected to invoke the
 * returned dispose explicitly. We do NOT auto-propagate to a surrounding
 * effect's cleanups, because re-running the parent effect should not tear
 * down explicitly-scoped children (e.g. map.ts's per-item scopes).
 */
export function effectScope(fn: () => void): CleanupFn {
  const cleanups: CleanupFn[] = [];
  const stop = _effectScope(() => {
    withCleanups(cleanups, fn);
  });
  return () => {
    runCleanups(cleanups);
    stop();
  };
}

/**
 * Run fn without tracking any read signals as dependencies of the surrounding
 * effect.
 */
export function untracked<T>(fn: () => T): T {
  const prev = setActiveSub(undefined);
  try {
    return fn();
  } finally {
    setActiveSub(prev);
  }
}

/**
 * Run fn with signal updates coalesced; dependent effects re-run once after
 * fn returns.
 */
export function batch<T>(fn: () => T): T {
  startBatch();
  try {
    return fn();
  } finally {
    endBatch();
  }
}
