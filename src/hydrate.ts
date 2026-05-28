/**
 * Hydration entry. Walks a virtual-node tree against pre-rendered HTML
 * and attaches reactive bindings to the existing DOM nodes instead of
 * recreating them.
 *
 * Pair `d` / `ds` (or their tagged-template forms `dhtml` / `dsvg`)
 * with `hydrate(root)` to describe the expected tree, then let the
 * library walk the live DOM. Effects subscribe to signals on first
 * pass; subsequent passes call back through the regular `h` / `hs`
 * path for newly created subtrees.
 *
 * @example
 * ```ts
 * import { hydrate, dhtml, signal } from "@usagi-computer/cosuous/hydrate";
 * const count = signal(0);
 * const view = dhtml`<button onclick=${() => count(count() + 1)}>${count}</button>`;
 * hydrate(view);
 * ```
 *
 * @module hydrate
 */

import { TEXT_NODE } from "./constants.ts";
import htm from "./htm.ts";
import { api, h, hs } from "./index.ts";
import type { FunctionComponent } from "./shared.ts";
import type { JSXInternal as _JSXInternal } from "./jsx.ts";

/**
 * Loose virtual-node shape produced by {@link d} / {@link ds} during
 * the first hydration pass. Fields are populated incrementally as the
 * tree is built; every field is optional so partial nodes are valid
 * intermediate values during construction.
 */
export interface VNode {
  /** Element tag name, component function, or `null` for text vnodes. */
  type?: string | FunctionComponent | null;
  /** Props object for this node, or the raw string for text vnodes. */
  _props?: unknown;
  /** Child vnodes, populated as the tree is built. */
  _children?: VNode[];
  /** True when this subtree was constructed in SVG mode (via `ds`). */
  _isSvg?: boolean;
  /** Back-pointer to the containing vnode; set when added as a child. */
  _parent?: VNode;
}

/** What `d` / `ds` and the tagged-template helpers return: a single vnode or an array of them. */
export type DResult = VNode | VNode[];

/**
 * Callable shape of `d` / `ds`. Returns a {@link DResult} during the
 * first hydration pass, or a real DOM node when hydration has
 * already completed (subsequent calls fall through to `h` / `hs`).
 */
export type DTreeify = (
  ...args: unknown[]
) => DResult | HTMLElement | SVGElement | DocumentFragment;

/**
 * HTML-mode treeify. Build a {@link VNode} tree to hand to
 * {@link hydrate}. After the first hydration pass, subsequent calls
 * fall through to the regular `h` path so live updates create real
 * DOM nodes.
 */
export const d: DTreeify = context();

/**
 * SVG-mode treeify; the SVG counterpart of {@link d}. Tags built
 * through `ds` are created in the SVG namespace once the tree is
 * rendered.
 */
export const ds: DTreeify = context(true);

/**
 * Tagged-template form of {@link d} - same role, but takes a template
 * literal instead of nested calls. Not tree-shakeable from the
 * declaration; the function form preserves the binding so consumers
 * can drop unused entries during bundling.
 */
export function dhtml(strings: TemplateStringsArray, ...values: unknown[]): DResult {
  return htm.apply(d, [strings, ...values]) as DResult;
}

/**
 * Tagged-template form of {@link ds} for SVG content.
 */
export function dsvg(strings: TemplateStringsArray, ...values: unknown[]): DResult {
  return htm.apply(ds, [strings, ...values]) as DResult;
}

/**
 * Placeholder sentinel for `d` / `ds` calls. Pass `_` to skip a
 * position in the tree without binding anything to the matching DOM
 * node.
 */
export const _: object = {};

let isHydrated: boolean | undefined;

/**
 * Build a treeify function. Pass `isSvg: true` to construct the SVG
 * counterpart. Exposed mainly so callers can build per-namespace
 * variants without going through the package's pre-bound `d` / `ds`.
 */
export function context(
  isSvg?: boolean,
): (...args: unknown[]) => DResult | HTMLElement | SVGElement | DocumentFragment {
  return function () {
    if (isHydrated) {
      // Hydrate on first pass, create on the rest.
      return (isSvg ? hs : h).apply(null, arguments as unknown as Parameters<typeof h>);
    }

    let vnode: VNode | undefined;

    function item(arg: unknown): void {
      if (arg == null) {
        // skip
      } else if (arg === _ || typeof arg === "function") {
        // Components can only be the first argument.
        if (vnode) {
          addChild(vnode, arg as VNode);
        } else {
          vnode = { type: arg as FunctionComponent, _children: [] };
        }
      } else if (Array.isArray(arg)) {
        vnode = vnode || { _children: [] };
        arg.forEach(item);
      } else if (typeof arg === "object") {
        const a = arg as VNode;
        if (a._children) {
          addChild(vnode!, a);
        } else {
          vnode!._props = arg;
        }
      } else {
        // The rest is made into a string.
        if (vnode) {
          addChild(vnode, { type: null, _props: arg });
        } else {
          vnode = { type: arg as string, _children: [] };
        }
      }

      if (isSvg && vnode) vnode._isSvg = isSvg;
    }

    function addChild(parent: VNode, child: VNode): void {
      (parent._children || (parent._children = [])).push(child);
      child._parent = parent;
    }

    Array.from(arguments).forEach(item);

    return vnode as DResult;
  };
}

/**
 * Hydrates the root node with a passed delta tree structure.
 *
 * `delta` looks like:
 * {
 *   type: 'div',
 *   _props: { class: '' },
 *   _children: []
 * }
 */
export function hydrate(delta: VNode, root?: Node): Node | undefined {
  if (!delta) {
    return;
  }

  if (typeof delta.type === "function") {
    // Support Components
    delta = (delta.type as (...args: unknown[]) => unknown).apply(
      null,
      ([delta._props] as unknown[]).concat(
        (delta._children || []).map((c) => (c as unknown as () => unknown)()),
      ),
    ) as VNode;
  }

  const isFragment = delta.type === undefined;
  let isRootFragment = false;
  let el: (Node & { _index?: number; _noskip?: boolean }) | undefined;

  if (!root) {
    const sel = findRootSelector(delta);
    root = sel ? (document.querySelector(sel) ?? undefined) : undefined;
  }

  function findRootSelector(delta: VNode): string {
    let selector = "";
    let prop: unknown;
    const props = delta._props as Record<string, unknown> | undefined;
    if (props && (prop = props.id)) {
      selector = "#";
    } else if (props && (prop = props.class)) {
      selector = ".";
    } else {
      prop = delta.type;
      if (!prop) {
        isRootFragment = true;
        return delta._children && delta._children[0]
          ? findRootSelector((delta._children[0] as unknown as () => VNode)())
          : "";
      }
    }

    return (
      selector +
      (typeof prop === "function" ? (prop as () => string)() : (prop as string))
        .split(" ")
        // Escape CSS selector https://bit.ly/36h9I83
        .map((sel) => sel.replace(/([^\x80-￿\w-])/g, "\\$1"))
        .join(".")
    );
  }

  function item(arg: unknown): void {
    if (arg instanceof Node) {
      el = arg as Node & { _index?: number };
      // Keep a child pointer for multiple hydrate calls per element.
      el._index = el._index || 0;
    } else if (Array.isArray(arg)) {
      arg.forEach(item);
    } else if (el) {
      let target: (Node & { data?: string; _noskip?: boolean }) | undefined =
        filterChildNodes(el)[el._index!];
      let current: string | unknown | undefined;
      let prefix: string | undefined;

      const updateText = (text: string): void => {
        el!._index!++;

        // Leave whitespace alone.
        if (target!.data!.trim() !== text.trim()) {
          if ((arg as VNode)._parent!._children!.length !== filterChildNodes(el!).length) {
            // If the parent's virtual children length don't match the DOM's,
            // it's probably adjacent text nodes stuck together. Split them.
            (target as Text).splitText(target!.data!.indexOf(text) + text.length);
            if (current) {
              // Leave prefix whitespace intact.
              prefix = (current as string).match(/^\s*/)![0];
            }
          }
          // Leave whitespace alone.
          if (target!.data!.trim() !== text.trim()) {
            target!.data = text;
          }
        }
      };

      if (target) {
        // Skip placeholder underscore.
        if (arg === _) {
          el._index!++;
        } else if (typeof arg === "object") {
          const v = arg as VNode;
          if (v.type === null && target.nodeType === TEXT_NODE) {
            // This is a text vnode, add noskip so spaces don't get skipped.
            target._noskip = true;
            updateText(v._props as string);
          } else if (v.type) {
            hydrate(v, target);
            el._index!++;
          }
        }
      }

      if (typeof arg === "function") {
        current = target ? target.data : undefined;
        prefix = "";
        let hydrated = false;
        let marker: Node | undefined;
        let startNode: Node | undefined;
        api.effect(() => {
          isHydrated = hydrated;

          let result = (arg as () => unknown)();
          if (result && (result as VNode)._children) {
            result = (result as VNode).type ? result : (result as VNode)._children;
          }

          const isStringable = typeof result === "string" || typeof result === "number";
          result = isStringable ? (prefix ?? "") + (result as string | number) : result;

          if (hydrated || (!target && !isFragment)) {
            current = api.insert(el!, result, marker, current, startNode);
          } else {
            if (isStringable) {
              updateText(result as string);
            } else {
              if (Array.isArray(result)) {
                startNode = target;
                target = el;
              }

              if (isRootFragment) {
                target = el;
              }

              hydrate(result as VNode, target!);
              current = [];
            }

            if (!isRootFragment && target) {
              marker = api.add(el!, "", filterChildNodes(el!)[el!._index!]) as Node;
            } else {
              marker = api.add(el!.parentNode!, "", el!.nextSibling) as Node;
            }
          }

          isHydrated = false;
          hydrated = true;
        });
      } else if (typeof arg === "object") {
        if (!(arg as VNode)._children) {
          api.property(el, arg, null, delta._isSvg);
        }
      }
    }
  }

  [root, delta._props, delta._children || delta].forEach(item);

  return el;
}

/**
 * Filter out whitespace text nodes unless it has a noskip indicator.
 */
function filterChildNodes(parent: Node): Array<Node & { data?: string; _noskip?: boolean }> {
  return Array.from(parent.childNodes).filter((el) => {
    const t = el as Node & { data?: string; _noskip?: boolean };
    return t.nodeType !== TEXT_NODE || (t.data && t.data.trim()) || t._noskip;
  }) as Array<Node & { data?: string; _noskip?: boolean }>;
}

/**
 * JSX type surface for typed JSX use under `d` / `ds`. Re-exports the
 * `JSXInternal` namespace as `JSX`. Module-level instead of
 * `namespace d { import JSX = ... }` so the declaration remains
 * erasable under tsconfig's `erasableSyntaxOnly`. Deno doc resolves
 * this reference to the underlying namespace declaration in `jsx.ts`,
 * where the JSDoc lives.
 */
export type { _JSXInternal as JSX };
