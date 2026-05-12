export interface Signal<T> {
  (): T;
  (nextValue: T): void;
}
export interface Computed<T> {
  (): T;
}

export function signal<T>(): Signal<T | undefined>;
export function signal<T>(initialValue: T): Signal<T>;
export function computed<T>(getter: (previousValue?: T) => T): Computed<T>;

export function effect(fn: () => void | (() => void)): () => void;
export function effectScope(fn: () => void): () => void;
export function untracked<T>(fn: () => T): T;
export function batch<T>(fn: () => T): T;

export function startBatch(): void;
export function endBatch(): void;
export function trigger(fn: () => void): void;

export function isSignal(value: unknown): boolean;
export function isComputed(value: unknown): boolean;
export function setActiveSub(sub?: unknown): unknown;
