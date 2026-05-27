/* Adapted from Hyper DOM Expressions - The MIT License - Ryan Carniato */

import { EVENT_PREFIX_LEN, FRAGMENT_NODE, SVG_NS } from "./constants.js";

/**
 * Internal API.
 * Consumer must provide a reactive effect at api.effect(fn: () => void).
 *
 * @typedef {boolean} hSVG Determines if `h` will build HTML or SVG elements
 * @type {{
 *   h:         hTag,
 *   isSvg:     hSVG,
 *   insert:    hInsert,
 *   property:  hProperty,
 *   add:       hAdd,
 *   rm:        hRemoveNodes,
 *   effect:    (fn: () => void) => () => void,
 *   isSignal:  (fn: Function) => boolean,
 *   isComputed:(fn: Function) => boolean,
 * }}
 */
// @ts-ignore Object is populated in index.js
export const api = {};

/** @type {[]} Instead of `any[]` */
const EMPTY_ARR = [];

/** @type {(value: *) => Text | Node | DocumentFragment} */
const castNode = (value) => {
  if (typeof value === "string") {
    return document.createTextNode(value);
  }
  // Note that a DocumentFragment is an instance of Node
  if (!(value instanceof Node)) {
    // Passing an empty array creates a DocumentFragment
    // Note this means api.add is not purely a subcall of api.h; it can nest
    return api.h(EMPTY_ARR, value);
  }
  return value;
};

/**
 * @typedef {{ _startMark: Text }} Frag
 * @type {(value: Text | Node | DocumentFragment) => (Node | Frag)?}
 */
const frag = (value) => {
  const { childNodes } = value;
  if (!childNodes || value.nodeType !== FRAGMENT_NODE) return;
  if (childNodes.length < 2) return childNodes[0];
  // For a fragment of 2 elements or more add a startMark. This is required for
  // multiple nested conditional computeds that return fragments.

  // It looks recursive here but the next call's fragOrNode is only Text('')
  return {
    _startMark: /** @type {Text} */ (api.add(value, "", childNodes[0])),
  };
};

/**
 * Add a string or node before a reference node or at the end.
 * @typedef {Node | string | number} Value
 * @typedef {(parent: Node, value: Value | Value[], endMark: Node?) => Node | Frag} hAdd
 * @type {hAdd}
 */
export const add = (parent, value, endMark) => {
  value = castNode(value);
  const fragOrNode = frag(value) || value;

  // If endMark is `null`, value will be added to the end of the list.
  parent.insertBefore(value, endMark && endMark.parentNode && endMark);
  return fragOrNode;
};

const insertString = (el, value, endMark, current) => {
  if (current == null || !el.firstChild) {
    // Using textContent is a lot faster than append -> createTextNode.
    if (endMark) api.add(el, value, endMark);
    else el.textContent = /** @type {string} */ (value);
  } else if (endMark) {
    (endMark.previousSibling || el.lastChild).data = value;
  } else {
    el.firstChild.data = value;
  }
};

const insertNode = (el, value, endMark, current, startNode) => {
  if (endMark) {
    // `current` can't be `0`, it's coerced to a string in insert.
    if (current) {
      // Support fragments; startNode may have shifted before clearing.
      if (!startNode) {
        startNode =
          (current._startMark && current._startMark.nextSibling) || endMark.previousSibling;
      }
      api.rm(el, startNode, endMark);
    }
  } else {
    el.textContent = "";
  }
  return value && value !== true ? api.add(el, value, endMark) : null;
};

/**
 * @typedef {(el: Node, value: *, endMark: Node?, current: (Node | Frag)?,
 * startNode: Node?) => Node | Frag } hInsert
 * @type {hInsert}
 */
export const insert = (el, value, endMark, current, startNode) => {
  // This is needed if the el is a DocumentFragment initially.
  el = (endMark && endMark.parentNode) || el;

  // Save startNode of current. In clear() endMark.previousSibling is not always
  // accurate if content gets pulled before clearing.
  startNode = startNode || (current instanceof Node && current);

  if (value === current) return current;

  if (
    (!current || typeof current === "string") &&
    // @ts-ignore Doesn't like `value += ''`
    (typeof value === "string" || (typeof value === "number" && (value += "")))
  ) {
    insertString(el, value, endMark, current);
    return value;
  }

  if (typeof value === "function") {
    api.effect(() => {
      current = api.insert(el, value.call({ el, endMark }), endMark, current, startNode);
    });
    return current;
  }

  return insertNode(el, value, endMark, current, startNode);
};

/**
 * Proxy an event to hooked event handlers.
 * @this Node & { _listeners: { [name: string]: (ev: Event) => * } }
 * @type {(e: Event) => *}
 */
function eventProxy(e) {
  return this._listeners && this._listeners[e.type](e);
}

/**
 * @type {(el: Node, name: string, value: (ev: Event?) => *) => void}
 */
const handleEvent = (el, name, value) => {
  name = name.slice(EVENT_PREFIX_LEN).toLowerCase();

  if (value) {
    el.addEventListener(name, eventProxy);
  } else {
    el.removeEventListener(name, eventProxy);
  }

  (el._listeners || (el._listeners = {}))[name] = value;
};

/**
 * @typedef {(el: Node, value: *, name: string, isAttr: boolean?, isCss: boolean?) => void} hProperty
 * @type {hProperty}
 */
export const property = (el, value, name, isAttr, isCss) => {
  if (value == null) return;
  if (!name || (name === "attrs" && (isAttr = true))) {
    for (name in value) {
      api.property(el, value[name], name, isAttr, isCss);
    }
  } else if (
    name[0] === "o" &&
    name[1] === "n" &&
    !api.isSignal(value) &&
    !api.isComputed(value) &&
    !value.$s
  ) {
    // Functions added as event handlers are not executed on render unless
    // they are reactive (signal/computed) or carry a template-tag marker.
    handleEvent(el, name, value);
  } else if (typeof value === "function") {
    api.effect(() => {
      api.property(el, value.call({ el, name }), name, isAttr, isCss);
    });
  } else if (isCss) {
    el.style.setProperty(name, value);
  } else if (
    // isAttr wont be true for 'for' but it needs to be an attribute
    isAttr ||
    name.slice(0, 5) === "data-" ||
    name.slice(0, 5) === "aria-" ||
    name === "for"
  ) {
    el.setAttribute(name, value);
  } else if (name === "style") {
    if (typeof value === "string") {
      el.style.cssText = value;
    } else {
      api.property(el, value, null, isAttr, true);
    }
  } else {
    if (name === "class") name += "Name";
    el[name] = value;
  }
};

/**
 * Removes nodes, starting from `startNode` (inclusive) to `endMark` (exclusive).
 * @typedef {(parent: Node, startNode: Node, endMark: Node) => void} hRemoveNodes
 * @type {hRemoveNodes}
 */
export const removeNodes = (parent, startNode, endMark) => {
  while (startNode && startNode !== endMark) {
    const n = startNode.nextSibling;
    // Is needed in case the child was pulled out the parent before clearing.
    if (parent === startNode.parentNode) {
      parent.removeChild(startNode);
    }
    startNode = n;
  }
};

/**
 * Cosuous `h` tag aka hyperscript.
 * @typedef {HTMLElement | SVGElement | DocumentFragment} DOM
 * @typedef {(tag: string? | [], props: object?, ...children: Node | *) => DOM} hTag
 * @type {hTag}
 */

export const h = (...args) => {
  let el;
  let onMountFn = null;
  let onUnmountFn = null;

  const item = (/** @type {*} */ arg) => {
    if (arg == null) return;
    if (typeof arg === "string") {
      if (el) {
        api.add(el, arg);
      } else {
        el = api.isSvg ? document.createElementNS(SVG_NS, arg) : document.createElement(arg);
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
        el = arg;
      }
    } else if (typeof arg === "object") {
      // Strip lifecycle/ref keys before applying the remaining props, so a
      // props object containing multiple of them is still applied once.
      // ref fires synchronously with the created element; onMount/onUnmount
      // are deferred until mount/unmount of `el`.
      const { onMount, onUnmount, ref, ...rest } = arg;
      if (typeof onMount === "function") onMountFn = onMount;
      if (typeof onUnmount === "function") onUnmountFn = onUnmount;
      if (typeof ref === "function") ref(el);
      // @ts-ignore 0 | 1 is a boolean but can't type cast; they don't overlap
      api.property(el, rest, null, api.isSvg);
    } else if (typeof arg === "function") {
      if (el) {
        // See note in add.js#frag() - This is a Text('') node
        const endMark = /** @type {Text} */ (api.add(el, ""));
        api.insert(el, arg, endMark);
      } else {
        // Support Components. JSX emits h(Component, null, ...) when no props
        // are passed; coerce to {} so components can destructure props.
        const componentArgs = args.splice(1);
        if (componentArgs[0] == null) componentArgs[0] = {};
        el = arg.apply(null, componentArgs);
      }
    } else {
      api.add(el, "" + arg);
    }
  };
  args.forEach(item);

  // Call onMount if present
  if (onMountFn && el && el instanceof Element) {
    // Use requestAnimationFrame to ensure it's mounted
    requestAnimationFrame(() => {
      if (el.isConnected) onMountFn(el);
    });
  }

  // Set up onUnmount if present
  if (onUnmountFn && el && el instanceof Element) {
    observeUnmount(el, onUnmountFn);
  }

  return el;
};

// A single observer is shared across every element that registers an
// onUnmount. The WeakMap allows never-mounted elements to be GC'd.
const unmountCallbacks = /** @type {WeakMap<Element, (el: Element) => void>} */ (new WeakMap());
let unmountObserver;

const fireUnmount = (/** @type {Node} */ node) => {
  const cb = node instanceof Element && unmountCallbacks.get(node);
  if (cb) {
    unmountCallbacks.delete(/** @type {Element} */ (node));
    cb(/** @type {Element} */ (node));
  }
  // A parent removal must still fire onUnmount on any descendants that
  // registered for it, so walk the subtree.
  if (node.childNodes) {
    for (let i = 0; i < node.childNodes.length; i++) fireUnmount(node.childNodes[i]);
  }
};

const observeUnmount = (el, onUnmountFn) => {
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
