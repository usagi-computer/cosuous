/*
 * Cosuous by Dania Rifki (@Kaleidosium), forked from Sinuous by Wesley Luyten (@luwes).
 * Really ties all the packages together.
 */

import { api } from "./h.ts";
import htm from "./htm.ts";
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
} from "./signal.ts";
import type { Hyperscript } from "./h.ts";

api.effect = effect;
api.isSignal = isSignal;
api.isComputed = isComputed;

api.hs = function hs(...args: unknown[]): ReturnType<Hyperscript> {
  const prevIsSvg = api.isSvg;
  api.isSvg = true;
  try {
    return (api.h as (...a: unknown[]) => ReturnType<Hyperscript>)(...args);
  } finally {
    // Restore even if h() throws, so a nested hs() error doesn't leave
    // api.isSvg stuck on true for subsequent HTML-mode h() calls.
    api.isSvg = prevIsSvg;
  }
} as Hyperscript;

// Makes it possible to intercept `h` calls and customize.
// Note: this is a delegator over `api.h`, so monkey-patching `api.h` at
// runtime is observable here. The direct `h` impl is exported from
// "cosuous/h" for callers who want the un-delegated implementation.
export const h: Hyperscript = ((...args: unknown[]) =>
  (api.h as (...a: unknown[]) => ReturnType<Hyperscript>)(...args)) as Hyperscript;

// Makes it possible to intercept `hs` calls and customize.
export const hs: Hyperscript = ((...args: unknown[]) =>
  (api.hs as (...a: unknown[]) => ReturnType<Hyperscript>)(...args)) as Hyperscript;

// `export const html = htm.bind(h)` is not tree-shakeable!
export const html: (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => HTMLElement | DocumentFragment = (strings, ...values) =>
  htm.apply(h, [strings, ...values]) as HTMLElement | DocumentFragment;

// `export const svg = htm.bind(hs)` is not tree-shakeable!
export const svg: (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => SVGElement | DocumentFragment = (strings, ...values) =>
  htm.apply(hs, [strings, ...values]) as SVGElement | DocumentFragment;

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

// Public type surface. Consumers do `import type { JSX } from "cosuous"` etc.
// Replaces the old `export = cosuous; export as namespace cosuous;` pattern
// (which was incompatible with native ESM / JSR fast-types).
export type { Computed, Signal } from "./signal.ts";
export type { ElementChild, ElementChildren, FunctionComponent } from "./shared.ts";
export type { Frag, Hyperscript, HyperscriptApi, Value } from "./h.ts";
export type { JSXInternal as JSX } from "./jsx.ts";
