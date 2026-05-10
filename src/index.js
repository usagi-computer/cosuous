/*
 * Cosuous by Dania Rifki (@Kaleidosium), forked from Sinuous by Wesley Luyten (@luwes).
 * Really ties all the packages together.
 */

import { api } from "./h.js";
import htm from "./htm.js";
import {
  computed,
  effect,
  effectScope,
  endBatch,
  isComputed,
  isSignal,
  onCleanup,
  signal,
  startBatch,
  trigger,
  untracked,
} from "./observable.js";

api.effect = effect;
api.scope = effectScope;
api.untracked = untracked;
api.onCleanup = onCleanup;
api.isSignal = isSignal;
api.isComputed = isComputed;

api.hs = (...args) => {
  const prevIsSvg = api.s;
  api.s = true;
  const el = h(...args);
  api.s = prevIsSvg;
  return el;
};

// Makes it possible to intercept `h` calls and customize.
export const h = (...args) => api.h.apply(api.h, args);

// Makes it possible to intercept `hs` calls and customize.
export const hs = (...args) => api.hs.apply(api.hs, args);

// `export const html = htm.bind(h)` is not tree-shakeable!
export const html = (...args) => htm.apply(h, args);

// `export const svg = htm.bind(hs)` is not tree-shakeable!
export const svg = (...args) => htm.apply(hs, args);

export {
  api,
  computed,
  effect,
  effectScope,
  endBatch,
  isComputed,
  isSignal,
  onCleanup,
  signal,
  startBatch,
  trigger,
  untracked,
};
