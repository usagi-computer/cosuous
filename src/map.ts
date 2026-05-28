/* Adapted from Stage0 - The MIT License - Pavel Martynov */
/* Adapted from DOM Expressions - The MIT License - Ryan Carniato */
import { api } from "./index.ts";
import { effect, effectScope, onCleanup, untracked } from "./signal.ts";
import type { Signal } from "./signal.ts";
import { BACKWARD, FORWARD, FRAGMENT_NODE, GROUPING } from "./constants.ts";

// Re-exported for backward compatibility with any consumer importing these
// names from "cosuous/map" directly.
export { BACKWARD, FORWARD, GROUPING };

type CreateFn<T> = (parent: Node, item: T, i: number, data: T[], afterNode: Node | null) => Node;

type ItemsFn<T> = (() => T[]) | Signal<T[]>;
type ExprFn<T> = ((item: T, i: number, items: T[]) => Node) & { $t?: boolean };

/**
 * Map over a list of items that create DOM nodes.
 */
export function map<T>(items: ItemsFn<T>, expr: ExprFn<T>, cleaning?: boolean): DocumentFragment {
  // Disable cleaning for templates by default.
  if (cleaning == null) cleaning = !expr.$t;

  const parent = document.createDocumentFragment();
  const beforeNode = add(parent, "");
  const afterNode = add(parent, "");
  const disposers = new Map<Node, () => void>();

  let prev: T[] = [];
  const unsubscribe = effect(() => {
    const b = (items as () => T[])();
    prev = untracked(() =>
      reconcile(
        prev,
        b || [],
        beforeNode,
        afterNode,
        createFn,
        cleaning ? disposeAll : undefined,
        cleaning ? dispose : undefined,
      ),
    );
  });

  onCleanup(unsubscribe);
  onCleanup(disposeAll);

  function disposeAll(): void {
    disposers.forEach((d) => d());
    disposers.clear();
  }

  function dispose(node: Node): void {
    const disposer = disposers.get(node);
    if (disposer) disposer();
    disposers.delete(node);
  }

  function createFn(parent: Node, item: T, i: number, data: T[], afterNode: Node | null): Node {
    // The scope call makes it possible for the child's effects to outlive
    // their parent's update cycle and be disposed individually.
    if (!cleaning) return add(parent, expr(item, i, data), afterNode);
    let node!: Node;
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
function clearList(
  parent: Node,
  beforeNode: Node,
  afterNode: Node,
  onClear: (() => void) | undefined,
): void {
  const startMark = beforeNode.previousSibling;
  if ((startMark && startMark.previousSibling) || afterNode.nextSibling) {
    if (beforeNode.nextSibling) api.rm(parent, beforeNode.nextSibling, afterNode);
  } else {
    parent.textContent = "";
    if (startMark) parent.appendChild(startMark);
    parent.appendChild(beforeNode);
    parent.appendChild(afterNode);
  }
  if (onClear) onClear();
}

// This is almost straightforward implementation of reconcillation algorithm
// based on ivi documentation:
// https://github.com/localvoid/ivi/blob/2c81ead934b9128e092cc2a5ef2d3cabc73cb5dd/packages/ivi/src/vdom/implementation.ts#L1366
// With some fast paths from Surplus implementation:
// https://github.com/adamhaile/surplus/blob/master/src/runtime/content.ts#L86
// And working with data directly from Stage0:
// https://github.com/Freak613/stage0/blob/master/reconcile.js
// This implementation is tailored for fine grained change detection and adds support for fragments
export function reconcile<T>(
  a: T[],
  b: T[],
  beforeNode: Node,
  afterNode: Node,
  createFn: CreateFn<T>,
  onClear?: () => void,
  onRemove?: (node: Node) => void,
): T[] {
  // When parent was a DocumentFragment, then items got appended to the DOM.
  const parent = afterNode.parentNode!;

  const bLen = b.length;
  let i: number;

  if (bLen === 0) {
    clearList(parent, beforeNode, afterNode, onClear);
    return [];
  }

  // Fast path for create
  if (a.length === 0) {
    for (i = 0; i < bLen; i++) {
      createFn(parent, b[i]!, i, b, afterNode);
    }
    return b.slice();
  }

  let aStart = 0;
  let bStart = 0;
  let aEnd = a.length - 1;
  let bEnd = bLen - 1;
  let tmp: Node;
  let aStartNode: Node | null = beforeNode.nextSibling;
  let aEndNode: Node | null = afterNode.previousSibling;
  let bAfterNode: Node | null = afterNode;
  let mark: Node | null;

  // Skip prefix
  while (aStart <= aEnd && bStart <= bEnd && a[aStart] === b[bStart]) {
    aStartNode = step(aStartNode!, FORWARD);
    aStart++;
    bStart++;
  }

  // Skip suffix
  while (aStart <= aEnd && bStart <= bEnd && a[aEnd] === b[bEnd]) {
    bAfterNode = step(aEndNode!, BACKWARD, true);
    aEndNode = bAfterNode!.previousSibling;
    aEnd--;
    bEnd--;
  }

  // Fast path for shrink
  if (bEnd < bStart) {
    while (aStart <= aEnd--) {
      tmp = step(aEndNode!, BACKWARD, true)!;
      mark = tmp.previousSibling;
      api.rm(parent, tmp, aEndNode!.nextSibling!);
      if (onRemove) onRemove(tmp);
      aEndNode = mark;
    }
    return b.slice();
  }

  // Fast path for add
  if (aEnd < aStart) {
    while (bStart <= bEnd) {
      createFn(parent, b[bStart++]!, bStart, b, bAfterNode);
    }
    return b.slice();
  }

  // Positions for reusing nodes from current DOM state
  const P = new Array<number>(bEnd + 1 - bStart);
  // Index to resolve position from current to new
  const I = new Map<T, number>();
  for (i = bStart; i <= bEnd; i++) {
    P[i] = -1;
    I.set(b[i]!, i);
  }

  let reuseCount = 0;
  const toRemove: number[] = [];
  for (i = aStart; i <= aEnd; i++) {
    // I maps b's items to their indices; when a reused item lands at index 0
    // (the typical case after no prefix matches), the lookup returns 0 which
    // is falsy. Compare to undefined so the index-0 case is treated as a hit.
    const bIdx = I.get(a[i]!);
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
  const nodes: Node[] = [];
  let cursor: Node | null = aStartNode;
  for (i = aStart; i <= aEnd; i++) {
    nodes[i] = cursor!;
    cursor = step(cursor!, FORWARD);
  }

  for (i = 0; i < toRemove.length; i++) {
    const index = toRemove[i]!;
    tmp = nodes[index]!;
    api.rm(parent, tmp, step(tmp, FORWARD)!);
    if (onRemove) onRemove(tmp);
  }

  const longestSeq = longestPositiveIncreasingSubsequence(P, bStart);
  let seqIdx = longestSeq.length - 1;

  for (i = bEnd; i >= bStart; i--) {
    if (longestSeq[seqIdx] === i) {
      bAfterNode = nodes[P[longestSeq[seqIdx]!]!]!;
      seqIdx--;
    } else {
      if (P[i] === -1) {
        tmp = createFn(parent, b[i]!, i, b, bAfterNode);
      } else {
        tmp = nodes[P[i]!]!;
        insertNodes(parent, tmp, step(tmp, FORWARD)!, bAfterNode!);
      }
      bAfterNode = tmp;
    }
  }

  return b.slice();
}

let groupCounter = 0;

function add(parent: Node, value: unknown, endMark?: Node | null): Node {
  let mark: Node | undefined;

  let node: Node;
  if (typeof value === "string") {
    node = document.createTextNode(value);
  } else if (value instanceof Node) {
    node = value;
  } else {
    // Passing an empty array creates a DocumentFragment.
    node = api.h([], value as never);
  }

  if (
    node.nodeType === FRAGMENT_NODE &&
    (mark = node.firstChild ?? undefined) &&
    mark !== node.lastChild
  ) {
    const tagged = mark as unknown as Record<string, unknown>;
    const lastTagged = node.lastChild as unknown as Record<string, unknown>;
    tagged[GROUPING] = lastTagged[GROUPING] = ++groupCounter;
  }

  // If endMark is `null`, value will be added to the end of the list.
  parent.insertBefore(node, endMark ?? null);

  // Explicit undefined to store if frag.firstChild is null.
  return mark || node;
}

function step(
  node: Node,
  direction: "nextSibling" | "previousSibling",
  inner?: boolean,
): Node | null {
  const tagged = node as Node & Record<string, unknown>;
  const key = tagged[GROUPING];
  let cur: Node | null = node;
  if (key) {
    cur = cur[direction];
    while (cur && (cur as unknown as Record<string, unknown>)[GROUPING] !== key) {
      cur = cur[direction];
    }
  }
  return inner ? cur : cur ? cur[direction] : null;
}

function insertNodes(parent: Node, node: Node, end: Node, target: Node): void {
  let cur: Node | null = node;
  let tmp: Node | null;
  while (cur !== end) {
    tmp = cur!.nextSibling;
    parent.insertBefore(cur!, target);
    cur = tmp;
  }
}

// Picked from
// https://github.com/adamhaile/surplus/blob/master/src/runtime/content.ts#L368

// return an array of the indices of ns that comprise the longest increasing subsequence within ns
function longestPositiveIncreasingSubsequence(ns: number[], newStart: number): number[] {
  const seq: number[] = [];
  const is: number[] = [];
  let l = -1;
  const pre = new Array<number>(ns.length);

  for (let i = newStart, len = ns.length; i < len; i++) {
    const n = ns[i]!;
    if (n < 0) continue;
    const j = findGreatestIndexLEQ(seq, n);
    if (j !== -1) pre[i] = is[j]!;
    if (j === l) {
      l++;
      seq[l] = n;
      is[l] = i;
    } else if (n < seq[j + 1]!) {
      seq[j + 1] = n;
      is[j + 1] = i;
    }
  }

  for (let i = is[l]!; l >= 0; i = pre[i]!, l--) {
    seq[l] = i;
  }

  return seq;
}

function findGreatestIndexLEQ(seq: number[], n: number): number {
  // invariant: lo is guaranteed to be index of a value <= n, hi to be >
  // therefore, they actually start out of range: (-1, last + 1)
  let lo = -1;
  let hi = seq.length;

  // fast path for simple increasing sequences
  if (hi > 0 && seq[hi - 1]! <= n) return hi - 1;

  while (hi - lo > 1) {
    const mid = ((lo + hi) / 2) | 0;
    if (seq[mid]! > n) {
      hi = mid;
    } else {
      lo = mid;
    }
  }

  return lo;
}
