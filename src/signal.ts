/*
 * Reactive core, backed by alien-signals.
 * Public surface is preact-signals-shaped: effect callbacks may return a
 * cleanup function (handled natively by alien-signals), batch(fn) brackets
 * startBatch/endBatch, untracked(fn) suspends dependency tracking. onCleanup
 * and effectScope remain available as internal primitives consumed by
 * src/map.ts to cascade teardown through the scope graph, alien-signals'
 * native cleanup fires on self-dispose only, not when an ancestor scope tears
 * a node down via the graph.
 */

import {
  computed as _computed,
  effect as _effect,
  effectScope as _effectScope,
  endBatch,
  isComputed,
  isSignal,
  setActiveSub,
  signal as _signal,
  startBatch,
  trigger,
} from "alien-signals";

export interface Signal<T> {
  (): T;
  (nextValue: T): void;
}

export interface Computed<T> {
  (): T;
}

// Re-export under cosuous's preferred shape. alien-signals' own signature is
// runtime-compatible but uses a different generic shape; the double cast keeps
// the value identity while presenting the documented overloads to consumers.
export const signal: {
  <T>(): Signal<T | undefined>;
  <T>(initialValue: T): Signal<T>;
} = _signal as unknown as {
  <T>(): Signal<T | undefined>;
  <T>(initialValue: T): Signal<T>;
};

export const computed: <T>(getter: (previousValue?: T) => T) => Computed<T> =
  _computed as unknown as <T>(getter: (previousValue?: T) => T) => Computed<T>;

export { endBatch, isComputed, isSignal, startBatch, trigger };

type CleanupFn = () => void;
type EffectBody = () => void | CleanupFn;

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
