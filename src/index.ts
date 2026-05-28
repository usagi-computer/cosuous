/**
 * Cosuous - a small reactive view library forked from Sinuous.
 *
 * This is the package's main entrypoint. It wires the hyperscript core
 * (`./h.ts`) to the reactive primitives (`./signal.ts`) and the `htm`
 * template-literal parser (`./htm.ts`), then re-exports the everyday
 * surface: `h` / `hs` for elements, `html` / `svg` for tagged templates,
 * and the full set of signal primitives.
 *
 * @example Basic counter
 * ```ts
 * import { html, signal } from "@usagi-computer/cosuous";
 *
 * const count = signal(0);
 * const view = () => html`<button onclick=${() => count(count() + 1)}>${count}</button>`;
 * document.body.append(view());
 * ```
 *
 * Originally forked from Sinuous by Wesley Luyten (@luwes); maintained
 * by Dania Rifki (@Kaleidosium / usagi-computer).
 *
 * @module cosuous
 */

import { api as _api } from "./h.ts";
import htm from "./htm.ts";
import {
  batch as _batch,
  computed as _computed,
  effect as _effect,
  effectScope as _effectScope,
  endBatch as _endBatch,
  isComputed as _isComputed,
  isSignal as _isSignal,
  signal as _signal,
  startBatch as _startBatch,
  trigger as _trigger,
  untracked as _untracked,
} from "./signal.ts";
import type { Computed as _Computed, Signal as _Signal } from "./signal.ts";
import type {
  ElementChild as _ElementChild,
  ElementChildren as _ElementChildren,
  FunctionComponent as _FunctionComponent,
} from "./shared.ts";
import type {
  Frag as _Frag,
  Hyperscript as _Hyperscript,
  HyperscriptApi as _HyperscriptApi,
  Value as _Value,
} from "./h.ts";
import type { JSXInternal as _JSXInternal } from "./jsx.ts";

/** Shared mutable hyperscript surface. See {@link HyperscriptApi}. */
export const api: typeof _api = _api;

/** Reactive side effect. Re-runs when any read signal changes. */
export const effect: typeof _effect = _effect;
/** Predicate: is `value` an alien-signals signal? */
export const isSignal: typeof _isSignal = _isSignal;
/** Predicate: is `value` an alien-signals computed? */
export const isComputed: typeof _isComputed = _isComputed;

api.effect = effect;
api.isSignal = isSignal;
api.isComputed = isComputed;

api.hs = function hs(...args: unknown[]): ReturnType<_Hyperscript> {
  const prevIsSvg = api.isSvg;
  api.isSvg = true;
  try {
    return (api.h as (...a: unknown[]) => ReturnType<_Hyperscript>)(...args);
  } finally {
    // Restore even if h() throws, so a nested hs() error doesn't leave
    // api.isSvg stuck on true for subsequent HTML-mode h() calls.
    api.isSvg = prevIsSvg;
  }
} as _Hyperscript;

/**
 * Build a DOM element, component subtree, or document fragment.
 *
 * Delegator over `api.h`; monkey-patching `api.h` at runtime is
 * observable through this export. For the un-delegated implementation,
 * import from `cosuous/h` instead.
 */
export const h: _Hyperscript = ((...args: unknown[]) =>
  (api.h as (...a: unknown[]) => ReturnType<_Hyperscript>)(...args)) as _Hyperscript;

/**
 * SVG-mode counterpart of {@link h}. Builds elements in the SVG
 * namespace; otherwise identical. Same delegator-over-`api.hs`
 * pattern.
 */
export const hs: _Hyperscript = ((...args: unknown[]) =>
  (api.hs as (...a: unknown[]) => ReturnType<_Hyperscript>)(...args)) as _Hyperscript;

/**
 * Tagged-template form of {@link h}, powered by the vendored `htm`
 * parser. Returns the same shape as a single `h(...)` call (either an
 * `HTMLElement` or a `DocumentFragment` for multi-root templates).
 *
 * Not written as `htm.bind(h)` because that form isn't tree-shakeable.
 *
 * @example
 * ```ts
 * const view = html`<div class="row">${child}</div>`;
 * ```
 */
export function html(
  strings: TemplateStringsArray,
  ...values: unknown[]
): HTMLElement | DocumentFragment {
  return htm.apply(h, [strings, ...values]) as HTMLElement | DocumentFragment;
}

/**
 * SVG-mode tagged template; the SVG counterpart of {@link html}.
 */
export function svg(
  strings: TemplateStringsArray,
  ...values: unknown[]
): SVGElement | DocumentFragment {
  return htm.apply(hs, [strings, ...values]) as SVGElement | DocumentFragment;
}

// Per-symbol re-exports so each carries its own JSDoc at the package root,
// instead of producing bare "reference" nodes that JSR's doc-coverage
// check sees as undocumented. `api`, `effect`, `isSignal`, `isComputed`
// are exported earlier so they can be assigned onto `api`.

/** Batch signal updates so dependent effects re-run once at the end. */
export const batch: typeof _batch = _batch;
/** Derive a memoised {@link Computed} from one or more signals. */
export const computed: typeof _computed = _computed;
/** Grouped lifetime for child effects; disposes them together. */
export const effectScope: typeof _effectScope = _effectScope;
/** Close a batch started by {@link startBatch}. */
export const endBatch: typeof _endBatch = _endBatch;
/** Create a reactive {@link Signal}. */
export const signal: typeof _signal = _signal;
/** Open a batch; pair with {@link endBatch}. */
export const startBatch: typeof _startBatch = _startBatch;
/** Manually fire a reactive trigger (alien-signals primitive). */
export const trigger: typeof _trigger = _trigger;
/** Run a function without registering dependencies on read signals. */
export const untracked: typeof _untracked = _untracked;

// Public type surface. Consumers do `import type { JSX } from "cosuous"` etc.
// Replaces the old `export = cosuous; export as namespace cosuous;` pattern
// (which was incompatible with native ESM / JSR fast-types).

/** Reactive value with a memoised getter. */
export type Computed<T> = _Computed<T>;
/** Reactive value: callable getter/setter. */
export type Signal<T> = _Signal<T>;

/** Any value accepted in an `h` child slot. */
export type ElementChild = _ElementChild;
/** One {@link ElementChild} or an array of them. */
export type ElementChildren = _ElementChildren;
/** Callable shape for cosuous components. */
export type FunctionComponent = _FunctionComponent;

/** Multi-child fragment marker pair. */
export type Frag = _Frag;
/** Overloaded `h` call signature. */
export type Hyperscript = _Hyperscript;
/** Shared mutable surface populated across the package. */
export type HyperscriptApi = _HyperscriptApi;
/** Any value `api.add` accepts directly. */
export type Value = _Value;

/** JSX type surface for tsc; see the `JSXInternal` namespace. */
export type { _JSXInternal as JSX };
