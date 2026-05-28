import type { Signal } from "./signal.ts";

/**
 * Any value `h`'s child slot accepts: a DOM node, a function (component
 * or reactive child), a {@link Signal}, an object (props), a primitive
 * coerced to text, or nullish to skip.
 */
export type ElementChild =
  | Node
  | Function
  | Signal<unknown>
  | object
  | string
  | number
  | boolean
  | null
  | undefined;

/** One {@link ElementChild} or an array of them - the variadic child shape. */
export type ElementChildren = ElementChild[] | ElementChild;

/**
 * Callable shape of a cosuous component. Two overloads: with explicit
 * props as the first argument, or with children only (no props).
 */
export interface FunctionComponent {
  /** Render with a props object and variadic children. */
  (props: object, ...children: ElementChildren[]): Node;
  /** Render with children only - no props. */
  (...children: ElementChildren[]): Node;
}
