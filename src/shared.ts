import type { Signal } from "./signal.ts";

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

export type ElementChildren = ElementChild[] | ElementChild;

export interface FunctionComponent {
  (props: object, ...children: ElementChildren[]): Node;
  (...children: ElementChildren[]): Node;
}
