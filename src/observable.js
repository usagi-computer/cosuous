/*
 * Reactive core, backed by alien-signals.
 * Adds an onCleanup() shim and an untracked() helper on top of the upstream API.
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
 * Register a function to run when the surrounding effect re-runs or the
 * surrounding effect/scope is disposed.
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
 * Reactive side effect. Re-runs when any read signal changes.
 * Returns a dispose function.
 * @param {Function} fn
 * @return {Function}
 */
export function effect(fn) {
  const cleanups = [];
  const stop = _effect(() => {
    runCleanups(cleanups);
    withCleanups(cleanups, fn);
  });
  // When the surrounding effect re-runs, alien-signals tears down this child
  // effect via its node graph — but it doesn't know about our onCleanup list.
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
 * effectScope manages its own lifetime - the caller is expected to invoke the
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
 * effect. onCleanup() calls inside fn still register against the surrounding
 * scope (this is the difference from sinuous' sample()).
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

export {
  computed,
  endBatch,
  isComputed,
  isSignal,
  setActiveSub,
  signal,
  startBatch,
  trigger,
};
