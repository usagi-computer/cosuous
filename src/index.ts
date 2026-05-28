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

/**
 * Build a DOM element, component subtree, or document fragment.
 *
 * Delegator over `api.h`; monkey-patching `api.h` at runtime is
 * observable through this export. For the un-delegated implementation,
 * import from `cosuous/h` instead.
 */
export const h: Hyperscript = ((...args: unknown[]) =>
  (api.h as (...a: unknown[]) => ReturnType<Hyperscript>)(...args)) as Hyperscript;

/**
 * SVG-mode counterpart of {@link h}. Builds elements in the SVG
 * namespace; otherwise identical. Same delegator-over-`api.hs`
 * pattern.
 */
export const hs: Hyperscript = ((...args: unknown[]) =>
  (api.hs as (...a: unknown[]) => ReturnType<Hyperscript>)(...args)) as Hyperscript;

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
