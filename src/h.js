/* Adapted from Hyper DOM Expressions - The MIT License - Ryan Carniato */

/**
 * Internal API.
 * Consumer must provide an observable at api.subscribe<T>(observer: () => T).
 *
 * @typedef {boolean} hSVG Determines if `h` will build HTML or SVG elements
 * @type {{
 *   h:         hTag,
 *   s:         hSVG,
 *   insert:    hInsert,
 *   property:  hProperty,
 *   add:       hAdd,
 *   rm:        hRemoveNodes,
 *   subscribe: (observer: () => *) => void,
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
  if (!childNodes || value.nodeType !== 11) return;
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

  // @ts-ignore Allow empty if statement
  if (value === current);
  else if (
    (!current || typeof current === "string") &&
    // @ts-ignore Doesn't like `value += ''`

    (typeof value === "string" || (typeof value === "number" && (value += "")))
  ) {
    // Block optimized for string insertion.

    if (current == null || !el.firstChild) {
      if (endMark) {
        api.add(el, value, endMark);
      } else {
        // Using textContent is a lot faster than append -> createTextNode.
        el.textContent = /** @type {string} See `value += '' */ (value);
      }
    } else {
      if (endMark) {
        (endMark.previousSibling || el.lastChild).data = value;
      } else {
        el.firstChild.data = value;
      }
    }
    current = value;
  } else if (typeof value === "function") {
    api.subscribe(() => {
      current = api.insert(el, value.call({ el, endMark }), endMark, current, startNode);
    });
  } else {
    // Block for nodes, fragments, Arrays, non-stringables and node -> stringable.
    if (endMark) {
      // `current` can't be `0`, it's coerced to a string in insert.
      if (current) {
        if (!startNode) {
          // Support fragments
          startNode =
            (current._startMark && current._startMark.nextSibling) || endMark.previousSibling;
        }
        api.rm(el, startNode, endMark);
      }
    } else {
      el.textContent = "";
    }
    current = null;

    if (value && value !== true) {
      current = api.add(el, value, endMark);
    }
  }

  return current;
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
  name = name.slice(2).toLowerCase();

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
  } else if (name[0] === "o" && name[1] === "n" && !value.$o) {
    // Functions added as event handlers are not executed
    // on render unless they have an observable indicator.
    handleEvent(el, name, value);
  } else if (typeof value === "function") {
    api.subscribe(() => {
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
    // @ts-ignore Allow empty if

    if (arg == null);
    else if (typeof arg === "string") {
      if (el) {
        api.add(el, arg);
      } else {
        el = api.s
          ? document.createElementNS("http://www.w3.org/2000/svg", arg)
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
        el = arg;
      }
    } else if (typeof arg === "object") {
      // Detect onMount
      if (arg && typeof arg.onMount === "function") {
        onMountFn = arg.onMount;
        // eslint-disable-next-line no-unused-vars
        const { onMount, ...rest } = arg;
        api.property(el, rest, null, api.s);
      }
      // Detect onUnmount
      if (arg && typeof arg.onUnmount === "function") {
        onUnmountFn = arg.onUnmount;
        // eslint-disable-next-line no-unused-vars
        const { onUnmount, ...rest } = arg;
        api.property(el, rest, null, api.s);
      }
      if (!("onMount" in arg) && !("onUnmount" in arg)) {
        // @ts-ignore 0 | 1 is a boolean but can't type cast; they don't overlap
        api.property(el, arg, null, api.s);
      }
    } else if (typeof arg === "function") {
      if (el) {
        // See note in add.js#frag() - This is a Text('') node
        const endMark = /** @type {Text} */ (api.add(el, ""));
        api.insert(el, arg, endMark);
      } else {
        // Support Components
        el = arg.apply(null, args.splice(1));
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
    // detect removal and call onUnmount
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.removedNodes.forEach((node) => {
          if (node === el) {
            onUnmountFn(el);
            observer.disconnect();
          }
        });
      });
    });
    if (el.parentNode) {
      observer.observe(el.parentNode, { childList: true });
    } else {
      // If not mounted yet, observe when it gets a parent
      const parentCheck = setInterval(() => {
        if (el.parentNode) {
          observer.observe(el.parentNode, { childList: true });
          clearInterval(parentCheck);
        }
      }, 20);
    }
  }

  return el;
};

api.h = h;
api.insert = insert;
api.property = property;
api.add = add;
api.rm = removeNodes;
