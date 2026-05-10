import { Signal } from "./observable";

type ElementChild =
  | Node
  | Function
  | Signal<unknown>
  | object
  | string
  | number
  | boolean
  | null
  | undefined;
type ElementChildren = ElementChild[] | ElementChild;

export interface FunctionComponent {
  (props: object, ...children: ElementChildren[]): Node;
  (...children: ElementChildren[]): Node;
}
