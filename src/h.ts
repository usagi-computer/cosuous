/**
 * Hyperscript core. Exposes the `h` function that builds DOM elements
 * (or document fragments) from a tag, a props object, and a variadic
 * child list, plus the low-level `add` / `insert` / `property` /
 * `removeNodes` primitives that the rest of cosuous calls through the
 * shared {@link HyperscriptApi} surface (`api`).
 *
 * Most consumers should import from the package root (`cosuous`) rather
 * than this module - the root entry wires `api.effect` / `api.isSignal`
 * / `api.isComputed` from `./signal.ts` and adds the SVG-mode `hs`
 * wrapper. Importing `cosuous/h` directly gets the un-delegated `h`
 * implementation, which is useful for ahead-of-time tools but skips
 * the runtime hooks the package root attaches.
 *
 * Adapted from Hyper DOM Expressions - The MIT License - Ryan Carniato.
 *
 * @module h
 */

import { EVENT_PREFIX_LEN, FRAGMENT_NODE, SVG_NS } from "./constants.ts";
import type { JSXInternal } from "./jsx.ts";
import type { ElementChildren, FunctionComponent } from "./shared.ts";

// Internal DOM extensions used by this module and a few siblings (template,
// hydrate, map). They are tags hung directly on Nodes/Elements; the casts
// stay narrow so the runtime contract is documented rather than hidden.
type NodeWithListeners = Node & {
  _listeners?: Record<string, (ev: Event) => unknown>;
};

/**
 * Marker pair representing a fragment of two or more children. The
 * `_startMark` Text node is inserted before the fragment's first child
 * so siblings can be located after the fragment's contents have been
 * hoisted into the parent element.
 */
export interface Frag {
  _startMark: Text;
}

/**
 * Any value `api.add` knows how to insert directly: a DOM node, a
 * document fragment, or a primitive that will be coerced to a text
 * node.
 */
export type Value = Node | DocumentFragment | string | number;

/**
 * Overloaded `h` call signature. Used as the type of {@link api}'s `h`
 * and `hs` fields, the package-root exports of the same names, and any
 * intercepting wrapper a consumer might install on `api.h`.
 *
 * Three overloads match the three call shapes JSX and the `html`
 * tagged template emit:
 *
 * 1. Element by tag name, optional props, optional children.
 * 2. Component (a function), optional props, optional children -
 *    returns whatever the component returns.
 * 3. Fragment - first arg is an array (typically `[]`), remaining args
 *    are appended as children, returns a `DocumentFragment`.
 */
export interface Hyperscript {
  (
    type: string,
    props:
      | ((JSXInternal.HTMLAttributes | JSXInternal.SVGAttributes) & Record<string, unknown>)
      | null,
    ...children: ElementChildren[]
  ): HTMLElement | SVGElement;
  (
    type: FunctionComponent,
    props:
      | ((JSXInternal.HTMLAttributes | JSXInternal.SVGAttributes) & Record<string, unknown>)
      | null,
    ...children: ElementChildren[]
  ): HTMLElement | SVGElement | DocumentFragment;
  (tag: ElementChildren[] | [], ...children: ElementChildren[]): DocumentFragment;
}

/**
 * Shared mutable surface populated by this file (h/insert/property/add/rm),
 * index.ts (hs/effect/isSignal/isComputed), and template.ts (action).
 * Declared as a single interface so cross-module assignments stay typed.
 */
export interface HyperscriptApi {
  // Hyperscript
  h: Hyperscript;
  hs: Hyperscript;
  isSvg: boolean;

  // DOM I/O
  insert<T>(
    el: Node,
    value: T,
    endMark?: Node | null,
    current?: T | Frag,
    startNode?: Node | null,
  ): T | Frag;
  property(el: Node, value: unknown, name: string | null, isAttr?: boolean, isCss?: boolean): void;
  add(parent: Node, value: Value | Value[], endMark?: Node | null): Node | Frag;
  rm(parent: Node, startNode: Node, endMark: Node): void;

  // Reactive primitives (wired in src/index.ts).
  effect(fn: () => void | (() => void)): () => void;
  isSignal(value: unknown): boolean;
  isComputed(value: unknown): boolean;

  // Template binding (wired in src/template.ts when that entry is imported).
  action?: (
    action: TemplateAction,
    props: Record<string, unknown>,
    keyedActions: Record<string, Array<(value: unknown) => void>>,
  ) => (key: string, propName: string | null) => void;
}

/**
 * Recorded template action, produced by `src/template.ts` when a `t` /
 * `s` tag is encountered during a template's first render. The
 * extra `_*` fields are bookkeeping used by `api.action` at clone
 * time; they aren't part of the documented public contract but are
 * exposed because cross-module assignments need a shared type.
 */
export interface TemplateAction {
  (element: Node, endMark: Node | null, propName: string | null, value: unknown): void;
  _el?: Node;
  _endMark?: Node | null;
  _propName?: string | null;
  _key?: string;
  _observed?: boolean;
  _bind?: boolean;
  _target?: Node;
  _endMarkTarget?: Node | null;
  _paths?: number[];
  _endMarkPath?: number[] | null;
  $s?: number;
}

/**
 * The shared {@link HyperscriptApi} surface used across the package.
 *
 * Populated incrementally at module load: `h.ts` assigns
 * `h` / `insert` / `property` / `add` / `rm`; `index.ts` assigns
 * `effect` / `isSignal` / `isComputed` and the SVG-mode `hs` wrapper;
 * `template.ts` assigns `action` if it's imported. Empty at the
 * declaration site - the cast names the contract callers can rely on
 * once `index.ts` has run.
 *
 * Monkey-patching `api.h` (or any other field) at runtime is the
 * supported extension point: the package-root `h` / `hs` exports are
 * thin delegators over `api.h` / `api.hs`, so replacing the field is
 * observed by every downstream call site.
 */
export const api = {} as HyperscriptApi;

const EMPTY_ARR: ElementChildren[] = [];

const castNode = (value: unknown): Text | Node | DocumentFragment => {
  if (typeof value === "string") {
    return document.createTextNode(value);
  }
  // Note that a DocumentFragment is an instance of Node
  if (!(value instanceof Node)) {
    // Passing an empty array creates a DocumentFragment.
    // Note this means api.add is not purely a subcall of api.h; it can nest.
    return api.h(EMPTY_ARR, value as ElementChildren);
  }
  return value;
};

const frag = (value: Text | Node | DocumentFragment): Node | Frag | undefined => {
  const { childNodes } = value;
  if (!childNodes || value.nodeType !== FRAGMENT_NODE) return;
  if (childNodes.length < 2) return childNodes[0]!;
  // For a fragment of 2 elements or more add a startMark. This is required for
  // multiple nested conditional computeds that return fragments.

  // It looks recursive here but the next call's fragOrNode is only Text('')
  return {
    _startMark: api.add(value, "", childNodes[0]) as Text,
  };
};

/**
 * Insert `value` into `parent` before `endMark`, or at the end if
 * `endMark` is null/undefined. Strings are wrapped in a Text node;
 * arrays are wrapped in a DocumentFragment. Returns the resulting
 * node (or a {@link Frag} pair for multi-child fragments so the
 * caller can track the fragment's boundary).
 */
export const add = (parent: Node, value: Value | Value[], endMark?: Node | null): Node | Frag => {
  const node = castNode(value);
  const fragOrNode = frag(node) || node;

  // If endMark is `null`, value will be added to the end of the list.
  parent.insertBefore(node, (endMark && endMark.parentNode && endMark) || null);
  return fragOrNode;
};

const insertString = (
  el: Node,
  value: string,
  endMark: Node | null | undefined,
  current: unknown,
): void => {
  if (current == null || !el.firstChild) {
    // Using textContent is a lot faster than append -> createTextNode.
    if (endMark) api.add(el, value, endMark);
    else el.textContent = value;
  } else if (endMark) {
    (endMark.previousSibling || el.lastChild) as Text & { data: string };
    const target = (endMark.previousSibling || el.lastChild) as Text;
    target.data = value;
  } else {
    (el.firstChild as Text).data = value;
  }
};

const insertNode = (
  el: Node,
  value: unknown,
  endMark: Node | null | undefined,
  current: unknown,
  startNode: Node | null | undefined,
): Node | Frag | null => {
  if (endMark) {
    // `current` can't be `0`, it's coerced to a string in insert.
    if (current) {
      // Support fragments; startNode may have shifted before clearing.
      if (!startNode) {
        const frag = current as Frag;
        startNode = (frag._startMark && frag._startMark.nextSibling) || endMark.previousSibling;
      }
      if (startNode) api.rm(el, startNode, endMark);
    }
  } else {
    el.textContent = "";
  }
  return value && value !== true ? api.add(el, value as Value, endMark) : null;
};

/**
 * Reactively place `value` into `el`, replacing whatever was there
 * (`current`) up to but not including `endMark`. If `value` is a
 * function, it's wrapped in an effect so the slot stays in sync with
 * any signals it reads. Returns the new "current" value, which the
 * caller should pass back on the next update.
 */
export const insert = <T>(
  el: Node,
  value: T,
  endMark?: Node | null,
  current?: T | Frag,
  startNode?: Node | null,
): T | Frag => {
  // This is needed if the el is a DocumentFragment initially.
  el = (endMark && endMark.parentNode) || el;

  // Save startNode of current. In clear() endMark.previousSibling is not always
  // accurate if content gets pulled before clearing.
  startNode = startNode || (current instanceof Node ? current : null);

  if (value === current) return current as T | Frag;

  let v: unknown = value;
  if (
    (!current || typeof current === "string") &&
    (typeof v === "string" || (typeof v === "number" && ((v = String(v)), true)))
  ) {
    insertString(el, v as string, endMark, current);
    return v as T | Frag;
  }

  if (typeof v === "function") {
    api.effect(() => {
      current = api.insert(
        el,
        (v as (this: { el: Node; endMark: Node | null | undefined }) => unknown).call({
          el,
          endMark,
        }) as T,
        endMark,
        current,
        startNode,
      ) as T | Frag;
    });
    return current as T | Frag;
  }

  return insertNode(el, v, endMark, current, startNode) as T | Frag;
};

function eventProxy(this: NodeWithListeners, e: Event): unknown {
  return this._listeners && this._listeners[e.type]!(e);
}

const handleEvent = (
  el: Node,
  name: string,
  value: ((ev: Event | null) => unknown) | null | undefined,
): void => {
  name = name.slice(EVENT_PREFIX_LEN).toLowerCase();

  if (value) {
    el.addEventListener(name, eventProxy as EventListener);
  } else {
    el.removeEventListener(name, eventProxy as EventListener);
  }

  const target = el as NodeWithListeners;
  (target._listeners || (target._listeners = {}))[name] = value as (ev: Event) => unknown;
};

/**
 * Apply `value` to `el` as a prop, attribute, style, or event handler.
 * Dispatch order: `null`-name (or `attrs`) recurses over every key in
 * `value`; `on*` names install event listeners through a shared
 * `eventProxy`; functions are wrapped in an effect; everything else
 * is set as a DOM property or HTML attribute depending on the name.
 */
export const property = (
  el: Node,
  value: unknown,
  name: string | null,
  isAttr?: boolean,
  isCss?: boolean,
): void => {
  if (value == null) return;
  if (!name || (name === "attrs" && (isAttr = true))) {
    for (name in value as Record<string, unknown>) {
      api.property(el, (value as Record<string, unknown>)[name], name, isAttr, isCss);
    }
  } else if (
    name[0] === "o" &&
    name[1] === "n" &&
    !api.isSignal(value) &&
    !api.isComputed(value) &&
    !(value as { $s?: unknown }).$s
  ) {
    // Functions added as event handlers are not executed on render unless
    // they are reactive (signal/computed) or carry a template-tag marker.
    handleEvent(el, name, value as ((ev: Event | null) => unknown) | null | undefined);
  } else if (typeof value === "function") {
    api.effect(() => {
      api.property(
        el,
        (value as (this: { el: Node; name: string }) => unknown).call({ el, name: name! }),
        name,
        isAttr,
        isCss,
      );
    });
  } else if (isCss) {
    (el as HTMLElement).style.setProperty(name, value as string);
  } else if (
    // isAttr wont be true for 'for' but it needs to be an attribute
    isAttr ||
    name.slice(0, 5) === "data-" ||
    name.slice(0, 5) === "aria-" ||
    name === "for"
  ) {
    (el as Element).setAttribute(name, value as string);
  } else if (name === "style") {
    if (typeof value === "string") {
      (el as HTMLElement).style.cssText = value;
    } else {
      api.property(el, value, null, isAttr, true);
    }
  } else {
    if (name === "class") name += "Name";
    (el as unknown as Record<string, unknown>)[name] = value;
  }
};

/**
 * Removes nodes, starting from `startNode` (inclusive) to `endMark` (exclusive).
 */
export const removeNodes = (parent: Node, startNode: Node | null, endMark: Node): void => {
  while (startNode && startNode !== endMark) {
    const n: Node | null = startNode.nextSibling;
    // Is needed in case the child was pulled out the parent before clearing.
    if (parent === startNode.parentNode) {
      parent.removeChild(startNode);
    }
    startNode = n;
  }
};

/**
 * Build a DOM element, document fragment, or component subtree.
 *
 * Public overload signatures match the three call shapes JSX and the
 * `html` tagged template emit. The implementation signature below is
 * intentionally loose; consumers see the narrow overloads.
 */
export function h(
  type: string,
  props:
    | ((JSXInternal.HTMLAttributes | JSXInternal.SVGAttributes) & Record<string, unknown>)
    | null,
  ...children: ElementChildren[]
): HTMLElement | SVGElement;
export function h(
  type: FunctionComponent,
  props:
    | ((JSXInternal.HTMLAttributes | JSXInternal.SVGAttributes) & Record<string, unknown>)
    | null,
  ...children: ElementChildren[]
): HTMLElement | SVGElement | DocumentFragment;
export function h(tag: ElementChildren[] | [], ...children: ElementChildren[]): DocumentFragment;
export function h(...args: unknown[]): HTMLElement | SVGElement | DocumentFragment {
  let el: HTMLElement | SVGElement | DocumentFragment | undefined;
  let onMountFn: ((el: Element) => void) | null = null;
  let onUnmountFn: ((el: Element) => void) | null = null;

  const item = (arg: unknown): void => {
    if (arg == null) return;
    if (typeof arg === "string") {
      if (el) {
        api.add(el, arg);
      } else {
        el = api.isSvg
          ? (document.createElementNS(SVG_NS, arg) as SVGElement)
          : document.createElement(arg);
      }
    } else if (Array.isArray(arg)) {
      // Support Fragments
      if (!el) el = document.createDocumentFragment();
      arg.forEach(item);
    } else if (arg instanceof Node) {
      if (el) {
        api.add(el, arg);
      } else {
        // Support updates
        el = arg as HTMLElement | SVGElement | DocumentFragment;
      }
    } else if (typeof arg === "object") {
      // Strip lifecycle/ref keys before applying the remaining props, so a
      // props object containing multiple of them is still applied once.
      // ref fires synchronously with the created element; onMount/onUnmount
      // are deferred until mount/unmount of `el`.
      const { onMount, onUnmount, ref, ...rest } = arg as Record<string, unknown>;
      if (typeof onMount === "function") onMountFn = onMount as (el: Element) => void;
      if (typeof onUnmount === "function") onUnmountFn = onUnmount as (el: Element) => void;
      if (typeof ref === "function") (ref as (el: unknown) => void)(el);
      api.property(el!, rest, null, api.isSvg);
    } else if (typeof arg === "function") {
      if (el) {
        // See note in add.js#frag() - This is a Text('') node
        const endMark = api.add(el, "") as Text;
        api.insert(el, arg, endMark);
      } else {
        // Support Components. JSX emits h(Component, null, ...) when no props
        // are passed; coerce to {} so components can destructure props.
        const componentArgs = args.splice(1);
        if (componentArgs[0] == null) componentArgs[0] = {};
        el = (arg as (...a: unknown[]) => HTMLElement | SVGElement | DocumentFragment).apply(
          null,
          componentArgs,
        );
      }
    } else {
      api.add(el!, "" + arg);
    }
  };
  args.forEach(item);

  // Call onMount if present
  if (onMountFn && el && el instanceof Element) {
    // Use requestAnimationFrame to ensure it's mounted
    requestAnimationFrame(() => {
      if ((el as Element).isConnected) onMountFn!(el as Element);
    });
  }

  // Set up onUnmount if present
  if (onUnmountFn && el && el instanceof Element) {
    observeUnmount(el, onUnmountFn);
  }

  return el!;
}

// A single observer is shared across every element that registers an
// onUnmount. The WeakMap allows never-mounted elements to be GC'd.
const unmountCallbacks: WeakMap<Element, (el: Element) => void> = new WeakMap();
let unmountObserver: MutationObserver | undefined;

const fireUnmount = (node: Node): void => {
  const cb = node instanceof Element ? unmountCallbacks.get(node) : undefined;
  if (cb) {
    unmountCallbacks.delete(node as Element);
    cb(node as Element);
  }
  // A parent removal must still fire onUnmount on any descendants that
  // registered for it, so walk the subtree.
  if (node.childNodes) {
    for (let i = 0; i < node.childNodes.length; i++) fireUnmount(node.childNodes[i]!);
  }
};

const observeUnmount = (el: Element, onUnmountFn: (el: Element) => void): void => {
  unmountCallbacks.set(el, onUnmountFn);
  if (unmountObserver) return;
  unmountObserver = new MutationObserver((mutations) => {
    mutations.forEach((m) => m.removedNodes.forEach(fireUnmount));
  });
  unmountObserver.observe(document, { childList: true, subtree: true });
};

api.h = h;
api.insert = insert;
api.property = property;
api.add = add;
api.rm = removeNodes;
