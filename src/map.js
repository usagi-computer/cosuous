/* Adapted from Stage0 - The MIT License - Pavel Martynov */
/* Adapted from DOM Expressions - The MIT License - Ryan Carniato */
import { api } from "./index.js";
import { effect, effectScope, untracked, onCleanup } from "./signal.js";
import { BACKWARD, FORWARD, FRAGMENT_NODE, GROUPING } from "./constants.js";

// Re-exported for backward compatibility with any consumer importing these
// names from "cosuous/map" directly.
export { BACKWARD, FORWARD, GROUPING };

/**
 * Map over a list of items that create DOM nodes.
 *
 * @param  {Function} items - Function or signal that creates a list.
 * @param  {Function} expr
 * @param {boolean} [cleaning]
 * @return {DocumentFragment}
 */
export function map(items, expr, cleaning) {
  // Disable cleaning for templates by default.
  if (cleaning == null) cleaning = !expr.$t;

  let parent = document.createDocumentFragment();
  const beforeNode = add(parent, "");
  const afterNode = add(parent, "");
  const disposers = new Map();

  let prev = [];
  const unsubscribe = effect(() => {
    const b = items();
    prev = untracked(() =>
      reconcile(
        prev,
        b || [],
        beforeNode,
        afterNode,
        createFn,
        cleaning && disposeAll,
        cleaning && dispose,
      ),
    );
  });

  onCleanup(unsubscribe);
  onCleanup(disposeAll);

  function disposeAll() {
    disposers.forEach((d) => d());
    disposers.clear();
  }

  function dispose(node) {
    let disposer = disposers.get(node);
    disposer && disposer();
    disposers.delete(node);
  }

  function createFn(parent, item, i, data, afterNode) {
    // The scope call makes it possible for the child's effects to outlive
    // their parent's update cycle and be disposed individually.
    if (!cleaning) return add(parent, expr(item, i, data), afterNode);
    let node;
    const disposeFn = effectScope(() => {
      node = add(parent, expr(item, i, data), afterNode);
    });
    disposers.set(node, disposeFn);
    return node;
  }

  return parent;
}

// Wipe out the list when b is empty. Reuses parent.textContent for speed when
// no other content surrounds the markers.
function clearList(parent, beforeNode, afterNode, onClear) {
  const startMark = beforeNode.previousSibling;
  if ((startMark && startMark.previousSibling) || afterNode.nextSibling) {
    api.rm(parent, beforeNode.nextSibling, afterNode);
  } else {
    parent.textContent = "";
    startMark && parent.appendChild(startMark);
    parent.appendChild(beforeNode);
    parent.appendChild(afterNode);
  }
  onClear && onClear();
}

// This is almost straightforward implementation of reconcillation algorithm
// based on ivi documentation:
// https://github.com/localvoid/ivi/blob/2c81ead934b9128e092cc2a5ef2d3cabc73cb5dd/packages/ivi/src/vdom/implementation.ts#L1366
// With some fast paths from Surplus implementation:
// https://github.com/adamhaile/surplus/blob/master/src/runtime/content.ts#L86
// And working with data directly from Stage0:
// https://github.com/Freak613/stage0/blob/master/reconcile.js
// This implementation is tailored for fine grained change detection and adds support for fragments
export function reconcile(a, b, beforeNode, afterNode, createFn, onClear, onRemove) {
  // When parent was a DocumentFragment, then items got appended to the DOM.
  const parent = afterNode.parentNode;

  let bLen = b.length;
  let i;

  if (bLen === 0) {
    clearList(parent, beforeNode, afterNode, onClear);
    return [];
  }

  // Fast path for create
  if (a.length === 0) {
    for (i = 0; i < bLen; i++) {
      createFn(parent, b[i], i, b, afterNode);
    }
    return b.slice();
  }

  let aStart = 0;
  let bStart = 0;
  let aEnd = a.length - 1;
  let bEnd = bLen - 1;
  let tmp;
  let aStartNode = beforeNode.nextSibling;
  let aEndNode = afterNode.previousSibling;
  let bAfterNode = afterNode;
  let mark;

  // Skip prefix
  while (aStart <= aEnd && bStart <= bEnd && a[aStart] === b[bStart]) {
    aStartNode = step(aStartNode, FORWARD);
    aStart++;
    bStart++;
  }

  // Skip suffix
  while (aStart <= aEnd && bStart <= bEnd && a[aEnd] === b[bEnd]) {
    bAfterNode = step(aEndNode, BACKWARD, true);
    aEndNode = bAfterNode.previousSibling;
    aEnd--;
    bEnd--;
  }

  // Fast path for shrink
  if (bEnd < bStart) {
    while (aStart <= aEnd--) {
      tmp = step(aEndNode, BACKWARD, true);
      mark = tmp.previousSibling;
      api.rm(parent, tmp, aEndNode.nextSibling);
      onRemove && onRemove(tmp);
      aEndNode = mark;
    }
    return b.slice();
  }

  // Fast path for add
  if (aEnd < aStart) {
    while (bStart <= bEnd) {
      createFn(parent, b[bStart++], bStart, b, bAfterNode);
    }
    return b.slice();
  }

  // Positions for reusing nodes from current DOM state
  const P = new Array(bEnd + 1 - bStart);
  // Index to resolve position from current to new
  const I = new Map();
  for (i = bStart; i <= bEnd; i++) {
    P[i] = -1;
    I.set(b[i], i);
  }

  let reuseCount = 0;
  let toRemove = [];
  for (i = aStart; i <= aEnd; i++) {
    // I maps b's items to their indices; when a reused item lands at index 0
    // (the typical case after no prefix matches), the lookup returns 0 which
    // is falsy. Compare to undefined so the index-0 case is treated as a hit.
    const bIdx = I.get(a[i]);
    if (bIdx === undefined) {
      toRemove.push(i);
    } else {
      P[bIdx] = i;
      reuseCount++;
    }
  }

  // Fast path for full replace
  if (reuseCount === 0) {
    return reconcile(
      reconcile(a, [], beforeNode, afterNode, createFn, onClear),
      b,
      beforeNode,
      afterNode,
      createFn,
    );
  }

  // Collect nodes to work with them
  const nodes = [];
  tmp = aStartNode;
  for (i = aStart; i <= aEnd; i++) {
    nodes[i] = tmp;
    tmp = step(tmp, FORWARD);
  }

  for (i = 0; i < toRemove.length; i++) {
    let index = toRemove[i];
    tmp = nodes[index];
    api.rm(parent, tmp, step(tmp, FORWARD));
    onRemove && onRemove(tmp);
  }

  const longestSeq = longestPositiveIncreasingSubsequence(P, bStart);
  let seqIdx = longestSeq.length - 1;

  for (i = bEnd; i >= bStart; i--) {
    if (longestSeq[seqIdx] === i) {
      bAfterNode = nodes[P[longestSeq[seqIdx]]];
      seqIdx--;
    } else {
      if (P[i] === -1) {
        tmp = createFn(parent, b[i], i, b, bAfterNode);
      } else {
        tmp = nodes[P[i]];
        insertNodes(parent, tmp, step(tmp, FORWARD), bAfterNode);
      }
      bAfterNode = tmp;
    }
  }

  return b.slice();
}

let groupCounter = 0;

function add(parent, value, endMark) {
  let mark;

  if (typeof value === "string") {
    value = document.createTextNode(value);
  } else if (!(value instanceof Node)) {
    // Passing an empty array creates a DocumentFragment.
    value = api.h([], value);
  }

  if (value.nodeType === FRAGMENT_NODE && (mark = value.firstChild) && mark !== value.lastChild) {
    mark[GROUPING] = value.lastChild[GROUPING] = ++groupCounter;
  }

  // If endMark is `null`, value will be added to the end of the list.
  parent.insertBefore(value, endMark);

  // Explicit undefined to store if frag.firstChild is null.
  return mark || value;
}

function step(node, direction, inner) {
  const key = node[GROUPING];
  if (key) {
    node = node[direction];
    while (node && node[GROUPING] !== key) {
      node = node[direction];
    }
  }
  return inner ? node : node[direction];
}

function insertNodes(parent, node, end, target) {
  let tmp;
  while (node !== end) {
    tmp = node.nextSibling;
    parent.insertBefore(node, target);
    node = tmp;
  }
}

// Picked from
// https://github.com/adamhaile/surplus/blob/master/src/runtime/content.ts#L368

// return an array of the indices of ns that comprise the longest increasing subsequence within ns
function longestPositiveIncreasingSubsequence(ns, newStart) {
  let seq = [];
  let is = [];
  let l = -1;
  let pre = new Array(ns.length);

  for (var i = newStart, len = ns.length; i < len; i++) {
    var n = ns[i];
    if (n < 0) continue;
    var j = findGreatestIndexLEQ(seq, n);
    if (j !== -1) pre[i] = is[j];
    if (j === l) {
      l++;
      seq[l] = n;
      is[l] = i;
    } else if (n < seq[j + 1]) {
      seq[j + 1] = n;
      is[j + 1] = i;
    }
  }

  for (i = is[l]; l >= 0; i = pre[i], l--) {
    seq[l] = i;
  }

  return seq;
}

function findGreatestIndexLEQ(seq, n) {
  // invariant: lo is guaranteed to be index of a value <= n, hi to be >
  // therefore, they actually start out of range: (-1, last + 1)
  let lo = -1;
  let hi = seq.length;

  // fast path for simple increasing sequences
  if (hi > 0 && seq[hi - 1] <= n) return hi - 1;

  while (hi - lo > 1) {
    var mid = ((lo + hi) / 2) | 0;
    if (seq[mid] > n) {
      hi = mid;
    } else {
      lo = mid;
    }
  }

  return lo;
}
