# Cosuous Signal

Cosuous Signal is a tiny reactive library, backed by [alien-signals](https://github.com/stackblitz/alien-signals). It provides the engine driving the reactive DOM operations in Cosuous.

## Features

- **Automatic updates**: When a signal changes, any computation or effect that read the old value will re-run.
- **Glitch-free**: Updates are executed in a way that prevents inconsistent states.
- **Memory efficient**: Built on a high-performance reactive core.

## API

- `signal(value)` -> `Signal<T>`
- `computed(fn)` -> `Computed<T>`
- `effect(fn)` -> `() => void`
- `onCleanup(fn)` -> `typeof fn`
- `untracked(fn)` -> `T`
- `effectScope(fn)` -> `() => void`
- `startBatch()` / `endBatch()` -> `void`
- `isSignal(value)` / `isComputed(value)` -> `boolean`

### `signal(value): Signal<T>`

Creates a new signal. Returns a function that gets the value when called without arguments, and sets the value when called with an argument.

```js
import { signal } from "cosuous/signal";

const count = signal(0);
console.log(count()); // 0
count(1);
console.log(count()); // 1
```

Signals passed as children or attributes in `html`/`h`/`dhtml` are auto-unwrapped: the DOM updates whenever the signal changes, no extra wiring required.

### `computed(fn): Computed<T>`

Creates a read-only signal that automatically updates when its dependencies change.

```js
import { signal, computed } from "cosuous/signal";

const count = signal(1);
const double = computed(() => count() * 2);
console.log(double()); // 2
```

### `effect(fn): () => void`

Runs a function and tracks its dependencies. Re-runs the function whenever a dependency changes. Returns a dispose function.

```js
import { signal, effect } from "cosuous/signal";

const count = signal(0);
const stop = effect(() => console.log(count()));
count(1); // logs 1
stop();
```

### `onCleanup(fn): typeof fn`

Registers a cleanup function that runs when the surrounding effect re-runs or is disposed.

```js
import { effect, onCleanup } from "cosuous/signal";

effect(() => {
  const timer = setInterval(() => {}, 1000);
  onCleanup(() => clearInterval(timer));
});
```

### `untracked(fn): T`

Runs a function without tracking any signals read during its execution. Returns the function's return value. `onCleanup` calls inside `fn` still register against the surrounding scope.

```js
import { signal, effect, untracked } from "cosuous/signal";

const a = signal(0);
const b = signal(0);

effect(() => {
  // Re-runs when `a` changes, but not when `b` changes.
  console.log(a(), untracked(() => b()));
});
```

### `effectScope(fn): () => void`

Groups child effects for batched disposal. Returns a dispose function that tears down every effect created inside `fn`. The caller owns the lifetime: re-running a surrounding effect will not dispose a scope created inside it.

```js
import { effect, effectScope } from "cosuous/signal";

const stop = effectScope(() => {
  effect(() => {/* ... */});
  effect(() => {/* ... */});
});

stop(); // disposes both inner effects at once
```

### `startBatch()` / `endBatch()`: `void`

Batches multiple signal updates so dependent effects re-run once at the end instead of after every set. Always pair them; nesting is safe.

```js
import { signal, effect, startBatch, endBatch } from "cosuous/signal";

const x = signal(0);
const y = signal(0);
effect(() => console.log(x() + y()));

startBatch();
x(1);
y(2);
endBatch(); // logs 3 once, not twice
```

### `isSignal(value)` / `isComputed(value)`: `boolean`

Type-checks an arbitrary value. Returns `true` for signals/computed signals created by this module.

## Migrating from `observable`

| Old (`cosuous/observable`)     | New (`cosuous/signal`)                | Notes                                                                 |
| ------------------------------ | ------------------------------------- | --------------------------------------------------------------------- |
| `observable(value)`            | `signal(value)`                       | Same get/set callable shape.                                          |
| `computed(fn)`                 | `computed(fn)`                        | Unchanged.                                                            |
| `subscribe(fn)`                | `effect(fn)`                          | Returns a dispose function.                                           |
| `unsubscribe(observer)`        | call the dispose returned by `effect` | No standalone unsubscribe; capture and call it.                       |
| `sample(fn)`                   | `untracked(fn)`                       | `untracked` still allows `onCleanup` registration; `sample` did not.  |
| `cleanup(fn)`                  | `onCleanup(fn)`                       | Same semantics.                                                       |
| `transaction(fn)`              | `startBatch()` / `endBatch()`         | No `batch(fn)` shorthand; bracket the updates manually.               |
| `root(fn)`                     | `effectScope(fn)`                     | Returns a dispose function that tears down child effects.             |
| `on(obs, fn, seed, onchanges)` | `effect` + `untracked`                | Read tracked deps directly, wrap untracked reads in `untracked(...)`. |
| `isListening()`                | (no equivalent)                       | Not exposed by alien-signals.                                         |
