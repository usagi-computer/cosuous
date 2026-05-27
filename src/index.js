/*
 * Cosuous by Dania Rifki (@Kaleidosium), forked from Sinuous by Wesley Luyten (@luwes).
 * Really ties all the packages together.
 */

import { api } from "./h.js";
import htm from "./htm.js";
import {
  batch,
  computed,
  effect,
  effectScope,
  endBatch,
  isComputed,
  isSignal,
  signal,
  startBatch,
  trigger,
  untracked,
} from "./signal.js";

api.effect = effect;
api.isSignal = isSignal;
api.isComputed = isComputed;

api.hs = (...args) => {
  const prevIsSvg = api.isSvg;
  api.isSvg = true;
  try {
    return h(...args);
  } finally {
    // Restore even if h() throws, so a nested hs() error doesn't leave
    // api.isSvg stuck on true for subsequent HTML-mode h() calls.
    api.isSvg = prevIsSvg;
  }
};

// Makes it possible to intercept `h` calls and customize.
export const h = (...args) => api.h(...args);

// Makes it possible to intercept `hs` calls and customize.
export const hs = (...args) => api.hs(...args);

// `export const html = htm.bind(h)` is not tree-shakeable!
export const html = (...args) => htm.apply(h, args);

// `export const svg = htm.bind(hs)` is not tree-shakeable!
export const svg = (...args) => htm.apply(hs, args);

export {
  api,
  batch,
  computed,
  effect,
  effectScope,
  endBatch,
  isComputed,
  isSignal,
  signal,
  startBatch,
  trigger,
  untracked,
};
