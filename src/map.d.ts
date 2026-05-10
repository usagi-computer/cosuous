import { Signal } from "./signal";

export function map<T>(
  items: ((...args: unknown[]) => T[]) | Signal<T[]>,
  expr: (item: T, i: number, items: T[]) => Node,
  cleaning?: boolean,
): DocumentFragment;
