/**
 * Shared string and numeric constants. Centralized so they can be reused
 * across modules and reasoned about in one place; Rollup scope-hoists these
 * away in the bundled build so call sites pay no runtime indirection.
 */

export const SVG_NS = "http://www.w3.org/2000/svg";

// DOM Node.nodeType values used in hot paths.
export const TEXT_NODE = 3;
export const FRAGMENT_NODE = 11;

// Length of the "on" prefix on event-handler prop names (e.g. "onClick").
export const EVENT_PREFIX_LEN = 2;

// Sibling-traversal direction keys used by the list reconciler.
export const FORWARD = "nextSibling";
export const BACKWARD = "previousSibling";

// Marker key used to tag fragment boundaries so siblings of a fragment
// can be located after the fragment's children get hoisted into the parent.
export const GROUPING = "__g";
