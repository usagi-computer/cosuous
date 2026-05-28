/**
 * Shared string and numeric constants. Centralized so they can be reused
 * across modules and reasoned about in one place; Rollup scope-hoists these
 * away in the bundled build so call sites pay no runtime indirection.
 *
 * @module
 */

/** SVG XML namespace, passed to `document.createElementNS` in SVG mode. */
export const SVG_NS = "http://www.w3.org/2000/svg";

/** `Node.nodeType` value for `Text` nodes. */
export const TEXT_NODE = 3;
/** `Node.nodeType` value for `DocumentFragment` nodes. */
export const FRAGMENT_NODE = 11;

/** Length of the `"on"` prefix on event-handler prop names (e.g. `"onClick"`). */
export const EVENT_PREFIX_LEN = 2;

/** Sibling-traversal direction key meaning "forward", used by the list reconciler. */
export const FORWARD = "nextSibling";
/** Sibling-traversal direction key meaning "backward", used by the list reconciler. */
export const BACKWARD = "previousSibling";

/**
 * Marker key used to tag fragment boundaries so siblings of a fragment
 * can be located after the fragment's children get hoisted into the parent.
 */
export const GROUPING = "__g";
