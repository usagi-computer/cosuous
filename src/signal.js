/*
 * Reactive core, backed by alien-signals.
 * Public surface is preact-signals-shaped: effect callbacks may return a
 * cleanup function, batch(fn) brackets startBatch/endBatch, untracked(fn)
 * suspends dependency tracking. onCleanup and effectScope remain available
 * as internal primitives consumed by src/map.js.
 */

import {
  computed,
  effect as _effect,
  effectScope as _effectScope,
  endBatch,
  isComputed,
  isSignal,
  setActiveSub,
  signal,
  startBatch,
  trigger,
} from "alien-signals";

let activeCleanups;

/**
 * Internal cleanup primitive used by src/map.js so the map's bookkeeping
 * tears down with the surrounding effect/scope rather than the inner map
 * effect. Not part of the public API; user-facing effects should return a
 * cleanup function instead.
 * @param {Function} fn
 * @return {Function}
 */
export function onCleanup(fn) {
  if (activeCleanups) activeCleanups.push(fn);
  return fn;
}

const withCleanups = (cleanups, fn) => {
  const prev = activeCleanups;
  activeCleanups = cleanups;
  try {
    return fn();
  } finally {
    activeCleanups = prev;
  }
};

const runCleanups = (cleanups) => {
  for (let i = cleanups.length; i--; ) cleanups[i]();
  cleanups.length = 0;
};

/**
 * Reactive side effect. Re-runs when any read signal changes. If fn returns a
 * function, it's invoked before the next re-run and on dispose.
 * Returns a dispose function.
 * @param {Function} fn
 * @return {Function}
 */
export function effect(fn) {
  const cleanups = [];
  const stop = _effect(() => {
    runCleanups(cleanups);
    const returned = withCleanups(cleanups, fn);
    if (typeof returned === "function") cleanups.push(returned);
  });
  // When the surrounding effect re-runs, alien-signals tears down this child
  // effect via its node graph - but it doesn't know about our cleanup list.
  // Register a callback on the parent's cleanup list so our cleanups also fire.
  // We deliberately don't push the full dispose: alien-signals handles stopping.
  if (activeCleanups) activeCleanups.push(() => runCleanups(cleanups));
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
 * down explicitly-scoped children (e.g. map.js's per-item scopes).
 * @param {Function} fn
 * @return {Function}
 */
export function effectScope(fn) {
  const cleanups = [];
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
 * @param {Function} fn
 * @return {*}
 */
export function untracked(fn) {
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
 * @template T
 * @param {() => T} fn
 * @return {T}
 */
export function batch(fn) {
  startBatch();
  try {
    return fn();
  } finally {
    endBatch();
  }
}

export { computed, endBatch, isComputed, isSignal, setActiveSub, signal, startBatch, trigger };
